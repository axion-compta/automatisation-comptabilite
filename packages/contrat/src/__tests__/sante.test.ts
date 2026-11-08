import { describe, expect, it } from 'vitest';
import { ReponseSante } from '../domaines/sante.js';
import { creerServiceSante } from '../domaines/sante-service.js';
import { contrat } from '../routes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const CODES = ['banque', 'cas', 'fraicheur', 'tva', 'controles'];
const GRAVITE = { vert: 0, orange: 1, rouge: 2 } as const;

describe('santé en mémoire', () => {
  it('schema-cinq-sous-indicateurs', () => {
    const s = creerServiceSante().lire();
    expect(ReponseSante.parse(s)).toEqual(s);
    expect(s.sousIndicateurs).toHaveLength(CODES.length);
    const base = { globale: 'vert', sousIndicateurs: s.sousIndicateurs };
    expect(ReponseSante.safeParse({ ...base, sousIndicateurs: s.sousIndicateurs.slice(1) }).success).toBe(false);
    expect(ReponseSante.safeParse({ ...base, sousIndicateurs: [...s.sousIndicateurs, s.sousIndicateurs[0]] }).success).toBe(false);
    expect(ReponseSante.safeParse({ ...base, globale: 'bleu' }).success).toBe(false);
    expect(ReponseSante.safeParse({ ...base, sousIndicateurs: s.sousIndicateurs.map((x, i) => (i ? x : { ...x, valeur: Number.NaN })) }).success).toBe(false);
    expect(ReponseSante.safeParse({ ...base, sousIndicateurs: s.sousIndicateurs.map((x, i) => (i ? x : { ...x, valeur: null })) }).success).toBe(true);
  });

  it('ordre-fixe', () => {
    for (const graine of [1, 7, 42, 2026]) {
      expect(creerServiceSante(graine).lire().sousIndicateurs.map((x) => x.code)).toEqual(CODES);
    }
    const s = creerServiceSante().lire();
    expect(ReponseSante.safeParse({ ...s, sousIndicateurs: [...s.sousIndicateurs].reverse() }).success).toBe(false);
  });

  it('globale-egale-la-pire', () => {
    const vues = new Set<string>();
    for (let graine = 1; graine <= 40; graine++) {
      const s = creerServiceSante(graine).lire();
      const pire = Math.max(...s.sousIndicateurs.map((x) => GRAVITE[x.couleur]));
      expect(GRAVITE[s.globale]).toBe(pire);
      vues.add(s.globale);
    }
    expect(vues.size).toBeGreaterThan(1);
  });

  it('meme-chiffres-deux-appels', () => {
    const service = creerServiceSante();
    expect(service.lire()).toEqual(service.lire());
    expect(creerServiceSante().lire()).toEqual(service.lire());
    expect(creerServiceSante(3).lire()).not.toEqual(creerServiceSante(4).lire());
  });

  it('openapi-contient-la-route', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/controles/sante']?.get?.operationId).toBe('lireSanteControles');
    expect(Object.keys(doc.paths['/controles/sante'] ?? {})).toEqual(['get']);
    expect(Object.keys(contrat.sante)).toEqual(['lireSante']);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
