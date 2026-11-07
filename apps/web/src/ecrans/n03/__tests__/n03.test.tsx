// @vitest-environment jsdom
// Fiche L01-T36 : écran N03 « Mes années comptables ».
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { n03 } from '../../../../../../packages/textes/src/ecrans/n03.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
let noeud: { fermer: () => void } | null = null;

beforeEach(() => {
  noeud = demarrerNoeud({ base: location.origin });
});
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  noeud?.fermer();
  noeud = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function monter(attente = 150): Promise<HTMLElement> {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  await act(async () => {
    racine?.render(
      <FournisseurDonnees client={client}>
        <Ecran />
      </FournisseurDonnees>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, attente));
  });
  return hote;
}

const lignes = (hote: HTMLElement) => Array.from(hote.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');

describe('écran N03', () => {
  it('affiche-les-deux-exercices', async () => {
    const hote = await monter();
    const l = lignes(hote);
    expect(l).toHaveLength(2);
    expect(l[0]).toContain('Exercice 2026');
    expect(l[0]).toContain('01/01/2026');
    expect(l[0]).toContain('31/12/2026');
    expect(l[0]).toContain(n03.etats.ouvert);
    expect(l[1]).toContain('Exercice 2025');
    expect(l[1]).toContain(n03.etats.cloture);
  });

  it('ordre-du-plus-recent', async () => {
    // Le serveur renvoie ici du plus ancien au plus récent : l'écran remet le plus récent en premier.
    const corps = {
      body: [
        { id: 'A', libelle: 'Année A', debut: '2023-01-01', fin: '2023-12-31', statut: 'cloture' },
        { id: 'C', libelle: 'Année C', debut: '2025-01-01', fin: '2025-12-31', statut: 'ouvert' },
        { id: 'B', libelle: 'Année B', debut: '2024-01-01', fin: '2024-12-31', statut: 'cloture' },
      ],
      decalage: 0,
      total: 3,
    };
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(corps)));
    const l = lignes(await monter());
    expect(l.map((t) => t.slice(0, 7))).toEqual(['Année C', 'Année B', 'Année A']);
  });

  it('etat-vide', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ body: [], decalage: 0, total: 0 })));
    const hote = await monter();
    expect(hote.textContent).toContain(n03.vide);
    expect(hote.querySelector('table')).toBeNull();
  });

  it('etat-erreur-403', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ code: 'FORBIDDEN' }, { status: 403 })));
    const hote = await monter();
    expect(hote.querySelector('[role="alert"]')?.textContent).toContain(n03.erreur.acces);
    expect(hote.querySelector('table')).toBeNull();
  });

  it('etat-erreur-reseau', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('coupé')));
    const hote = await monter();
    expect(hote.querySelector('[role="alert"]')?.textContent).toContain(n03.erreur.reseau);
  });

  it('date-illisible-sans-plantage', async () => {
    const corps = { body: [{ id: 'X', libelle: 'Année X', debut: 'pas-une-date', fin: '2024-12-31', statut: 'ouvert' }], decalage: 0, total: 1 };
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(corps)));
    const l = lignes(await monter());
    expect(l[0]).toContain('pas-une-date');
    expect(l[0]).toContain('31/12/2024');
  });

  it('titre-h1-unique', async () => {
    const hote = await monter();
    const h1 = hote.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(n03.titre);
  });

  it('route-declaree', () => {
    expect(route.id).toBe('n03');
    expect(route.chemin).toBe('/reglages/entreprise/annees');
    expect(route.groupe).toBe('reglages');
    expect(route.titre).toBe(n03.titre);
  });
});
