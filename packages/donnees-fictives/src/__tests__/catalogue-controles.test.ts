import { describe, expect, it } from 'vitest';
import { donneesCatalogueControles } from '../catalogue-controles.js';
import { genererDonnees, sirenValide } from '../generateur.js';

const D = donneesCatalogueControles(7);
const json = (g: number) => JSON.stringify(donneesCatalogueControles(g));
const NOMS = genererDonnees().societes.map((s) => s.nom);

describe('données fictives du catalogue de contrôles', () => {
  it('meme-graine-memes-donnees', () => {
    expect(json(7)).toBe(json(7));
    expect(donneesCatalogueControles(7)).toEqual(D);
    expect(D.graine).toBe(7);
    for (const g of [NaN, Infinity, -Infinity, 1.5]) expect(() => donneesCatalogueControles(g)).toThrow(RangeError);
  });

  it('graine-differente-donnees-differentes', () => {
    expect(json(8)).not.toBe(json(7));
    expect(donneesCatalogueControles(8).traces.map((t) => t.horodatage)).not.toEqual(D.traces.map((t) => t.horodatage));
    expect(D.sante.sousIndicateurs).toHaveLength(5);
    for (const s of D.sante.sousIndicateurs) expect(Number.isInteger(s.score) && s.score >= 40 && s.score <= 100).toBe(true);
  });

  it('un-b-de-chaque-sorte', () => {
    const grave = (id: string) => D.regles.find((r) => r.id === id)?.gravite;
    const res = (id: string) => D.traces.find((t) => t.regleId === id)?.resultat;
    expect([grave('CC-T02'), res('CC-T02')]).toEqual(['B', 'ALERTE']);
    expect([grave('CC-T05'), res('CC-T05')]).toEqual(['B', 'IMPOSSIBLE']);
    expect([grave('CC-K01'), res('CC-K01')]).toEqual(['B', 'ECARTE']);
    const compte = (g: string, r: string) => D.traces.filter((t) => grave(t.regleId) === g && t.resultat === r).length;
    expect([compte('M', 'ALERTE'), compte('m', 'ALERTE')]).toEqual([2, 3]);
    expect(D.traces.filter((t) => t.resultat === 'OK').length).toBeGreaterThanOrEqual(1);
    expect(D.traces).toHaveLength(D.regles.length);
    expect(new Set(D.regles.map((r) => r.id)).size).toBe(D.regles.length);
  });

  it('horodatages-iso-utc', () => {
    for (const g of [1, 7, 20260101]) {
      for (const t of donneesCatalogueControles(g).traces) {
        expect(t.horodatage).toMatch(/^2026-10-\d\dT\d\d:\d\d:\d\dZ$/);
        expect(new Date(t.horodatage).toISOString().replace('.000Z', 'Z')).toBe(t.horodatage);
      }
    }
  });

  it('aucun-siren-hors-liste-blanche', () => {
    const trouves = json(7).match(/\d{9,}/g) ?? [];
    expect(trouves.sort()).toEqual(['123456782', '987654324']);
    for (const s of trouves) expect(sirenValide(s)).toBe(true);
    expect(sirenValide('123456789')).toBe(false);
    expect(json(8).match(/\d{9,}/g)).toHaveLength(2);
  });

  it('aucun-nom-reel', () => {
    expect(NOMS).toContain(D.societe.nom);
    expect(NOMS).toContain(D.fournisseur.nom);
    const noms = [...json(7).matchAll(/"nom":"([^"]*)"/g)].map((m) => m[1]);
    expect(noms).toHaveLength(2);
    for (const n of noms) expect(NOMS).toContain(n);
    expect(json(7)).not.toMatch(/@(?!exemple\.fr)/);
  });
});
