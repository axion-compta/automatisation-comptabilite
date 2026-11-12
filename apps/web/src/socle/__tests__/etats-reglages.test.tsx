// @vitest-environment jsdom
// Fiche L19-T12 : états vide, chargement et erreur des écrans de réglages, rendus sur réponses simulées (fetch).
import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FournisseurDonnees, creerClient } from '../../donnees/lecture.js';
import { ecransDecouverts } from '../ecrans.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type Scenario = 'vide' | 'lent' | 'panne';
const json = (corps: unknown, status: number) => new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });
const PROFIL_VIDE = { version: 'profil.v1', etat: 'incomplet', champs: [], manquants: [], aConfirmer: [], blocages: [] };
const REPONSES: Record<Scenario, (url: string) => Promise<Response>> = {
  vide: async (url) =>
    json(url.includes('/profil/regimes/tva') ? { body: [] } : url.includes('/profil') ? { body: PROFIL_VIDE } : { body: [], total: 0, decalage: 0, limite: 50 }, 200),
  lent: () => new Promise<Response>(() => {}),
  panne: async () => json({ code: 'INTERNAL_SERVER_ERROR', status: 500 }, 500),
};
// Vide : écrans qui ont un état vide pour une réponse vide (e53 et t05 n'en ont pas : voir le journal). e44-client est un écran de détail : pas d'état vide.
const AVEC_VIDE = ['e44', 'e45', 'e50', 'n03', 'n04'];
const reglages = ecransDecouverts().filter((e) => e.groupe === 'reglages');

let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});
async function rendre(C: ComponentType, scenario: Scenario): Promise<void> {
  window.history.pushState({}, '', '/reglages/entreprise/client?code=C1');
  vi.stubGlobal('fetch', (entree: RequestInfo | URL) => REPONSES[scenario](String(entree instanceof Request ? entree.url : entree)));
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><C /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 100))));
}
const nb = (sel: string) => document.querySelectorAll(sel).length;
async function pourChaque(scenario: Scenario, verifier: (id: string) => void, ids = reglages.map((e) => e.id)) {
  for (const e of reglages.filter((x) => ids.includes(x.id))) {
    await rendre(e.composant, scenario);
    verifier(e.id);
    act(() => racine?.unmount());
    document.body.innerHTML = '';
  }
}

describe('états des écrans de réglages', () => {
  it('reglages-ecrans-decouverts', () => {
    expect(reglages.map((e) => e.id).sort()).toEqual(['e44', 'e44-client', 'e45', 'e50', 'e53', 'n03', 'n04', 't05']);
    expect(AVEC_VIDE.every((id) => reglages.some((e) => e.id === id))).toBe(true);
  });
  it('reglages-etat-vide', async () => {
    await pourChaque('vide', (id) => {
      expect(nb('.axion-etat--vide'), id).toBeGreaterThan(0);
      expect(nb('.axion-etat--chargement'), id).toBe(0);
    }, AVEC_VIDE);
  });
  it('reglages-etat-chargement', async () => {
    await pourChaque('lent', (id) => {
      expect(nb('[role="status"][aria-busy="true"]'), id).toBeGreaterThan(0);
      expect(nb('.axion-etat--erreur, .axion-etat--vide'), id).toBe(0);
    });
  });
  it('reglages-etat-erreur', async () => {
    await pourChaque('panne', (id) => {
      expect(nb('[role="alert"].axion-etat--erreur'), id).toBeGreaterThan(0);
      expect(nb('.axion-etat--chargement'), id).toBe(0);
    });
  });
});
