import { describe, expect, it } from 'vitest';
import { verifierChaine } from '../../../../packages/noyau/src/journal/verifier.js';
import { DepotMemoire, ErreurAudit, ServiceAudit } from '../securite/service-audit.js';

const SOCIETE = 'soc-1';
const brouillon = (n: number) => ({
  societeId: SOCIETE, horodatage: '2026-01-05T10:00:00Z', acteur: 'camille.durand', canal: 'clic' as const,
  evenement: 'piece.ajoutee', motif: `essai ${n}`,
});
const neuf = () => ({ depot: new DepotMemoire(), service: new ServiceAudit(() => '2026-01-01T00:00:00Z') });

describe('ServiceAudit', () => {
  it('transaction-annulee-zero-entree (T-JRN-2)', async () => {
    const { depot, service } = neuf();
    await expect(
      depot.transaction(SOCIETE, async (tx) => {
        await service.ecrire(tx, brouillon(1));
        throw new Error('changement refusé');
      }),
    ).rejects.toThrow('changement refusé');
    expect(depot.lire(SOCIETE)).toEqual([]);
    expect(depot.tete(SOCIETE)).toBeUndefined();
    await depot.transaction(SOCIETE, (tx) => service.ecrire(tx, brouillon(2)));
    expect(depot.lire(SOCIETE).map((e) => e.sequence)).toEqual([1]);
  });

  it('cinquante-concurrentes-sans-trou (T-JRN-3)', async () => {
    const { depot, service } = neuf();
    const total = 50;
    await Promise.all(
      Array.from({ length: total }, (_, i) =>
        depot.transaction(SOCIETE, async (tx) => {
          await Promise.resolve();
          return service.ecrire(tx, brouillon(i));
        }),
      ),
    );
    const entrees = depot.lire(SOCIETE);
    expect(entrees.map((e) => e.sequence)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    entrees.forEach((e, i) => {
      if (i > 0) expect(e.empreintePrecedente).toBe(entrees[i - 1]!.empreinte);
    });
    expect(depot.tete(SOCIETE)?.sequence).toBe(total);
    expect(verifierChaine(entrees, { societeId: SOCIETE, creeLe: '2026-01-01T00:00:00Z' }).ok).toBe(true);
  });

  it('une annulation au milieu des concurrentes ne crée aucun trou', async () => {
    const { depot, service } = neuf();
    const travaux = Array.from({ length: 10 }, (_, i) =>
      depot.transaction(SOCIETE, async (tx) => {
        await service.ecrire(tx, brouillon(i));
        if (i % 3 === 0) throw new Error('annulée');
      }),
    );
    await Promise.allSettled(travaux);
    expect(depot.lire(SOCIETE).map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('update-delete-refuses (T-JRN-4)', async () => {
    const { depot, service } = neuf();
    await depot.transaction(SOCIETE, (tx) => service.ecrire(tx, brouillon(1)));
    expect(() => depot.modifier()).toThrow(ErreurAudit);
    expect(() => depot.supprimer()).toThrow(expect.objectContaining({ code: 'ajout_seul' }));
    expect(depot.lire(SOCIETE)).toHaveLength(1);
  });

  it('refuse une entrée d’une autre société dans la transaction', async () => {
    const { depot, service } = neuf();
    await expect(
      depot.transaction(SOCIETE, (tx) => service.ecrire(tx, { ...brouillon(1), societeId: 'soc-2' })),
    ).rejects.toMatchObject({ code: 'societe_differente' });
    expect(depot.lire('soc-2')).toEqual([]);
  });

  it('une entrée invalide est refusée sans rien écrire', async () => {
    const { depot, service } = neuf();
    await expect(
      depot.transaction(SOCIETE, (tx) => service.ecrire(tx, { ...brouillon(1), acteur: '' })),
    ).rejects.toMatchObject({ code: 'acteur_absent' });
    expect(depot.lire(SOCIETE)).toEqual([]);
  });
});
