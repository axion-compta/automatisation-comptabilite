// @vitest-environment jsdom
// Fiche L20-T20 : le nombre du bloc « À faire » est celui de la pastille du menu (/compteurs).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

type Reponse = { body: { blocs?: { code: string; donnees?: Record<string, unknown> }[]; parEntree?: Record<string, { ouvertes: number }> } };

describe('E01 : compteur À faire', () => {
  it('e01-compteur-egal-pastille', async () => {
    const vrai = globalThis.fetch;
    const recus: { tableau?: Reponse; compteurs?: Reponse } = {};
    vi.stubGlobal('fetch', async (u: string, o?: RequestInit) => {
      const r = await vrai(u, o);
      const cle = String(u).includes('/tableau-de-bord') ? 'tableau' : String(u).includes('/compteurs') ? 'compteurs' : undefined;
      if (cle) recus[cle] = (await r.clone().json()) as Reponse;
      return r;
    });
    const client = creerClient();
    client.setDefaultOptions({ queries: { retry: false } });
    racine = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
    await act(async () => void (await new Promise((r) => setTimeout(r, 300))));

    const pastille = Object.values(recus.compteurs?.body.parEntree ?? {}).reduce((s, c) => s + c.ouvertes, 0);
    const nombre = recus.tableau?.body.blocs?.find((b) => b.code === 'a_faire')?.donnees?.['nombre'];
    expect(pastille).toBeGreaterThan(0);
    expect(nombre).toBe(pastille);
    // l'écran affiche la même somme sur « Voir tout (N) »
    const voirTout = [...document.querySelectorAll('button')].find((b) => /^Voir tout \(\d+\)$/.test(b.textContent ?? ''));
    expect(voirTout?.textContent).toBe(`Voir tout (${pastille})`);
  });
});
