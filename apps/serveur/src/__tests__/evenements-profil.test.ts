import { describe, expect, it } from 'vitest';
import { creerBoiteEnvoiMemoire, creerFauxPublieur } from '../../../../packages/noyau/src/evenements/memoire.js';
import { relayer } from '../../../../packages/noyau/src/evenements/publication.js';
import {
  ecrireEtPublier, evenementChampModifie, evenementEtatChange, evenementParametreActive, evenementRegimeImpositionChange, evenementRegimeTvaChange,
  type ContexteEvenement,
} from '../evenements/profil.js';

const ctx = (cle = 'cle-1'): ContexteEvenement => ({
  societeId: 'soc-lemoine', acteur: { type: 'personne', id: 'personne-fictive-1' }, canal: 'systeme', correlationId: 'corr-1', cleIdempotence: cle, horodatage: '2026-11-12T08:00:00Z',
});
const monter = () => {
  const b = creerBoiteEnvoiMemoire();
  const faux = creerFauxPublieur();
  return { b, faux, vider: () => relayer(b, faux.publieur, 50) };
};

describe('événements du profil', () => {
  it('champ-modifie-publie', async () => {
    const { b, faux, vider } = monter();
    await ecrireEtPublier(b, async () => 7, (v) => [evenementChampModifie(ctx(), { cle: 'forme_juridique', version: v })]);
    await vider();
    expect(faux.recus).toHaveLength(1);
    const e = faux.recus[0]!;
    expect(e.type).toBe('compta.profil.champ_modifie');
    expect([e.societe_id, e.version, e.horodatage]).toEqual(['soc-lemoine', 7, '2026-11-12T08:00:00Z']);
    expect(e.charge).toEqual({ cle: 'forme_juridique' });
  });

  it('etat-change-seulement-si-change', async () => {
    const { b, faux, vider } = monter();
    await ecrireEtPublier(b, async () => 2, (v) => [evenementEtatChange(ctx('a'), { avant: 'incomplet', apres: 'incomplet', version: v })]);
    await ecrireEtPublier(b, async () => 3, (v) => [evenementEtatChange(ctx('b'), { avant: 'incomplet', apres: 'complet', version: v })]);
    await vider();
    expect(faux.recus.map((e) => e.type)).toEqual(['compta.profil.etat_change']);
    expect(faux.recus[0]!.charge).toEqual({ statut: 'complet', statut_precedent: 'incomplet' });
    expect(faux.recus[0]!.version).toBe(3);
  });

  it('regime-tva-change', async () => {
    const { b, faux, vider } = monter();
    await ecrireEtPublier(b, async () => 4, (v) => [
      evenementRegimeTvaChange(ctx(), { statut: 'reel_normal', version: v }),
      evenementRegimeImpositionChange(ctx(), { statut: 'is', version: v }),
    ]);
    await vider();
    expect(faux.recus.map((e) => e.type)).toEqual(['compta.regime_tva.change', 'compta.regime_imposition.change']);
    expect(faux.recus.map((e) => e.charge)).toEqual([{ cle: 'regime_tva', statut: 'reel_normal' }, { cle: 'regime_imposition', statut: 'is' }]);
  });

  it('parametre-active', async () => {
    const { b, faux, vider } = monter();
    await ecrireEtPublier(b, async () => 5, (v) => [evenementParametreActive(ctx(), { cle: 'tva_sur_les_debits', version: v })]);
    await vider();
    expect(faux.recus).toHaveLength(1);
    expect(faux.recus[0]!.type).toBe('compta.parametre.active');
    expect(faux.recus[0]!.objet_id).toBe('tva_sur_les_debits');
    expect(faux.recus[0]!.charge).toEqual({ cle: 'tva_sur_les_debits', statut: 'active' });
  });

  it('rejeu-idempotent-une-seule-publication', async () => {
    const { b, faux, vider } = monter();
    for (let i = 0; i < 3; i += 1) await ecrireEtPublier(b, async () => 7, (v) => [evenementChampModifie(ctx('meme-cle'), { cle: 'forme_juridique', version: v })]);
    await vider();
    expect(faux.recus).toHaveLength(1);
  });

  it('echec-d-enregistrement-rien-publie', async () => {
    const { b, faux, vider } = monter();
    await expect(
      ecrireEtPublier(b, async (tx) => {
        tx.boite.deposer(evenementChampModifie(ctx('x'), { cle: 'forme_juridique', version: 1 }));
        throw new Error('echec fictif');
      }, () => []),
    ).rejects.toThrow('echec fictif');
    await vider();
    expect(faux.recus).toHaveLength(0);
    expect(await b.enAttente(10)).toHaveLength(0);
  });
});
