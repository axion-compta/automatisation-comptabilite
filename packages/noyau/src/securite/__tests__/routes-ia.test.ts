import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { routeAutorisee, validerListeRoutes } from '../routes-ia.js';
import { ErreurSecurite } from '../types.js';

const route = { fournisseur: 'fournisseur-a', region: 'region-ue-1', mode: 'texte', decision: 'D7', ajouteeLe: '2026-02-28' };
const demande = { fournisseur: 'fournisseur-a', region: 'region-ue-1', mode: 'texte' };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurSecurite ? e.code : 'autre';
  }
  return undefined;
}
const refus = (donnee: unknown) => code(() => validerListeRoutes(donnee));

describe('routes IA', () => {
  it('fichier-du-depot-valide', () => {
    const brut = readFileSync(new URL('../../../../../docs/ia/routes-ia.json', import.meta.url), 'utf8');
    expect(validerListeRoutes(JSON.parse(brut))).toEqual([]);
  });

  it('liste-vide-tout-refuse', () => {
    expect(routeAutorisee([], demande)).toEqual({ autorisee: false, evenement: { type: 'ia.route_refusee', ...demande } });
  });

  it('route-listee-autorisee', () => {
    const liste = validerListeRoutes({ routes: [route] });
    expect(liste).toEqual([route]);
    expect(routeAutorisee(liste, demande)).toEqual({ autorisee: true });
    expect(routeAutorisee(liste, { fournisseur: 'FOURNISSEUR-A', region: 'Region-UE-1', mode: 'TEXTE' })).toEqual({ autorisee: true });
    expect(routeAutorisee(liste, { ...demande, mode: 'image' }).autorisee).toBe(false);
    expect(routeAutorisee(liste, { ...demande, fournisseur: 'fournisseur-b' }).autorisee).toBe(false);
  });

  it('region-differente-refusee', () => {
    const liste = validerListeRoutes({ routes: [route] });
    const r = routeAutorisee(liste, { ...demande, region: 'region-ue-2' });
    expect(r).toEqual({ autorisee: false, evenement: { type: 'ia.route_refusee', ...demande, region: 'region-ue-2' } });
  });

  it('sans-decision-refusee', () => {
    expect(refus({ routes: [{ ...route, decision: '' }] })).toBe('argument_invalide');
    expect(refus({ routes: [{ ...route, decision: undefined }] })).toBe('argument_invalide');
    for (const champ of ['fournisseur', 'region', 'mode', 'ajouteeLe']) {
      expect(refus({ routes: [{ ...route, [champ]: ' ' }] })).toBe('argument_invalide');
      expect(refus({ routes: [{ ...route, [champ]: 5 }] })).toBe('argument_invalide');
    }
  });

  it('decision-mal-formee-refusee', () => {
    for (const d of ['d7', 'D', 'D7x', 'X7', ' D7', 'D-7']) expect(refus({ routes: [{ ...route, decision: d }] })).toBe('argument_invalide');
    for (const j of ['2026-02-30', '2026-13-01', '2026-2-28', '28/02/2026', '2026-02-28T10:00', '2026-00-10', '2026-02-00']) {
      expect(refus({ routes: [{ ...route, ajouteeLe: j }] })).toBe('argument_invalide');
    }
    expect(refus({ routes: [{ ...route, ajouteeLe: '2028-02-29' }] })).toBeUndefined();
  });

  it('doublon-casse-differente-refuse', () => {
    expect(refus({ routes: [route, { ...route, fournisseur: 'Fournisseur-A', decision: 'D8' }] })).toBe('argument_invalide');
    expect(refus({ routes: [route, { ...route, mode: 'image' }, { ...route, region: 'REGION-UE-1' }] })).toBe('argument_invalide');
    expect(refus({ routes: [route, { ...route, mode: 'image' }, { ...route, region: 'region-ue-2' }] })).toBeUndefined();
  });

  it('forme-inattendue-refusee', () => {
    for (const d of [null, [], {}, 'x', 7, { routes: null }, { routes: {} }, { routes: [null] }, { routes: [[]] }, { routes: ['x'] }]) {
      expect(refus(d)).toBe('argument_invalide');
    }
  });
});
