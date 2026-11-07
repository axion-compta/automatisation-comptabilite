import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contrat } from '../routes.js';
import { Acces, ErreurEtatAcces } from '../domaines/acces.js';
import { Volume } from '../domaines/volume.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { operationId: string; tags?: string[]; responses: Record<string, unknown> }>> };
const doc = genererOpenapi() as Doc;
const routes = Object.entries(contrat.abonnement);
const interne = (r: unknown) =>
  (r as { '~orpc': { route: { tags?: string[] }; outputSchema: z.ZodType } })['~orpc'];

function cles(j: unknown, acc: string[] = []): string[] {
  if (Array.isArray(j)) j.forEach((x) => cles(x, acc));
  else if (j && typeof j === 'object') {
    for (const [k, v] of Object.entries(j)) {
      acc.push(k);
      cles(v, acc);
    }
  }
  return acc;
}

describe('contrat abonnement', () => {
  it('abonnement-routes-dans-openapi', () => {
    expect(doc.paths['/acces']?.['get']?.operationId).toBe('lireAcces');
    expect(doc.paths['/volume']?.['get']?.operationId).toBe('lireVolume');
    const post = doc.paths['/abonnement/demandes-palier']?.['post'];
    expect(post?.operationId).toBe('demanderPalier');
    expect(Object.keys(post!.responses).sort()).toEqual(['201', '404', '422']);
    const err = (contrat.abonnement.demanderPalier as unknown as { '~orpc': { errorMap: Record<string, { status: number }> } })['~orpc'].errorMap;
    expect(Object.fromEntries(Object.entries(err).map(([k, v]) => [k, v.status]))).toEqual({
      ACCORD_MANQUANT: 422,
      PALIER_INCONNU: 404,
      PALIER_IDENTIQUE: 422,
      PALIER_NON_SUPERIEUR: 422,
    });
    expect(Object.keys(contrat.abonnement).sort()).toEqual(['demanderPalier', 'lireAcces', 'lireVolume']);
  });

  it('post-avec-idempotency-key', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
    const p = doc.paths['/abonnement/demandes-palier']!['post'] as unknown as { parameters: Array<{ name: string }> };
    expect(p.parameters.map((x) => x.name)).toContain('Idempotency-Key');
  });

  it('chaque-route-abonnement-a-une-etiquette-acces', () => {
    const valides = ['acces:lecture', 'acces:export', 'acces:ecriture', 'acces:agent', 'acces:compte'];
    expect(routes).toHaveLength(3);
    for (const [, r] of routes) {
      const t = interne(r).route.tags ?? [];
      expect(t.filter((x) => x.startsWith('acces:'))).toHaveLength(1);
      expect(valides).toContain(t.find((x) => x.startsWith('acces:')));
    }
    expect(interne(contrat.abonnement.demanderPalier).route.tags).toEqual(['acces:compte']);
    expect(interne(contrat.abonnement.lireVolume).route.tags).toEqual(['acces:lecture']);
    expect(interne(contrat.abonnement.lireAcces).route.tags).toEqual(['acces:compte']);
    expect(doc.paths['/volume']!['get']!.tags).toEqual(['acces:lecture']);
  });

  it('aucun-champ-montant-prix-cout', () => {
    const schemas = [...routes.map(([, r]) => interne(r).outputSchema), ErreurEtatAcces];
    const toutes = schemas.flatMap((s) => cles((z.toJSONSchema(s) as { properties?: unknown }).properties));
    expect(toutes).toContain('pieces_traitees');
    expect(toutes.length).toBeGreaterThan(20);
    for (const k of toutes) expect(k).not.toMatch(/montant|prix|cout|tarif/i);
  });

  it('cles-existantes-inchangees', () => {
    expect(Object.keys(contrat.ecritures).sort()).toEqual(['creer', 'lister', 'modifier']);
    expect(contrat.plan).toBeDefined();
    expect(contrat.tiers).toBeDefined();
    expect(Object.keys(contrat).sort()).toEqual(['abonnement', 'ecritures', 'plan', 'tiers']);

    const volume = {
      palier: { code: 'P1', nom_affiche: 'Palier' },
      compris: 10,
      utilise: 1,
      prevision_fin_de_mois: 2,
      seuils_bps: [8000],
      alertes_bps: [],
      depasse: false,
      proposer_choix: false,
      comportement: 'continuer',
      palier_superieur: null,
    };
    expect(Volume.safeParse(volume).success).toBe(true);
    for (const mauvais of [-1, 1.5, NaN, Infinity]) {
      expect(Volume.safeParse({ ...volume, compris: mauvais }).success).toBe(false);
    }
    expect(Volume.safeParse({ ...volume, seuils_bps: [1.5] }).success).toBe(false);
    const acces = { etat: 'ACTIF', banniere: null, reprise: { pieces_traitees: 3 } };
    expect(Acces.safeParse(acces).success).toBe(true);
    for (const mauvais of [-1, 1.5, NaN, Infinity]) {
      expect(Acces.safeParse({ ...acces, reprise: { pieces_traitees: mauvais } }).success).toBe(false);
    }
    const ban = { cause: 'c', consequence: 'x', lien: 'portail_abonnement' };
    expect(Acces.safeParse({ ...acces, banniere: { ...ban, prochaine_etape_le: '2026-12-31' } }).success).toBe(true);
    expect(Acces.safeParse({ ...acces, banniere: { ...ban, prochaine_etape_le: '2026-13-45' } }).success).toBe(false);
  });
});
