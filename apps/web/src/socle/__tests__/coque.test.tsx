// @vitest-environment jsdom
// Fiche L01-T33 : coque (menu de bureau, barre du bas, Discuter).
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ouvrirPalette } from '../../commandes/Palette.js';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { BARRE_MOBILE, LIBELLES_MENU, MENU_BUREAU, MENU_PLUS } from '../menu.js';
import { route as routeM04 } from '../../ecrans/m04/route.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

async function afficher(url: string): Promise<HTMLElement> {
  const routeur = creerRouteur([routeM04], createMemoryHistory({ initialEntries: [url] }));
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
const discuter = (h: HTMLElement): Element => [...h.querySelectorAll('.barre-discuter')].find((b) => b.textContent === socle.discuter) as Element;
const bascule = (h: HTMLElement): HTMLButtonElement => h.querySelector('.colonne-bascule') as HTMLButtonElement;
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

  it('discuter-ouvre-m04', async () => {
    const h = await afficher('/');
    expect(h.querySelector('.m04-plein-ecran')).toBeNull();
    cliquer(discuter(h));
    await act(async () => {});
    expect(h.querySelector('.m04-plein-ecran')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ctrl-k-ouvre-toujours-la-palette', async () => {
    await afficher('/');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('colonne-visible-sur-bureau', async () => {
    const h = await afficher('/');
    const col = h.querySelector('aside.colonne-discussion') as Element;
    expect(col.querySelector('section.axion-discussion')).not.toBeNull();
    expect(bascule(h).getAttribute('aria-expanded')).toBe('true');
    expect((h.querySelector('#colonne-discussion-corps') as HTMLElement).hidden).toBe(false);
  });

  it('pas-de-colonne-sur-l-ecran-d-essai', async () => {
    const h = await afficher('/essai');
    expect(h.querySelector('aside.colonne-discussion')).toBeNull();
    expect(h.querySelectorAll('main').length).toBe(1);
  });

  it('colonne-repliable-au-clavier', async () => {
    const h = await afficher('/');
    const b = bascule(h);
    expect(b.tagName).toBe('BUTTON');
    b.focus();
    expect(document.activeElement).toBe(b);
    cliquer(b);
    expect(bascule(h).getAttribute('aria-expanded')).toBe('false');
    expect((h.querySelector('#colonne-discussion-corps') as HTMLElement).hidden).toBe(true);
    cliquer(bascule(h));
    expect(bascule(h).getAttribute('aria-expanded')).toBe('true');
  });

  it('etat-replie-memorise', async () => {
    const ecritureLocale = vi.spyOn(Storage.prototype, 'setItem');
    try {
      const h = await afficher('/');
      cliquer(bascule(h));
      expect(bascule(h).getAttribute('aria-expanded')).toBe('false');
      cliquer(bascule(h));
      expect(bascule(h).getAttribute('aria-expanded')).toBe('true');
      expect(ecritureLocale).not.toHaveBeenCalled();
      expect(window.localStorage.length).toBe(0);
      expect(window.sessionStorage.length).toBe(0);
    } finally {
      ecritureLocale.mockRestore();
    }
  });

  it('stockage-indisponible-sans-plantage', async () => {
    const lecture = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    const ecriture = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    try {
      const h = await afficher('/');
      expect(bascule(h).getAttribute('aria-expanded')).toBe('true');
      cliquer(bascule(h));
      expect(bascule(h).getAttribute('aria-expanded')).toBe('false');
    } finally {
      lecture.mockRestore();
      ecriture.mockRestore();
    }
  });

  it('un-seul-main', async () => {
    for (const url of ['/', '/discussion']) {
      const h = await afficher(url);
      expect(h.querySelectorAll('main')).toHaveLength(1);
      act(() => racine?.unmount());
      document.body.innerHTML = '';
    }
  });

  it('palette-navigue-par-le-routeur', async () => {
    const h = await afficher('/');
    act(() => ouvrirPalette());
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
