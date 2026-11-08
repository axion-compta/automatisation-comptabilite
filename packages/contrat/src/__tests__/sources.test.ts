import { describe, expect, it } from 'vitest';
import { genererSources, type JeuSources } from '../../../donnees-fictives/src/sources.js';
import { EtatSources, ReponseEtatSources } from '../domaines/sources.js';
import { creerServiceSources } from '../domaines/sources-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const base = genererSources();
const avec = (v: Partial<JeuSources['veille']>, connecteurs = base.connecteurs): JeuSources => ({ ...base, veille: { ...base.veille, ...v }, connecteurs });

describe('état de la veille et des connecteurs', () => {
  it('etat-de-la-veille', () => {
    const e = creerServiceSources().lire();
    expect(ReponseEtatSources.parse({ body: e }).body).toEqual(e);
    expect(e.veille).toEqual(base.veille);
    expect(e.veille.dernierBalayage).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('connecteurs-tries-par-nom', () => {
    const inverse = [...base.connecteurs].reverse();
    const noms = creerServiceSources(avec({}, inverse)).lire().connecteurs.map((c) => c.connecteur);
    expect(noms).toEqual([...noms].sort());
    expect(noms).toHaveLength(base.connecteurs.length);
    expect(inverse.map((c) => c.connecteur)).not.toEqual(noms);
  });

  it('un-connecteur-degrade', () => {
    const c = creerServiceSources().lire().connecteurs;
    expect(c.filter((x) => x.etat === 'degrade').map((x) => x.connecteur)).toEqual(['tva_intracom']);
    expect(c.every((x) => ['ok', 'degrade', 'panne'].includes(x.etat))).toBe(true);
    expect(EtatSources.safeParse({ ...creerServiceSources().lire(), connecteurs: [{ connecteur: 'x', etat: 'casse', dernierOk: null }] }).success).toBe(false);
  });

  it('alerte-implique-depot-interdit', () => {
    const v = { dernierBalayage: '2026-11-05' };
    const ok = (etat: 'ok' | 'alerte', depot: boolean, connecteurs: unknown[] = []) =>
      EtatSources.safeParse({ veille: { etat, depotAutomatiqueAutorise: depot, ...v }, connecteurs }).success;
    expect(ok('alerte', true)).toBe(false);
    expect(ok('alerte', false)).toBe(true);
    expect(ok('ok', true)).toBe(true);
    expect(ok('ok', false)).toBe(true);
    expect(ok('ok', true, [])).toBe(true);
    expect(ok('ok', true, [{ connecteur: 'a', etat: 'ok', dernierOk: null }])).toBe(true);
    expect(EtatSources.safeParse({ veille: { etat: 'ok', depotAutomatiqueAutorise: true, dernierBalayage: '2026-13-45' }, connecteurs: [] }).success).toBe(false);
    for (const e of [creerServiceSources().lire(), creerServiceSources(genererSources(1)).lire(), creerServiceSources(genererSources(7, { vide: true })).lire()]) {
      expect(EtatSources.safeParse(e).success).toBe(true);
    }
  });

  it('openapi-contient-la-route', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/sources/etat']?.get?.operationId).toBe('lireEtatSources');
    expect(Object.keys(doc.paths['/sources/etat'] ?? {})).toEqual(['get']);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
