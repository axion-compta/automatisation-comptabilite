import { describe, expect, it } from 'vitest';
import { ErreurReglesPdf, lirePdfTexte, verifierRegles } from '../pdf-texte.js';
import type { ReglesPdf } from '../pdf-texte.js';

const REGLES: ReglesPdf = {
  ligne: String.raw`^(?<date>\d{2}/\d{2}/\d{4})\s+(?<libelle>.+?)\s+(?<montant>[+-]?[\d.]+,\d{2})$`,
  soldeOuverture: String.raw`^Solde d'ouverture\s+(?<solde>[\d.]+,\d{2})$`,
  soldeCloture: String.raw`^Solde de cloture\s+(?<solde>[\d.]+,\d{2})$`,
  entetePeriode: String.raw`^Releve du (?<du>\d{2}/\d{2}/\d{4}) au (?<au>\d{2}/\d{2}/\d{4})$`,
  formatDate: 'JJ/MM/AAAA',
  format: { decimal: ',', milliers: '.' },
  devise: 'EUR',
};
const COLONNES: ReglesPdf = {
  ...REGLES,
  ligne: String.raw`^(?<date>\d{2}/\d{2}/\d{4})\s+(?<libelle>.+?)\s{2}(?<debit>[\d.]+,\d{2})?\s{6}(?<credit>[\d.]+,\d{2})?$`,
};
const page = (numero: number, lignes: string[]) => ({ numero, lignes });
const entete = (du: string, au: string) => `Releve du ${du} au ${au}`;
const refus = (r: ReglesPdf): string | undefined => {
  try {
    verifierRegles(r);
  } catch (e) {
    return e instanceof ErreurReglesPdf ? e.code : 'autre';
  }
  return undefined;
};

