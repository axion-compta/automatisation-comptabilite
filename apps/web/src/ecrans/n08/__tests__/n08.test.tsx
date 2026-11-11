// @vitest-environment jsdom
// Fiche L15-T54 : écran N08 « Chercher ou demander ».
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { n08 } from '../../../../../../packages/textes/src/ecrans/n08.js';
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
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

type R = { type: string; id: string; titre: string; extrait: string; lien: string };
const res = (type: string, id: string, extrait = 'texte'): R => ({ type, id, titre: `Titre ${id}`, extrait, lien: `/${type}/${id}` });
const complet = (r: R) => ({ ...r, date: '2026-01-01', exerciceId: null, score: 1 });

/** Faux fetch : renvoie les pages données dans l'ordre et note chaque appel. */
function simuler(pages: Array<{ resultats: R[]; curseurSuivant?: string; mot?: 'rien_trouve' }>) {
  const appels: Array<{ url: string; corps: unknown }> = [];
  let i = 0;
  vi.stubGlobal('fetch', (url: string, init?: { body?: string }) => {
    appels.push({ url: String(url), corps: init?.body ? JSON.parse(init.body) : undefined });
    const p = pages[Math.min(i++, pages.length - 1)];
    return Promise.resolve(Response.json({ body: { ...p, resultats: p?.resultats.map(complet) } }));
  });
  return appels;
}

async function monter(): Promise<HTMLElement> {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(<Ecran />);
  });
  return hote;
}

async function chercher(hote: HTMLElement, texte: string) {
  const champ = hote.querySelector('input') as HTMLInputElement;
  const valeur = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    valeur?.call(champ, texte);
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    (hote.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe('écran N08', () => {
  it('script-reste-du-texte', async () => {
    simuler([{ resultats: [res('piece', 'p1', '<script>alert(1)</script> et <img src=x onerror=alert(1)>')] }]);
    const hote = await monter();
    await chercher(hote, 'facture');
    expect(hote.querySelector('script')).toBeNull();
    expect(hote.querySelector('img')).toBeNull();
    expect(hote.textContent).toContain('<script>alert(1)</script>');
  });

  it('seul-mark-est-une-balise', async () => {
    simuler([{ resultats: [res('piece', 'p1', 'une <mark>facture</mark> <b>grasse</b> fin')] }]);
    const hote = await monter();
    await chercher(hote, 'facture');
    const marks = hote.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('facture');
    expect(hote.querySelector('b')).toBeNull();
    expect(hote.textContent).toContain('<b>grasse</b>');
  });

  it('entites-decodees-une-fois', async () => {
    simuler([{ resultats: [res('piece', 'p1', 'a &amp;lt; b &amp; c &lt;d&gt; &quot;e&quot; &#39;f&#39;')] }]);
    const hote = await monter();
    await chercher(hote, 'facture');
    expect(hote.textContent).toContain('a &lt; b & c <d> "e" \'f\'');
  });

  it('moins-de-deux-caracteres-aucun-appel', async () => {
    const appels = simuler([{ resultats: [] }]);
    const hote = await monter();
    await chercher(hote, 'a');
    expect(appels).toHaveLength(0);
    expect(hote.textContent).toContain(n08.trop_court);
  });

  it('groupes-par-type', async () => {
    simuler([{ resultats: [res('tiers', 't1'), res('piece', 'p1'), res('piece', 'p2'), res('commentaire', 'c1'), res('ecriture', 'e1')] }]);
    const hote = await monter();
    await chercher(hote, 'titre');
    const titres = Array.from(hote.querySelectorAll('h2')).map((h) => h.textContent);
    expect(titres).toEqual([n08.groupes.piece, n08.groupes.ecriture, n08.groupes.tiers, n08.groupes.commentaire]);
    const liens = Array.from(hote.querySelectorAll('section section')[0]?.querySelectorAll('a') ?? []).map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/piece/p1', '/piece/p2']);
  });

  it('rien-trouve', async () => {
    simuler([{ resultats: [], mot: 'rien_trouve' }]);
    const hote = await monter();
    await chercher(hote, 'zzzz');
    expect(hote.textContent).toContain(n08.rien_trouve);
    expect(hote.querySelector('h2')).toBeNull();
  });

  it('voir-plus-par-curseur', async () => {
    const appels = simuler([
      { resultats: [res('piece', 'p1')], curseurSuivant: 'CUR1' },
      { resultats: [res('piece', 'p2')] },
    ]);
    const hote = await monter();
    await chercher(hote, 'titre');
    const bouton = Array.from(hote.querySelectorAll('button')).find((b) => b.textContent === n08.voirPlus);
    expect(bouton).toBeDefined();
    await act(async () => {
      bouton?.click();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(appels[1]?.corps).toEqual({ q: 'titre', curseur: 'CUR1' });
    expect(hote.querySelectorAll('li')).toHaveLength(2);
    expect(Array.from(hote.querySelectorAll('button')).some((b) => b.textContent === n08.voirPlus)).toBe(false);
  });

  it('texte-absent-de-l-url', async () => {
    const appels = simuler([{ resultats: [res('piece', 'p1')] }]);
    const hote = await monter();
    await chercher(hote, 'secretmot');
    expect(appels[0]?.url).not.toContain('secretmot');
    expect(appels[0]?.corps).toEqual({ q: 'secretmot' });
    expect(location.href).not.toContain('secretmot');
  });

  it('annonce-du-nombre-de-resultats', async () => {
    simuler([{ resultats: [res('piece', 'p1'), res('tiers', 't1'), res('tiers', 't2')] }]);
    const hote = await monter();
    await chercher(hote, 'titre');
    const zone = hote.querySelector('[aria-live="polite"]');
    expect(zone?.textContent).toBe('3 résultats');
  });

  it('route-declaree', () => {
    expect(route.id).toBe('n08');
    expect(route.chemin).toBe('/recherche');
  });
});
