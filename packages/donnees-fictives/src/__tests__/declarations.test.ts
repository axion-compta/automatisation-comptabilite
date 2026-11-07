import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { genererCompta } from '../compta.js';
import { genererDeclarations, serialiserDeclarations, type JeuDeclarations } from '../declarations.js';

const EMPREINTE = 'd848f92b37d5764980ae4ed9f00ce1a5a4e8bf2899135d5663847777eb1663bb';
const sha = (j: JeuDeclarations): string => createHash('sha256').update(serialiserDeclarations(j)).digest('hex');

describe('déclarations fictives', () => {
  const jeu = genererDeclarations();
  it('meme-graine-meme-empreinte', () => {
    expect(sha(jeu)).toBe(EMPREINTE);
    expect(sha(genererDeclarations())).toBe(sha(jeu));
    expect(sha(genererDeclarations(1))).not.toBe(sha(jeu));
    for (const g of [0, -5]) {
      expect(sha(genererDeclarations(g))).toBe(sha(genererDeclarations(g)));
      expect(sha(genererDeclarations(g))).not.toBe(sha(jeu));
    }
    const triee = (v: unknown): boolean =>
      Array.isArray(v) ? v.every(triee) : v !== null && typeof v === 'object' ? Object.keys(v).join() === Object.keys(v).sort().join() && Object.values(v).every(triee) : true;
    expect(triee(JSON.parse(serialiserDeclarations(jeu)))).toBe(true);
    const inverse = (o: object): object => Object.fromEntries(Object.entries(o).reverse());
    const melange = { ...inverse(jeu), declarations: jeu.declarations.map((d) => ({ ...inverse(d), cases: d.cases.map(inverse) })) };
    expect(serialiserDeclarations(melange as JeuDeclarations)).toBe(serialiserDeclarations(jeu));
  });
  it('graine-non-entiere-refusee', () => {
    for (const g of [NaN, Infinity, 1.5]) expect(() => genererDeclarations(g)).toThrow(RangeError);
  });
  it('sources-existent-dans-le-jeu-compta', () => {
    for (const g of [undefined, 0, -5, 2]) {
      const d = g === undefined ? jeu : genererDeclarations(g);
      const compta = (g === undefined ? genererCompta() : genererCompta(g)).societes.find((s) => s.profil === 'pleine');
      const sources = d.declarations.flatMap((x) => x.cases.flatMap((c) => c.sources));
      expect(sources.length).toBeGreaterThan(0);
      for (const x of d.declarations) {
        const per = d.periodesTva.find((q) => q.id === x.periodeId);
        for (const c of x.cases) {
          expect(new Set(c.sources.map((s) => `${s.ecritureId}:${s.ligneIndex}`)).size).toBe(c.sources.length);
          for (const s of c.sources) {
            const date = compta?.ecritures.find((e) => e.id === s.ecritureId)?.date ?? '';
            expect(date >= (per?.debut ?? '') && date <= (per?.fin ?? '')).toBe(true);
          }
        }
      }
      for (const s of sources) {
        const e = compta?.ecritures.find((x) => x.id === s.ecritureId);
        expect(e).toBeDefined();
        expect(e?.statut).toBe('validee');
        expect(e?.lignes[s.ligneIndex]).toBeDefined();
      }
    }
  });
  it('montant-case-egal-somme-sources', () => {
    const compta = genererCompta().societes.find((s) => s.profil === 'pleine');
    expect(jeu.declarations.length).toBeGreaterThan(0);
    for (const d of jeu.declarations) {
      for (const c of d.cases) {
        const somme = c.sources.reduce((t, s) => {
          const l = compta?.ecritures.find((e) => e.id === s.ecritureId)?.lignes[s.ligneIndex];
          return t + (l ? l.debitCentimes + l.creditCentimes : 0);
        }, 0);
        expect(c.montantCentimes).toBe(somme);
        expect(Number.isInteger(c.montantCentimes)).toBe(true);
        expect(c.montantCentimes).toBeGreaterThan(0);
      }
    }
  });
  it('une-estimation-non-calculee-sans-montant', () => {
    const non = jeu.estimations.filter((e) => e.etat === 'non_calculee');
    expect(non).toHaveLength(1);
    expect(non[0]).toEqual({ exerciceId: 'EX2026', etat: 'non_calculee', motif: 'tva_en_doute', piecesARegarder: 2 });
    expect('collecteeCentimes' in (non[0] as object)).toBe(false);
    expect('deductibleCentimes' in (non[0] as object)).toBe(false);
    const calc = jeu.estimations.find((e) => e.etat === 'calculee');
    expect(Number.isInteger(calc?.collecteeCentimes)).toBe(true);
    expect(jeu.periodesTva.map((p) => p.statut).sort()).toEqual(['deposee_par_client', 'ouverte', 'validee']);
    expect(jeu.fec.map((f) => f.statut)).toEqual(['travail', 'remplace', 'definitif']);
  });
  it('profil-vide-listes-vides', () => {
    const v = genererDeclarations(undefined, 'vide');
    expect(v).toEqual({ version: 1, periodesTva: [], declarations: [], estimations: [], fec: [], traces: [], echeances: [] });
    expect(genererDeclarations(0, 'vide')).toEqual(v);
  });
  it('aucun-mot-interdit', () => {
    const mots = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));
    const texte = serialiserDeclarations(jeu).toLowerCase();
    for (const m of mots) expect(texte).not.toContain(m.toLowerCase());
    expect(texte).not.toMatch(/[a-z]{2}\d{2}[ \d]{10,}/i);
    expect(texte).not.toMatch(/@(?!exemple\.fr)/);
  });
  it('noms-fec-fictifs', () => {
    expect(jeu.fec.length).toBeGreaterThan(0);
    for (const f of jeu.fec) {
      expect(f.nomFichier).toMatch(/^123456782FEC\d{8}(_TRAVAIL)?\.txt$/);
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.statut === 'travail').toBe(f.nomFichier.includes('_TRAVAIL'));
    }
    expect(jeu.declarations.every((d) => d.validePar === null || d.validePar === 'Camille Fictif')).toBe(true);
  });
});
