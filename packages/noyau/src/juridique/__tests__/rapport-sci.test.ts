import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../ecritures/modele.js';
import { ErreurRapportSci, preparerRapportSci } from '../rapport-sci.js';
import type { TableRubriques } from '../rapport-sci.js';

// Comptes INVENTÉS, propres à ce test : 7A loyers, 6A charges, 6B intérêts, 1A capital, 4A compte courant, 5A banque.
const table: TableRubriques = {
  loyers: { code: 'loyers', prefixes: ['7A'], exclus: [], sens: 'credit' },
  charges: { code: 'charges', prefixes: ['6A'], exclus: [], sens: 'debit' },
  interets: { code: 'interets', prefixes: ['6B'], exclus: [], sens: 'debit' },
  capitalRestantDu: { code: 'capital_restant_du', prefixes: ['1A'], exclus: [], sens: 'credit' },
  comptesCourants: { code: 'comptes_courants', prefixes: ['4A'], exclus: [], sens: 'credit' },
};
const ligne = (compte: string, debit: number, credit: number): LigneEcriture => ({
  compte,
  libelle: 'Ligne fictive',
  debit: centimes(debit),
  credit: centimes(credit),
});
const ecr = (id: string, lignes: LigneEcriture[], statut: StatutEcriture = 'valide'): Ecriture => ({
  id,
  journal: 'OD',
  date: '2027-03-01',
  statut,
  lignes,
});
const jeu = (): Ecriture[] => [
  ecr('e1', [ligne('5A', 1200000, 0), ligne('7A1', 0, 1200000)]),
  ecr('e2', [ligne('5A', 1200000, 0), ligne('7A2', 0, 1200000)]),
  ecr('e3', [ligne('6A1', 325000, 0), ligne('5A', 0, 325000)]),
  ecr('e4', [ligne('6A2', 200000, 0), ligne('5A', 0, 200000)]),
  ecr('e5', [ligne('6B', 310000, 0), ligne('5A', 0, 310000)]),
  ecr('e6', [ligne('5A', 11840000, 0), ligne('1A', 0, 11840000)]),
  ecr('e7', [ligne('5A', 1200000, 0), ligne('4A', 0, 1200000)]),
];
const rapport = (e: Ecriture[], t = table, activite: string | null = null) => preparerRapportSci(e, t, { activite });
const montant = (r: ReturnType<typeof rapport>, code: string, poste: string) =>
  r.rubriques.find((x) => x.code === code)?.montants.find((m) => m.poste === poste);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurRapportSci ? e.code : 'autre';
  }
  return undefined;
};

