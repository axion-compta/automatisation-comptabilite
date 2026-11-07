import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Balance, LigneBalance } from '../../livres/balance.js';
import { affecterPostes, ErreurEtats, preparationPossible, type PosteEtat } from '../postes.js';

// Table fictive inventée : ni numéros ni postes réels.
const TABLE: PosteEtat[] = [
  { poste: 'Poste Alpha', cote: 'actif', prefixes: ['1'], sens: 'debiteur' },
  { poste: 'Poste Beta', cote: 'passif', prefixes: ['1'], sens: 'crediteur' },
  { poste: 'Poste Gamma', cote: 'charges', prefixes: ['6'], sens: 'tous' },
  { poste: 'Poste Delta', cote: 'produits', prefixes: ['7'], sens: 'tous' },
];

function ligne(compte: string, solde: number): LigneBalance {
  const debit = solde > 0 ? solde : 0;
  const credit = solde < 0 ? -solde : 0;
  return { compte, totalDebit: centimes(debit), totalCredit: centimes(credit), solde: centimes(solde) };
}
function bal(...lignes: LigneBalance[]): Balance {
  return { lignes, totaux: { debit: centimes(0), credit: centimes(0) } };
}

describe('affectation des comptes aux postes', () => {
  it('compte-dans-son-poste', () => {
    const r = affecterPostes(bal(ligne('6100', 2500)), TABLE);
    expect(r.postes).toEqual([{ poste: 'Poste Gamma', cote: 'charges', montant: 2500, comptes: ['6100'] }]);
    expect(r.nonAffectes).toEqual([]);
    expect(r.ambigus).toEqual([]);
    expect(preparationPossible(r)).toBe(true);
  });

  it('banque-debitrice-a-l-actif', () => {
    const r = affecterPostes(bal(ligne('1200', 4000)), TABLE);
    expect(r.postes).toEqual([{ poste: 'Poste Alpha', cote: 'actif', montant: 4000, comptes: ['1200'] }]);
    expect(r.nonAffectes).toEqual([]);
  });

  it('banque-creditrice-au-passif', () => {
    const r = affecterPostes(bal(ligne('1200', -4000)), TABLE);
    expect(r.postes).toEqual([{ poste: 'Poste Beta', cote: 'passif', montant: 4000, comptes: ['1200'] }]);
    expect(r.ambigus).toEqual([]);
  });

  it('compte-non-affecte-cite', () => {
    const r = affecterPostes(bal(ligne('6100', 100), ligne('9990', 300)), TABLE);
    expect(r.nonAffectes).toEqual(['9990']);
    expect(r.postes).toHaveLength(1);
    expect(preparationPossible(r)).toBe(false);
    // Préfixe couvrant mais sens non couvert : non affecté.
    const s = affecterPostes(bal(ligne('1200', 1)), [TABLE[1] as PosteEtat]);
    expect(s.nonAffectes).toEqual(['1200']);
    expect(s.postes).toEqual([]);
  });

  it('affectation-ambigue-citee', () => {
    const table: PosteEtat[] = [
      ...TABLE,
      { poste: 'Poste Zeta', cote: 'charges', prefixes: ['61'], sens: 'tous' },
    ];
    const r = affecterPostes(bal(ligne('6100', 500)), table);
    expect(r.ambigus).toEqual([{ compte: '6100', postes: ['Poste Gamma', 'Poste Zeta'] }]);
    expect(r.postes).toEqual([]);
    expect(r.nonAffectes).toEqual([]);
    expect(preparationPossible(r)).toBe(false);
  });

  it('solde-nul-ignore', () => {
    const r = affecterPostes(bal(ligne('9990', 0), ligne('6100', 0)), TABLE);
    expect(r).toEqual({ postes: [], nonAffectes: [], ambigus: [] });
    expect(preparationPossible(r)).toBe(true);
  });

  it('comptes-tries-dans-le-poste', () => {
    const r = affecterPostes(bal(ligne('6300', 30), ligne('6100', 10), ligne('6200', 20)), TABLE);
    expect(r.postes[0]?.comptes).toEqual(['6100', '6200', '6300']);
    expect(r.postes[0]?.montant).toBe(60);
  });
});

describe('affectation : cas limites', () => {
  it('table-vide-tout-non-affecte', () => {
    const r = affecterPostes(bal(ligne('6200', 5), ligne('6100', -5)), []);
    expect(r.postes).toEqual([]);
    expect(r.nonAffectes).toEqual(['6100', '6200']);
    expect(preparationPossible(r)).toBe(false);
  });

  it('balance-vide-preparation-possible', () => {
    const r = affecterPostes(bal(), TABLE);
    expect(r).toEqual({ postes: [], nonAffectes: [], ambigus: [] });
    expect(preparationPossible(r)).toBe(true);
  });

  it('prefixe-vide-refuse', () => {
    const table: PosteEtat[] = [{ poste: 'Poste Vide', cote: 'actif', prefixes: [''], sens: 'tous' }];
    expect(() => affecterPostes(bal(), table)).toThrow(ErreurEtats);
    expect(() => affecterPostes(bal(ligne('1', 1)), table)).toThrow(ErreurEtats);
    const sans: PosteEtat[] = [{ poste: 'Poste Vide', cote: 'actif', prefixes: [], sens: 'tous' }];
    expect(affecterPostes(bal(ligne('1', 1)), sans).nonAffectes).toEqual(['1']);
  });

  it('ordre-de-la-table-inverse-meme-resultat', () => {
    const table: PosteEtat[] = [
      ...TABLE,
      { poste: 'Poste Zeta', cote: 'charges', prefixes: ['61'], sens: 'tous' },
    ];
    const b = bal(ligne('1200', 40), ligne('1300', -50), ligne('6100', 7), ligne('7000', -9), ligne('8000', 2));
    const a = affecterPostes(b, table);
    expect(affecterPostes(b, [...table].reverse())).toEqual(a);
    expect(a.postes.map((p) => p.poste)).toEqual(['Poste Alpha', 'Poste Beta', 'Poste Delta']);
  });

  it('montant-positif-et-cumule', () => {
    const r = affecterPostes(bal(ligne('7000', -30), ligne('7100', -70)), TABLE);
    expect(r.postes).toEqual([{ poste: 'Poste Delta', cote: 'produits', montant: 100, comptes: ['7000', '7100'] }]);
  });

  it('sens-tous-accepte-les-deux-signes', () => {
    const r = affecterPostes(bal(ligne('6100', -8)), TABLE);
    expect(r.postes[0]?.montant).toBe(8);
  });

  it('plusieurs-prefixes-un-meme-poste-nest-pas-ambigu', () => {
    const table: PosteEtat[] = [{ poste: 'Poste Multi', cote: 'actif', prefixes: ['6', '61'], sens: 'tous' }];
    const r = affecterPostes(bal(ligne('6100', 3)), table);
    expect(r.ambigus).toEqual([]);
    expect(r.postes).toHaveLength(1);
  });

  it('prefixe-non-debut-de-compte-ne-couvre-pas', () => {
    const r = affecterPostes(bal(ligne('2610', 3)), TABLE);
    expect(r.nonAffectes).toEqual(['2610']);
  });
});
