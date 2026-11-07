import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../ecritures/modele.js';
import { balance, grandLivre, journal } from '../balance.js';

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Libellé fictif', debit: centimes(debit), credit: centimes(credit) };
}
function ecr(
  id: string,
  numero: string,
  date: string,
  statut: StatutEcriture,
  lignes: LigneEcriture[],
  extra: Partial<Ecriture> = {},
): Ecriture {
  return { id, numero, date, journal: 'AC', statut, lignes, ...extra };
}

const achat = (id: string, numero: string, date: string, statut: StatutEcriture = 'valide'): Ecriture =>
  ecr(id, numero, date, statut, [ligne('607', 10000, 0), ligne('4456', 2000, 0), ligne('401', 0, 12000)]);

describe('balance et grand livre', () => {
  it('brouillon-exclu', () => {
    const liste = [
      achat('a', 'AC-1', '2026-01-10'),
      achat('b', 'AC-2', '2026-01-11', 'brouillon'),
      achat('c', 'AC-3', '2026-01-12', 'propose'),
    ];
    const b = balance(liste);
    expect(b.totaux.debit).toBe(12000);
    expect(b.lignes.find((l) => l.compte === '607')?.totalDebit).toBe(10000);
    expect(grandLivre(liste, '607')).toHaveLength(1);
    expect(journal(liste, 'AC').map((e) => e.id)).toEqual(['a']);
    expect(balance([achat('b', 'AC-2', '2026-01-11', 'brouillon')])).toEqual({
      lignes: [],
      totaux: { debit: 0, credit: 0 },
    });
  });

  it('totaux-equilibres', () => {
    const b = balance([achat('a', 'AC-1', '2026-01-10'), achat('b', 'AC-2', '2026-02-10')]);
    expect(b.totaux.debit).toBe(24000);
    expect(b.totaux.credit).toBe(24000);
    expect(b.lignes.reduce((s, l) => s + l.solde, 0)).toBe(0);
  });

  it('solde-par-compte', () => {
    const b = balance([
      achat('a', 'AC-1', '2026-01-10'),
      ecr('v', 'VT-1', '2026-01-20', 'valide', [ligne('411', 6000, 0), ligne('607', 0, 1500), ligne('706', 0, 4500)]),
    ]);
    expect(b.lignes.map((l) => l.compte)).toEqual(['401', '411', '4456', '607', '706']);
    const par = Object.fromEntries(b.lignes.map((l) => [l.compte, l]));
    expect(par['607']).toEqual({ compte: '607', totalDebit: 10000, totalCredit: 1500, solde: 8500 });
    expect(par['401']).toEqual({ compte: '401', totalDebit: 0, totalCredit: 12000, solde: -12000 });
    expect(par['706']?.solde).toBe(-4500);
  });

  it('cumul-final-egal-solde', () => {
    const liste = [
      achat('a', 'AC-1', '2026-01-10'),
      achat('b', 'AC-2', '2026-03-10'),
      ecr('v', 'VT-1', '2026-02-01', 'valide', [ligne('401', 5000, 0), ligne('512', 0, 5000)]),
    ];
    const b = balance(liste);
    expect(b.lignes.length).toBeGreaterThan(3);
    for (const l of b.lignes) {
      const gl = grandLivre(liste, l.compte);
      expect(gl[gl.length - 1]?.cumul).toBe(l.solde);
    }
    expect(grandLivre(liste, '999')).toEqual([]);
  });

  it('contre-passation-annule', () => {
    const origine = achat('o', 'AC-1', '2026-01-10');
    const o2 = { ...origine, contrePassee: true };
    const contre = ecr(
      'k',
      'AC-2',
      '2026-01-15',
      'valide',
      [ligne('607', 0, 10000), ligne('4456', 0, 2000), ligne('401', 12000, 0)],
      { type: 'correction', lienOriginale: 'o' },
    );
    const b = balance([o2, contre]);
    expect(b.lignes).toHaveLength(3);
    for (const l of b.lignes) expect(l.solde).toBe(0);
    expect(b.totaux.debit).toBe(24000);
    const gl = grandLivre([o2, contre], '607');
    expect(gl.map((x) => x.cumul)).toEqual([10000, 0]);
  });

  it('tri-par-date-puis-numero', () => {
    const liste = [
      achat('c', 'AC-3', '2026-02-01'),
      achat('b', 'AC-2', '2026-01-10'),
      achat('a', 'AC-1', '2026-01-10'),
      achat('d', 'AC-0', '2026-03-01'),
    ];
    const gl = grandLivre(liste, '607');
    expect(gl.map((x) => x.numero)).toEqual(['AC-1', 'AC-2', 'AC-3', 'AC-0']);
    expect(gl.map((x) => x.cumul)).toEqual([10000, 20000, 30000, 40000]);
    expect(journal(liste, 'AC').map((e) => e.numero)).toEqual(['AC-0', 'AC-1', 'AC-2', 'AC-3']);
    expect(journal(liste, 'VT')).toEqual([]);
  });
});
