import { describe, expect, it } from 'vitest';
import { donneesCatalogueControles } from '../../../donnees-fictives/src/catalogue-controles.js';
import { GRAINE } from '../../../donnees-fictives/src/generateur.js';
import { verifierAvantAction } from '../../../noyau/src/controles/garde-fou.js';
import type { Blocage, RegleControle } from '../../../noyau/src/controles/moteur.js';
import { reponseGardeFou } from '../../../noyau/src/controles/reponses.js';
import { ACTIONS_GARDEES, ReponseBloquants } from '../domaines/bloquants.js';
import { creerServiceBloquants } from '../domaines/bloquants-service.js';
import { contrat } from '../routes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const donnees = donneesCatalogueControles(GRAINE);
const service = creerServiceBloquants();
const ids = (a: (typeof ACTIONS_GARDEES)[number]) => service.lister(a).bloquants.map((b) => b.regleId);

describe('bloquants en mémoire', () => {
  it('tva-bloquee-par-cc-t02', () => {
    const r = service.lister('tva');
    expect(ReponseBloquants.parse(r)).toEqual(r);
    expect(r.autorise).toBe(false);
    expect(ids('tva')).toContain('CC-T02');
    expect(r.bloquants.find((b) => b.regleId === 'CC-T02')).toMatchObject({ messageCode: 'controle.CC-T02' });
    expect(ids('tva')).not.toContain('CC-K01');
  });

  it('impossible-compte-bloquant', () => {
    expect(donnees.traces.find((t) => t.regleId === 'CC-T05')?.resultat).toBe('IMPOSSIBLE');
    expect(ids('tva')).toContain('CC-T05');
    expect(ids('validation')).not.toContain('CC-T05');
  });

  it('ecarte-non-ecartable-reste-bloquant', () => {
    expect(donnees.traces.find((t) => t.regleId === 'CC-K01')?.resultat).toBe('ECARTE');
    for (const a of ['validation', 'export', 'cloture'] as const) expect(ids(a)).toContain('CC-K01');
    const ecartable = creerServiceBloquants({ ...donnees, regles: donnees.regles.map((r) => (r.id === 'CC-K01' ? { ...r, id: 'CC-X99' } : r)), traces: donnees.traces.map((t) => (t.regleId === 'CC-K01' ? { ...t, regleId: 'CC-X99' } : t)) });
    expect(ecartable.lister('export')).toEqual({ autorise: true, bloquants: [] });
  });

  it('action-sans-b-autorisee', () => {
    const sansB = creerServiceBloquants({ ...donnees, regles: donnees.regles.map((r) => ({ ...r, bloque: r.gravite === 'B' ? ['tva'] : r.bloque })) });
    expect(sansB.lister('export')).toEqual({ autorise: true, bloquants: [] });
    expect(sansB.lister('tva').autorise).toBe(false);
    expect(creerServiceBloquants({ ...donnees, traces: [] }).lister('tva')).toEqual({ autorise: true, bloquants: [] });
    expect(creerServiceBloquants({ ...donnees, traces: donnees.traces.map((t) => ({ ...t, resultat: 'OK' })) }).lister('cloture').autorise).toBe(true);
  });

  it('meme-liste-que-le-409', () => {
    const regles: RegleControle<unknown>[] = donnees.regles.map((r) => ({ id: r.id, version: 1, gravite: r.gravite, bloque: r.bloque as Blocage[], declencheurs: [], actif: true, evaluer: () => ({ resultat: 'OK' }) }));
    for (const a of ACTIONS_GARDEES) {
      const refus = reponseGardeFou(verifierAvantAction(donnees.traces, regles, a));
      expect(refus).not.toBeNull();
      expect(service.lister(a).bloquants).toEqual(refus?.corps.bloquants);
      expect(service.lister(a).autorise).toBe(false);
    }
    expect(service.lister('tva')).toEqual(service.lister('tva'));
  });

  it('openapi-contient-la-route', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/controles/bloquants']?.get?.operationId).toBe('listerBloquants');
    expect(Object.keys(doc.paths['/controles/bloquants'] ?? {})).toEqual(['get']);
    expect(Object.keys(contrat.bloquants)).toEqual(['listerBloquants']);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