describe('preparerRapportSci', () => {
  it('s1-resultat-1-565-000', () => {
    const r = rapport(jeu());
    expect(montant(r, 'resultat', 'resultat')?.centimes).toBe(1565000);
    expect(montant(r, 'loyers', 'loyers')?.centimes).toBe(2400000);
    expect(montant(r, 'charges', 'charges')?.centimes).toBe(525000);
    expect(montant(r, 'emprunts', 'interets')?.centimes).toBe(310000);
    expect(montant(r, 'emprunts', 'capital_restant_du')?.centimes).toBe(11840000);
    expect(montant(r, 'comptes_courants', 'comptes_courants')?.centimes).toBe(1200000);
  });
  it('s1-six-rubriques-dans-l-ordre', () => {
    expect(rapport(jeu()).rubriques.map((x) => x.code)).toEqual(['activite', 'loyers', 'charges', 'emprunts', 'resultat', 'comptes_courants']);
  });
  it('s1-phrase-du-greffe-une-fois-et-aucun-pv', () => {
    const r = rapport(jeu());
    expect(r.mentions).toEqual(['pas_de_depot_greffe']);
    expect(r.pv).toBeNull();
    expect(JSON.stringify(r).split('greffe')).toHaveLength(2);
    expect(r.statut).toBe('brouillon');
    expect(r.mention).toBe('prepare_par_ia');
  });
  it('chaque-montant-somme-de-ses-sources', () => {
    const e = jeu();
    const r = rapport(e);
    for (const rub of r.rubriques) {
      for (const m of rub.montants) {
        if (m.poste === 'resultat') continue;
        const sens = m.poste === 'charges' || m.poste === 'interets' ? 'debit' : 'credit';
        let somme = 0;
        for (const s of m.sources) {
          const l = e.find((x) => x.id === s.ecritureId)!.lignes[s.ligneIndex]!;
          somme += sens === 'debit' ? l.debit - l.credit : l.credit - l.debit;
        }
        expect(m.centimes).toBe(somme);
      }
    }
    expect(montant(r, 'loyers', 'loyers')?.sources).toEqual([{ ecritureId: 'e1', ligneIndex: 1 }, { ecritureId: 'e2', ligneIndex: 1 }]);
    // Le résultat renvoie aux écritures des loyers, des charges et des intérêts.
    expect(montant(r, 'resultat', 'resultat')?.sources.map((s) => s.ecritureId)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
  });
  it('brouillons-ignores', () => {
    const e = [...jeu(), ecr('b1', [ligne('5A', 9000, 0), ligne('7A1', 0, 9000)], 'brouillon'), ecr('p1', [ligne('6A1', 7000, 0), ligne('5A', 0, 7000)], 'propose')];
    expect(rapport(e)).toEqual(rapport(jeu()));
    // Un brouillon déséquilibré n'est pas lu, donc ne bloque rien.
    expect(code(() => rapport([...jeu(), ecr('b2', [ligne('7A1', 0, 5)], 'brouillon')]))).toBeUndefined();
  });
  it('compte-dans-deux-postes-refuse', () => {
    const mal = { ...table, charges: { ...table.charges, prefixes: ['6'] } };
    expect(code(() => rapport(jeu(), mal))).toBe('compte_dans_deux_postes');
    // Avec une exclusion, la table est bien faite.
    const bien = { ...table, charges: { ...table.charges, prefixes: ['6'], exclus: ['6B'] } };
    expect(montant(rapport(jeu(), bien), 'charges', 'charges')?.centimes).toBe(525000);
  });
  it('activite-absente-rubrique-vide-sans-invention', () => {
    const a = rapport(jeu()).rubriques[0];
    expect(a).toEqual({ code: 'activite', texte: null, montants: [] });
    expect(rapport(jeu(), table, '   ').rubriques[0]).toEqual(a);
    expect(rapport(jeu(), table, 'Location nue').rubriques[0]).toEqual({ code: 'activite', texte: 'Location nue', montants: [] });
  });
  it('aucune-ecriture-tout-a-zero', () => {
    const r = rapport([]);
    for (const rub of r.rubriques.slice(1)) {
      for (const m of rub.montants) expect(m).toMatchObject({ centimes: 0, sources: [] });
    }
    expect(montant(r, 'resultat', 'resultat')?.centimes).toBe(0);
  });
  it('ordre-inverse-meme-resultat', () => {
    const inverse = jeu()
      .map((e) => ({ ...e, lignes: [...e.lignes].reverse() }))
      .reverse();
    const r = rapport(inverse);
    expect(montant(r, 'resultat', 'resultat')?.centimes).toBe(1565000);
    expect(montant(r, 'loyers', 'loyers')?.sources).toEqual([{ ecritureId: 'e1', ligneIndex: 0 }, { ecritureId: 'e2', ligneIndex: 0 }]);
  });
  it('resultat-negatif', () => {
    const e = [ecr('c1', [ligne('6A1', 500, 0), ligne('5A', 0, 500)]), ecr('c2', [ligne('5A', 200, 0), ligne('7A1', 0, 200)])];
    expect(montant(rapport(e), 'resultat', 'resultat')?.centimes).toBe(-300);
  });
  it('ecriture-desequilibree-refusee', () => {
    const e = [ecr('d1', [ligne('5A', 100, 0), ligne('7A1', 0, 99)])];
    expect(code(() => rapport(e))).toBe('ecriture_desequilibree');
  });
  it('prefixe-vide-refuse', () => {
    expect(code(() => rapport(jeu(), { ...table, loyers: { ...table.loyers, prefixes: [''] } }))).toBe('prefixe_vide');
    expect(code(() => rapport(jeu(), { ...table, loyers: { ...table.loyers, exclus: [''] } }))).toBe('prefixe_vide');
    expect(code(() => rapport([], { ...table, comptesCourants: { ...table.comptesCourants, prefixes: [''] } }))).toBe('prefixe_vide');
  });
});
