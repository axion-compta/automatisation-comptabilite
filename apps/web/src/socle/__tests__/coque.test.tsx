// @vitest-environment jsdom
// Fiche L01-T33 : coque (menu de bureau, barre du bas, Discuter).
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { BARRE_MOBILE, LIBELLES_MENU, MENU_BUREAU, MENU_PLUS } from '../menu.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

async function afficher(url: string): Promise<HTMLElement> {
  const routeur = creerRouteur([], createMemoryHistory({ initialEntries: [url] }));
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(<RouterProvider router={routeur} />);
  });
  return hote;
}
const texte = (els: Iterable<Element>): (string | null)[] => [...els].map((e) => e.textContent);
const bureau = (h: HTMLElement): Element => h.querySelector('nav.menu-bureau') as Element;
const barre = (h: HTMLElement): Element => h.querySelector('.barre-mobile nav') as Element;
const boutonPlus = (h: HTMLElement): HTMLButtonElement => barre(h).querySelector('button') as HTMLButtonElement;
const cliquer = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

describe('coque', () => {
  it('menu-bureau-six-entrees-dans-l-ordre', async () => {
    const h = await afficher('/');
    expect(bureau(h).getAttribute('aria-label')).toBe(socle.navigation.titre);
    const liens = [...bureau(h).querySelectorAll('a')];
    expect(texte(liens)).toEqual(['Mon activité', 'Mon mois', 'Ma banque', 'Mes factures', 'Mes déclarations', 'Mes documents']);
    expect(liens.map((l) => l.getAttribute('href'))).toEqual(['/activite', '/mois', '/banque', '/factures', '/declarations', '/documents']);
  });

  it('aria-current-sur-la-page-active', async () => {
    const h = await afficher('/banque');
    const actifs = [...bureau(h).querySelectorAll('[aria-current="page"]')];
    expect(texte(actifs)).toEqual(['Ma banque']);
  });

  it('aria-current-sur-le-parent-d-une-sous-page', async () => {
    const h = await afficher('/declarations/tva');
    expect(texte(bureau(h).querySelectorAll('[aria-current="page"]'))).toEqual(['Mes déclarations']);
  });

  it('aria-current-absent-hors-menu', async () => {
    const h = await afficher('/');
    expect(h.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('banquet-n-active-pas-banque', async () => {
    const h = await afficher('/banquet');
    expect(h.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('barre-cinq-entrees', async () => {
    const h = await afficher('/');
    const items = [...barre(h).querySelectorAll('a, button')];
    expect(texte(items)).toEqual(['Mon activité', 'Mon mois', 'Ma banque', 'Mes documents', 'Plus']);
    expect(boutonPlus(h).getAttribute('aria-expanded')).toBe('false');
    expect(h.querySelector('#barre-plus')).toBeNull();
  });

  it('plus-ouvre-factures-declarations-reglages', async () => {
    const h = await afficher('/');
    cliquer(boutonPlus(h));
    expect(boutonPlus(h).getAttribute('aria-expanded')).toBe('true');
    const liens = [...(h.querySelector('#barre-plus') as Element).querySelectorAll('a')];
    expect(texte(liens)).toEqual(['Mes factures', 'Mes déclarations', 'Réglages']);
    expect(liens.map((l) => l.getAttribute('href'))).toEqual(['/factures', '/declarations', '/reglages']);
    cliquer(boutonPlus(h));
    expect(boutonPlus(h).getAttribute('aria-expanded')).toBe('false');
    expect(h.querySelector('#barre-plus')).toBeNull();
  });

  it('discuter-ouvre-la-palette', async () => {
    const h = await afficher('/');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const discuter = [...h.querySelectorAll('button')].find((b) => b.textContent === socle.discuter);
    expect(discuter).toBeDefined();
    cliquer(discuter as Element);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('palette-navigue-par-le-routeur', async () => {
    const h = await afficher('/');
    const discuter = [...h.querySelectorAll('button')].find((b) => b.textContent === socle.discuter);
    cliquer(discuter as Element);
    const choix = [...document.querySelectorAll('[role="dialog"] li button')].find((b) => b.textContent === 'Ma banque');
    cliquer(choix as Element);
    await act(async () => {});
    expect(texte(bureau(h).querySelectorAll('[aria-current="page"]'))).toEqual(['Ma banque']);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('menu-une-seule-source', async () => {
    const h = await afficher('/');
    cliquer(boutonPlus(h));
    const rendus = [...h.querySelectorAll('nav a, nav button, .barre-plus a, .barre-discuter')].map((e) => e.textContent ?? '');
    expect(rendus.length).toBe(MENU_BUREAU.length + BARRE_MOBILE.length + 1 + MENU_PLUS.length + 1);
    for (const r of rendus) expect(LIBELLES_MENU).toContain(r);
    expect(new Set(MENU_BUREAU.map((e) => e.id)).size).toBe(MENU_BUREAU.length);
  });
});
