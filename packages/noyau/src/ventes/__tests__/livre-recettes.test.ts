import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { caEncaisseAnnee, depassementSeuil, ligneLivreRecettes, livreDesRecettes, MODES_REGLEMENT } from '../livre-recettes.js';

const c = (n: number): Centimes => centimes(n);
const base = { dateEncaissement: '2026-11-10', client: 'Atelier Lumière', montant: c(80000), mode: 'virement', numeroFacture: 'F-2026-0009' };
const ligne = (o: Record<string, unknown> = {}) => ligneLivreRecettes({ ...base, ...o } as never);
const SEUIL = c(4000000);
const valide = { valeur: SEUIL, statut: 'valide' } as const;

describe('livre des recettes', () => {
  it('v09-ligne-a-la-date-d-encaissement', () => {
    const l = ligne({ client: '  Atelier Lumière ', numeroFacture: ' F-2026-0009 ' });
    expect(l).toEqual(base);
    expect(MODES_REGLEMENT).toEqual(['virement', 'cheque', 'especes', 'carte', 'prelevement', 'autre']);
    for (const mode of MODES_REGLEMENT) expect(ligne({ mode }).mode).toBe(mode);
    expect(caEncaisseAnnee([ligne({ montant: c(100) }), l], 2026)).toBe(80100);
  });

  it('annee-civile-seulement', () => {
    const l = [
      ligne({ dateEncaissement: '2025-12-31', montant: c(500), numeroFacture: 'A' }),
      ligne({ dateEncaissement: '2026-01-01', montant: c(200), numeroFacture: 'B' }),
      ligne({ dateEncaissement: '2026-12-31', montant: c(300), numeroFacture: 'C' }),
      ligne({ dateEncaissement: '2027-01-01', montant: c(900), numeroFacture: 'D' }),
    ];
    expect(livreDesRecettes(l, 2026).map((x) => x.numeroFacture)).toEqual(['B', 'C']);
    expect(caEncaisseAnnee(l, 2026)).toBe(500);
    expect(caEncaisseAnnee(l, 2025)).toBe(500);
    expect(caEncaisseAnnee([], 2026)).toBe(0);
    expect(livreDesRecettes([], 2026)).toEqual([]);
  });

  it('tri-par-date-puis-numero', () => {
    const a = ligne({ dateEncaissement: '2026-03-02', numeroFacture: 'F-2' });
    const b = ligne({ dateEncaissement: '2026-03-02', numeroFacture: 'F-1' });
    const d = ligne({ dateEncaissement: '2026-01-15', numeroFacture: 'F-9' });
    const attendu = ['F-9', 'F-1', 'F-2'];
    expect(livreDesRecettes([a, b, d], 2026).map((x) => x.numeroFacture)).toEqual(attendu);
    expect(livreDesRecettes([d, b, a], 2026).map((x) => x.numeroFacture)).toEqual(attendu);
    const entree = [a, b, d];
    livreDesRecettes(entree, 2026);
    expect(entree).toEqual([a, b, d]);
  });

  it('v12-depassement-propose-jamais-applique', () => {
    const r = depassementSeuil({ caAvant: c(3999000), montant: c(2000), seuil: valide });
    expect(r).toEqual({ depasse: true, propositionChangementRegime: true, aVerifier: false, parametreAbsent: false });
    expect(Object.keys(r).sort()).toEqual(['aVerifier', 'depasse', 'parametreAbsent', 'propositionChangementRegime']);
    expect(depassementSeuil({ caAvant: c(0), montant: c(1), seuil: valide }).depasse).toBe(false);
    expect(depassementSeuil({ caAvant: SEUIL, montant: c(1), seuil: valide }).depasse).toBe(true);
  });

  it('egal-au-seuil-non-depasse', () => {
    const r = depassementSeuil({ caAvant: c(3900000), montant: c(100000), seuil: valide });
    expect(r).toEqual({ depasse: false, propositionChangementRegime: false, aVerifier: false, parametreAbsent: false });
  });

  it('seuil-a-verifier-marque', () => {
    for (const statut of ['a_verifier', 'non_verifie'] as const) {
      const r = depassementSeuil({ caAvant: c(3999000), montant: c(2000), seuil: { valeur: SEUIL, statut } });
      expect(r).toEqual({ depasse: true, propositionChangementRegime: true, aVerifier: true, parametreAbsent: false });
    }
  });

  it('seuil-absent', () => {
    const r = depassementSeuil({ caAvant: c(99999999), montant: c(99999999), seuil: undefined });
    expect(r).toEqual({ depasse: false, propositionChangementRegime: false, aVerifier: false, parametreAbsent: true });
  });

  it('entrees-invalides', () => {
    const code = (c2: string, m: string) => expect.objectContaining({ code: c2, message: expect.stringContaining(m) });
    for (const montant of [0, -5, Number.NaN, Infinity, 1.5, '5']) expect(() => ligne({ montant })).toThrow(code('montant_invalide', 'montant'));
    for (const mode of ['bitcoin', undefined]) expect(() => ligne({ mode })).toThrow(code('mode_inconnu', 'Mode'));
    for (const client of ['', '   ', 5, undefined]) expect(() => ligne({ client })).toThrow(code('texte_vide', 'client'));
    for (const numeroFacture of ['', '  ', 5]) expect(() => ligne({ numeroFacture })).toThrow(code('texte_vide', 'numéro de facture'));
    for (const dateEncaissement of ['2026-02-30', '10/11/2026', '', undefined, 20261110]) expect(() => ligne({ dateEncaissement })).toThrow(code('date_invalide', 'Date'));
    const l = [ligne()];
    for (const annee of [2026.5, Number.NaN, Infinity, '2026' as never]) {
      expect(() => livreDesRecettes(l, annee)).toThrow(code('annee_invalide', 'Année'));
      expect(() => caEncaisseAnnee(l, annee)).toThrow(code('annee_invalide', 'Année'));
    }
    const mauvais = [
      [{ caAvant: c(0), montant: c(0) }, 'montant'],
      [{ caAvant: c(-1), montant: c(1) }, 'chiffre avant'],
      [{ caAvant: Number.NaN as Centimes, montant: c(1) }, 'chiffre avant'],
      [{ caAvant: c(0), montant: Infinity as Centimes }, 'montant'],
      [{ caAvant: c(0), montant: 1.5 as Centimes }, 'montant'],
    ] as const;
    for (const [m, champ] of mauvais) expect(() => depassementSeuil({ ...m, seuil: valide })).toThrow(code('montant_invalide', champ));
    for (const valeur of [Number.NaN, 0, -1, 1.5]) {
      const seuil = { valeur: valeur as Centimes, statut: 'valide' } as const;
      expect(() => depassementSeuil({ caAvant: c(0), montant: c(1), seuil })).toThrow(code('montant_invalide', 'seuil'));
    }
    expect(() => depassementSeuil({ caAvant: c(0), montant: c(1), seuil: { valeur: SEUIL, statut: 'x' as never } })).toThrow(code('statut_invalide', 'Statut'));
  });

  it('tri-meme-date-meme-numero-et-numeros-croissants', () => {
    const a = ligne({ numeroFacture: 'F-1', montant: c(1) });
    const b = ligne({ numeroFacture: 'F-1', montant: c(2) });
    expect(livreDesRecettes([a, b], 2026)).toEqual([a, b]);
    expect(livreDesRecettes([b, a], 2026)).toEqual([b, a]);
    const x = ligne({ dateEncaissement: '2026-05-01', numeroFacture: 'Z' });
    const y = ligne({ dateEncaissement: '2026-05-02', numeroFacture: 'A' });
    expect(livreDesRecettes([y, x], 2026)).toEqual([x, y]);
  });
});
