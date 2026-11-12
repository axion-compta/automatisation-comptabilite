import { describe, expect, it } from 'vitest';
import { etatModeleDefaut } from '../modele-defaut.js';
import { routeAutorisee, type RouteIA } from '../routes-ia.js';

const route: RouteIA = { fournisseur: 'fournisseur-a', region: 'region-ue-1', mode: 'texte', decision: 'D7', ajouteeLe: '2026-02-28' };
const demande = { fournisseur: 'fournisseur-a', region: 'region-ue-1', mode: 'texte' };

describe('modèle par défaut', () => {
  it('liste-vide-provisoire', () => {
    expect(etatModeleDefaut([], demande)).toEqual({ route: demande, provisoire: true });
  });

  it('route-declaree-non-provisoire', () => {
    expect(etatModeleDefaut([route], demande)).toEqual({ route: demande, provisoire: false });
    // la comparaison ignore la casse, comme routeAutorisee
    expect(etatModeleDefaut([route], { ...demande, mode: 'TEXTE' }).provisoire).toBe(false);
  });

  it('route-hors-liste-refusee', () => {
    const autre = { ...demande, region: 'region-ue-2' };
    const etat = etatModeleDefaut([route], autre);
    expect(etat.provisoire).toBe(true);
    expect(routeAutorisee([route], autre).autorisee).toBe(false);
    expect(routeAutorisee([], demande).autorisee).toBe(false);
    for (const champ of ['fournisseur', 'region', 'mode'] as const) {
      expect(etatModeleDefaut([route], { ...demande, [champ]: 'x' }).provisoire).toBe(true);
    }
  });
});