describe('relevé PDF texte lu par les règles d’un profil', () => {
  it('t02-5-quarante-deux-lignes', () => {
    const ops = Array.from({ length: 42 }, (_, i) => `05/03/2026 Virement client ${i + 1} ${i === 41 ? '32,25' : '28,00'}`);
    const [r] = lirePdfTexte([page(1, [entete('01/03/2026', '31/03/2026'), "Solde d'ouverture 3.200,00", ...ops, 'Solde de cloture 4.380,25'])], REGLES);
    expect(r?.lignes).toHaveLength(42);
    expect(r?.lignes.reduce((s, l) => s + l.montant, 0)).toBe(118025);
    expect((r?.soldeOuverture ?? 0) + (r?.lignes.reduce((s, l) => s + l.montant, 0) ?? 0)).toBe(r?.soldeCloture);
    expect(r?.rejets).toEqual([]);
    expect(r?.lignes[0]).toMatchObject({ dateOperation: '2026-03-05', devise: 'EUR', etatTechnique: 'completee' });
  });

  it('soldes-imprimes-lus', () => {
    const [r] = lirePdfTexte([page(1, [entete('01/03/2026', '31/03/2026'), "Solde d'ouverture 3.200,00", 'Solde de cloture 4.390,25'])], REGLES);
    expect(r).toMatchObject({ soldeOuverture: 320000, soldeCloture: 439025, periodeDebut: '2026-03-01', periodeFin: '2026-03-31' });
    const [s] = lirePdfTexte([page(1, ['05/03/2026 Achat 1 -12,50'])], REGLES);
    expect('soldeOuverture' in (s ?? {})).toBe(false);
    expect('soldeCloture' in (s ?? {})).toBe(false);
  });

  it('libelle-sur-deux-lignes', () => {
    const [r] = lirePdfTexte([page(1, ['05/03/2026 Prelevement assurance -12,50', 'contrat 0001 Exemple', '06/03/2026 Achat -1,00'])], REGLES);
    expect(r?.lignes.map((l) => l.libelleBrut)).toEqual(['Prelevement assurance contrat 0001 Exemple', 'Achat']);
  });

  it('deux-releves-colles', () => {
    const rs = lirePdfTexte([page(1, [entete('01/03/2026', '31/03/2026'), "Solde d'ouverture 10,00", '05/03/2026 A 5,00', 'Solde de cloture 15,00', entete('01/04/2026', '30/04/2026'), "Solde d'ouverture 15,00", '05/04/2026 B -3,00', 'Solde de cloture 12,00'])], REGLES);
    expect(rs).toHaveLength(2);
    expect(rs.map((r) => [r.periodeDebut, r.soldeOuverture, r.lignes.length, r.soldeCloture])).toEqual([['2026-03-01', 1000, 1, 1500], ['2026-04-01', 1500, 1, 1200]]);
  });

  it('debit-et-credit-en-colonnes', () => {
    const [r] = lirePdfTexte([page(1, ['05/03/2026 Achat fournisseur  12,50      ', '06/03/2026 Encaissement client        40,00'])], COLONNES);
    expect(r?.lignes.map((l) => l.montant)).toEqual([-1250, 4000]);
  });

  it('ligne-illisible-rejet-numerote', () => {
    const [r] = lirePdfTexte([page(2, ['05/03/2026 Bon 1,00']), page(1, ['01/03/2026 Bon 2,00', '31/02/2026 Date fausse 3,00', '05/03/2026 Texte NaN'])], REGLES);
    expect(r?.lignes).toHaveLength(2);
    expect(r?.rejets).toEqual([{ rang: 2, motif: 'date_invalide:p1:l2' }]);
    const [n] = lirePdfTexte([page(1, ['05/03/2026 Libelle NaN,00'])], { ...REGLES, ligne: String.raw`^(?<date>\S+)\s+(?<libelle>\S+)\s+(?<montant>\S+)$` });
    expect(n?.lignes).toEqual([]);
    expect(n?.rejets).toEqual([{ rang: 1, motif: 'non_numerique:p1:l1' }]);
  });

  it('regles-invalides-refusees', () => {
    expect(refus(REGLES)).toBeUndefined();
    expect(refus(COLONNES)).toBeUndefined();
    expect(refus({ ...REGLES, ligne: '(a+)+$' })).toBe('regles_invalides');
    expect(refus({ ...REGLES, ligne: String.raw`^(?<date>\d+)\s(?<libelle>(a+)+)\s(?<montant>\d)$` })).toBe('regles_invalides');
    for (const dangereux of ['(?<libelle>((a|b)+)+)', '(?<libelle>(a{1,})+)', '(?<libelle>(a|aa)+)']) {
      expect(refus({ ...REGLES, ligne: String.raw`^(?<date>\d+)\s${dangereux}\s(?<montant>\d)$` })).toBe('regles_invalides');
    }
    expect(refus({ ...REGLES, ligne: '(?<date>' })).toBe('regles_invalides');
    expect(refus({ ...REGLES, ligne: String.raw`^(?<date>\d+)\s(?<libelle>.+)$` })).toBe('regles_invalides');
    expect(refus({ ...REGLES, ligne: String.raw`^(?<date>\d+)\s(?<libelle>.+)\s(?<debit>\d+)$` })).toBe('regles_invalides');
    expect(refus({ ...REGLES, soldeCloture: 'Solde' })).toBe('regles_invalides');
    expect(refus({ ...REGLES, entetePeriode: String.raw`^(?<du>\d+)$` })).toBe('regles_invalides');
    expect(refus({ ...REGLES, soldeOuverture: String.raw`^(?<solde>\d+)${'x'.repeat(300)}$` })).toBe('regles_invalides');
    expect(() => lirePdfTexte([page(1, ['x'])], { ...REGLES, ligne: '(a+)+$' })).toThrow(ErreurReglesPdf);
  });

  it('pages-dans-le-desordre-remises-en-ordre', () => {
    const [r] = lirePdfTexte([page(3, ['07/03/2026 C 3,00']), page(1, [entete('01/03/2026', '31/03/2026'), '05/03/2026 A 1,00']), page(2, ['06/03/2026 B 2,00'])], REGLES);
    expect(r?.lignes.map((l) => l.libelleBrut)).toEqual(['A', 'B', 'C']);
    expect(r?.lignes.map((l) => l.rang)).toEqual([2, 3, 4]);
  });

  it('pages-vides-et-aucune-ligne-reconnue', () => {
    expect(lirePdfTexte([], REGLES)).toEqual([]);
    expect(lirePdfTexte([page(1, []), page(2, ['', '   '])], REGLES)).toEqual([]);
    expect(lirePdfTexte([page(1, ['texte libre', 'autre texte'])], REGLES)).toEqual([]);
  });
});
