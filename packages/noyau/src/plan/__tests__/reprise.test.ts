import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ErreurReprise, reconstruireANouveaux, reconstruirePlan } from '../reprise.js';

type Ligne = { valeurs: { compteNum: string; compteLib: string } };
const ligne = (compteNum: string, compteLib: string): Ligne => ({ valeurs: { compteNum, compteLib } });
const numeroBanc = (i: number): string => `${1 + (i % 7)}0${String(i).padStart(3, '0')}`;
const DIVERGENTS = [10, 20, 30];

/** Banc fictif : 120 comptes, deux lignes au libellé courant ; trois comptes ont en plus un autre libellé. */
function banc(): Ligne[] {
  const lignes: Ligne[] = [];
  for (let i = 0; i < 120; i += 1) {
    lignes.push(ligne(numeroBanc(i), `Compte fictif ${i}`), ligne(numeroBanc(i), `Compte fictif ${i}`));
    if (DIVERGENTS.includes(i)) lignes.push(ligne(numeroBanc(i), `Ancien libellé ${i}`));
  }
  return lignes;
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErreurReprise ? e.code : 'autre';
  }
  return undefined;
}

describe('reprise', () => {
  it('banc-120-comptes-reconstruits', () => {
    const r = reconstruirePlan(banc());
    expect(r.comptes).toHaveLength(120);
    expect(r.douteux).toEqual([]);
    expect(r.comptes.map((c) => c.numero)).toEqual([...new Set(r.comptes.map((c) => c.numero))].sort());
    const c10 = r.comptes.find((c) => c.numero === numeroBanc(10));
    expect(c10?.libelle).toBe('Compte fictif 10');
    expect(c10?.occurrences).toBe(3);
    expect(r.comptes.find((c) => c.numero === numeroBanc(11))?.occurrences).toBe(2);
  });

  it('trois-libelles-divergents-signales', () => {
    const r = reconstruirePlan(banc());
    const divergents = r.comptes.filter((c) => c.libellesDivergents.length > 0);
    expect(divergents.map((c) => c.numero)).toEqual(DIVERGENTS.map(numeroBanc).sort());
    for (const i of DIVERGENTS) {
      expect(divergents.find((c) => c.numero === numeroBanc(i))?.libellesDivergents).toEqual([`Ancien libellé ${i}`]);
    }
    const egalite = reconstruirePlan([ligne('401', 'Beta'), ligne('401', 'Alpha'), ligne('401', ' Alpha '), ligne('401', 'Beta')]);
    expect(egalite.comptes[0]).toMatchObject({ libelle: 'Alpha', libellesDivergents: ['Beta'], occurrences: 4 });
    const vides = reconstruirePlan([ligne('401', ''), ligne('401', 'Fournisseurs fictifs')]);
    expect(vides.comptes[0]).toMatchObject({ libelle: 'Fournisseurs fictifs', libellesDivergents: [] });
  });

  it('a-nouveaux-equilibres', () => {
    const r = reconstruireANouveaux(
      [
        { compte: '512', solde: centimes(150000) },
        { compte: '401', solde: centimes(-50000) },
        { compte: '101', solde: centimes(-100000) },
        { compte: '411', solde: centimes(0) },
      ],
      '2026-01-01',
    );
    expect(r.douteux).toEqual([]);
    const e = r.ecriture;
    expect(e?.statut).toBe('brouillon');
    expect(e?.date).toBe('2026-01-01');
    if (e === null) throw new Error('écriture attendue');
    expect(e.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['101', 0, 100000],
      ['401', 0, 50000],
      ['512', 150000, 0],
    ]);
    expect(verifierEcriture(e).equilibree).toBe(true);
  });

  it('a-nouveaux-desequilibres-refuses', () => {
    const un = [{ compte: '512', solde: centimes(100) }, { compte: '101', solde: centimes(-99) }];
    expect(code(() => reconstruireANouveaux(un, '2026-01-01'))).toBe('desequilibre');
    const autre = [{ compte: '512', solde: centimes(99) }, { compte: '101', solde: centimes(-100) }];
    expect(code(() => reconstruireANouveaux(autre, '2026-01-01'))).toBe('desequilibre');
    expect(code(() => reconstruireANouveaux([{ compte: '512', solde: centimes(1) }], '2026-01-01'))).toBe('desequilibre');
    expect(code(() => reconstruireANouveaux([], '2026-13-01'))).toBe('date_invalide');
  });

  it('balance-seule-acceptee', () => {
    const r = reconstruireANouveaux([{ compte: '512', solde: centimes(2500) }, { compte: '101', solde: centimes(-2500) }], '2026-01-01');
    expect(r.ecriture?.lignes).toHaveLength(2);
    expect(reconstruireANouveaux([], '2026-01-01')).toEqual({ ecriture: null, douteux: [] });
    expect(reconstruireANouveaux([{ compte: '512', solde: centimes(0) }], '2026-01-01').ecriture).toBeNull();
  });

  it('classe-8-signalee-douteuse', () => {
    const r = reconstruirePlan([ligne('801', 'Engagements fictifs'), ligne('12', 'Court'), ligne('abc', 'Sans numéro'), ligne('0123', 'Classe 0'), ligne('401', 'Ok')]);
    expect(r.comptes.map((c) => c.numero)).toEqual(['401']);
    expect(r.douteux).toEqual([
      { numero: '801', motif: 'classe_8_v1' },
      { numero: '12', motif: 'trop_court' },
      { numero: 'abc', motif: 'numero_absent' },
      { numero: '0123', motif: 'classe_inconnue' },
    ]);
    const a = reconstruireANouveaux(
      [{ compte: '801', solde: centimes(100) }, { compte: '512', solde: centimes(500) }, { compte: '101', solde: centimes(-500) }],
      '2026-01-01',
    );
    expect(a.douteux).toEqual([{ numero: '801', motif: 'classe_8_v1' }]);
    expect(a.ecriture?.lignes.map((l) => l.compte)).toEqual(['101', '512']);
  });
});
