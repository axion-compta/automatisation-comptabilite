import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { calculerTotaux } from '../totaux.js';
import { ErreurFrais, type Frais, type StatutFrais } from '../types.js';

const c = (n: number): Centimes => centimes(n);

function frais(id: string, montant: number, extra: Partial<Frais> = {}): Frais {
  return {
    id,
    personneId: 'p1',
    nature: 'depense',
    dateDepense: '2026-03-10',
    libelle: 'Frais fictif',
    montantTtc: c(montant),
    tva: c(0),
    payeur: 'personne',
    statut: 'valide',
    justificatifPerdu: false,
    partPersoTtc: c(0),
    version: 1,
    ...extra,
  };
}

const vide = new Map<string, Centimes | null>();
const sansKm = new Map<string, number>();
const totaux = (f: Frais[], m = vide, k = sansKm) => calculerTotaux(f, m, k);
const zeros = { aRembourser: 0, enAttente: 0, exclus: 0, kmSansMontant: 0 };

function codeErreur(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

describe('totaux de frais', () => {
  it('nf19-exemple-de-la-demo', () => {
    const t = totaux([
      frais('a', 6400, { payeur: 'societe', statut: 'exclu_paye_societe' }),
      frais('b', 4500, { statut: 'a_completer' }),
      frais('c', 1260),
    ]);
    expect(t).toEqual({ aRembourser: 1260, enAttente: 4500, exclus: 6400, kmSansMontant: 0 });
    expect(Object.values(t)).not.toContain(12160);
    expect(Object.keys(t).sort()).toEqual(['aRembourser', 'enAttente', 'exclus', 'kmSansMontant']);
  });

  it('payeur-a-confirmer-hors-totaux', () => {
    const statuts: StatutFrais[] = ['valide', 'propose', 'a_completer', 'refuse', 'perso', 'exclu_paye_societe'];
    expect(totaux(statuts.map((s, i) => frais('x' + String(i), 1000, { payeur: 'a_confirmer', statut: s })))).toEqual(zeros);
  });

  it('paye-societe-toujours-exclu-jamais-a-rembourser', () => {
    expect(totaux([frais('a', 700, { payeur: 'societe', statut: 'exclu_paye_societe' })])).toEqual({ ...zeros, exclus: 700 });
    for (const s of ['valide', 'propose', 'a_completer', 'brouillon'] as const) {
      expect(totaux([frais('a', 700, { payeur: 'societe', statut: s })])).toEqual(zeros);
    }
  });

  it('rembourse-hors-totaux', () => {
    expect(totaux([frais('a', 900, { statut: 'rembourse' })])).toEqual(zeros);
    expect(totaux([frais('a', 900, { remboursementId: 'r1' })])).toEqual(zeros);
    expect(totaux([frais('a', 900, { statut: 'brouillon' })])).toEqual(zeros);
  });

  it('compte-courant-hors-totaux', () => {
    expect(totaux([frais('a', 900, { statut: 'en_compte_courant' })])).toEqual(zeros);
    expect(totaux([frais('a', 900, { destination: 'compte_courant' })])).toEqual(zeros);
    expect(totaux([frais('a', 900, { destination: 'remboursement' })])).toEqual({ ...zeros, aRembourser: 900 });
  });

  it('statuts-vers-le-bon-total', () => {
    expect(totaux([frais('a', 100, { statut: 'propose' }), frais('b', 200, { statut: 'a_completer' })])).toEqual({ ...zeros, enAttente: 300 });
    expect(totaux([frais('a', 100, { statut: 'perso' }), frais('b', 200, { statut: 'refuse' })])).toEqual({ ...zeros, exclus: 300 });
    expect(totaux([frais('a', 100), frais('b', 200)])).toEqual({ ...zeros, aRembourser: 300 });
  });

  it('trajet-sans-montant-en-km', () => {
    const m = new Map<string, Centimes | null>([['t1', null], ['t2', c(1500)]]);
    const k = new Map([['t1', 125], ['t2', 40]]);
    const t = totaux([frais('t1', 0, { nature: 'trajet' }), frais('t2', 0, { nature: 'trajet' })], m, k);
    expect(t).toEqual({ ...zeros, aRembourser: 1500, kmSansMontant: 125 });
    expect(totaux([frais('t1', 0, { nature: 'trajet', statut: 'propose' })], m, k)).toEqual({ ...zeros, kmSansMontant: 125 });
    expect(totaux([frais('t1', 0, { nature: 'trajet', statut: 'rembourse' })], m, k)).toEqual(zeros);
  });

  it('part-perso-retiree', () => {
    expect(totaux([frais('a', 5000, { partPersoTtc: c(1200) })])).toEqual({ ...zeros, aRembourser: 3800 });
    expect(totaux([frais('a', 5000, { partPersoTtc: c(5000) })])).toEqual(zeros);
  });

  it('liste-vide-zeros', () => {
    expect(totaux([])).toEqual(zeros);
  });

  it('entrees-invalides', () => {
    const nan = Number.NaN as Centimes;
    expect(codeErreur(() => totaux([frais('a', 100, { montantTtc: nan })]))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([frais('a', 100, { montantTtc: 1.5 as Centimes })]))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([frais('a', 100, { partPersoTtc: nan })]))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([frais('a', 100, { partPersoTtc: c(101) })]))).toBe('entree_invalide');
    const t = frais('t1', 0, { nature: 'trajet' });
    expect(codeErreur(() => totaux([t], new Map([['t1', null]]), new Map([['t1', 1.5]])))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([t], new Map([['t1', null]]), new Map([['t1', Number.NaN]])))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([t], new Map([['t1', null]]), new Map([['t1', Infinity]])))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([t], new Map([['t1', null]])))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([t]))).toBe('entree_invalide');
    expect(codeErreur(() => totaux([t], new Map([['t1', nan]])))).toBe('entree_invalide');
  });
});
