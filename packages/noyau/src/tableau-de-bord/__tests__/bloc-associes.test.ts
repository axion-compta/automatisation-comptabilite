import { describe, expect, it } from 'vitest';
import type { Periode } from '../../interface/types.js';
import { blocAssocies, type AssocieEntree } from '../bloc-associes.js';

const P: Periode = { debut: '2026-01-01', fin: '2026-12-31' };
const lien = (id: string) => ({ type: 'ecriture' as const, id });
const alice: AssocieEntree = {
  id: 'a1',
  nom: 'Alice Fictive',
  lignes: [
    { id: 'l1', montant: 100000, lien: lien('e1') },
    { id: 'l2', montant: -30000, lien: lien('e2') },
  ],
};
const bruno: AssocieEntree = {
  id: 'a2',
  nom: 'Bruno Inventé',
  lignes: [{ id: 'l3', montant: -20000 }],
};

describe('bloc comptes courants d associés', () => {
  it('sas-deux-associes-deux-soldes', () => {
    const b = blocAssocies(P, [alice, bruno]);
    expect(b.code).toBe('comptes_associes');
    expect(b.etat).toBe('ok');
    expect(b.donnees?.associes).toHaveLength(2);
    expect(b.donnees?.associes[0]).toMatchObject({ id: 'a1', solde: 70000, debiteur: false });
    expect(b.donnees?.associes[1]).toMatchObject({ id: 'a2', solde: -20000, debiteur: true, nonExplique: -20000 });
    expect(b.donnees?.associes[1]?.gesteRequis).toBe('G07');
  });

  it('ei-bloc-etat-vide-sans-montant', () => {
    const b = blocAssocies(P, []);
    expect(b.etat).toBe('vide');
    expect(b.mot).toBe('vide_comptes_associes');
    expect('donnees' in b).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/solde/);
  });

  it('solde-egal-somme-des-mouvements', () => {
    const b = blocAssocies(P, [alice, bruno]);
    for (const a of b.donnees?.associes ?? []) {
      expect(a.solde).toBe(a.mouvements.reduce((s, m) => s + m.montant, 0));
    }
    expect(b.donnees?.associes[0]?.mouvements.map((m) => m.id)).toEqual(['l1', 'l2']);
    // un associé sans mouvement a un solde de 0, pas d'état vide
    const c = blocAssocies(P, [{ id: 'a3', nom: 'Chloé Imaginaire', lignes: [] }]);
    expect(c.etat).toBe('ok');
    expect(c.donnees?.associes[0]?.solde).toBe(0);
  });

  it('erreur-de-ligne-donne-impossible', () => {
    const b = blocAssocies(P, [{ id: 'a4', nom: 'Dora Fictive', lignes: [{ id: 'x', montant: 1.5 }] }]);
    expect(b.etat).toBe('impossible');
    expect('donnees' in b).toBe(false);
  });
});
