// @vitest-environment jsdom
// Fiche L09-T41 : écran E45 Mon entreprise (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e45 } from '../../../../../../packages/textes/src/ecrans/e45.js';
import { profilCodes } from '../../../../../../packages/textes/src/ecrans/profil-codes.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let noeud: { fermer: () => void };
beforeAll(() => void (noeud = demarrerNoeud({ base: location.origin })));
afterAll(() => noeud.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function monter(attente = 200): Promise<HTMLElement> {
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, attente))));
  return hote;
}
const groupes = (h: HTMLElement) => [...h.querySelectorAll('[role=group]')];
const bloc = (h: HTMLElement) => h.querySelector('[data-bloc=tva]')!;

describe('écran E45', () => {
  it('affiche-les-champs', async () => {
    const h = await monter();
    expect(h.querySelector('h1')?.textContent).toBe(e45.titre);
    const noms = groupes(h).map((g) => g.querySelector('span')?.textContent);
    expect(noms.slice(0, 3)).toEqual([e45.champs.denomination, e45.champs.forme, e45.champs.siren]);
    expect(h.textContent).toContain('Lemoine Rénovation');
    expect(h.querySelector('a[href="/reglages/entreprise/annees"]')?.textContent).toBe(e45.annees);
  });

  it('etat-a-confirmer-p04', async () => {
    const h = await monter();
    expect(h.textContent).toContain('Votre régime de TVA est encore à confirmer');
    expect(h.textContent).toContain('TVA non calculée : régime à confirmer');
    expect(h.textContent).not.toContain('estimation');
  });

  it('aucun-montant-de-tva-p04', async () => {
    const h = await monter();
    const texte = bloc(h).textContent ?? '';
    expect(texte).toContain(profilCodes.etats.tva_non_calculee);
    expect(texte).not.toMatch(/€|euro|\d[\d\s.,]*\d?\s*(€|eur)/i);
    expect(texte).not.toMatch(/\d/);
  });

  it('champ-a-confirmer-visible', async () => {
    const h = await monter();
    const g = groupes(h).find((x) => x.textContent?.includes(e45.champs.regime_tva));
    expect(g?.textContent).toContain(profilCodes.statuts.a_confirmer);
    expect(g?.className).toContain('a_confirmer');
  });

  it('voir-la-source-present', async () => {
    const h = await monter();
    const liens = [...h.querySelectorAll('a')].filter((a) => a.textContent === e45.boutons.voirSource);
    expect(liens.length).toBeGreaterThan(0);
    expect(liens[0]?.getAttribute('href')).toMatch(/^\/documents/);
  });

  it('erreur-serveur-etat-erreur', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ code: 'INTERNAL' }, { status: 500 })));
    const h = await monter();
    expect(h.querySelector('[role=alert]')?.textContent).toContain(e45.erreur);
    expect(groupes(h)).toHaveLength(0);
  });

  it('chargement-annonce', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => undefined));
    const h = await monter(20);
    const busy = h.querySelector('[aria-busy=true]');
    expect(busy?.textContent).toBe(e45.chargement);
  });

  it('un-seul-main', async () => {
    const h = await monter();
    expect(h.querySelectorAll('main')).toHaveLength(0);
    expect(h.querySelectorAll('h1')).toHaveLength(1);
    expect(route.id).toBe('e45');
    expect(route.chemin).toBe('/reglages/entreprise');
    expect(route.groupe).toBe('reglages');
    expect(route.titre).toBe(e45.titre);
  });
});
