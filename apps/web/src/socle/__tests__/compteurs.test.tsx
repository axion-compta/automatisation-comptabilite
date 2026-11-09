// @vitest-environment jsdom
// Fiche L15-T53 : compteurs et « ! » sur les entrées du menu, bouton de la cloche.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { t08 } from '../../../../../packages/textes/src/ecrans/t08.js';
import { route as routeM04 } from '../../ecrans/m04/route.js';
import { libelleCompteur } from '../Compteur.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type C = { ouvertes: number; urgentes: number; pointExclamation: boolean };
let serveur: { fermer: () => void };
let racine: Root | null = null;
beforeEach(() => void (serveur = demarrerNoeud()));
afterEach(() => (serveur.fermer(), act(() => racine?.unmount()), (document.body.innerHTML = ''), vi.unstubAllGlobals()));

/** Les compteurs sont servis par un faux fetch ; `null` simule une panne. */
async function monter(parEntree: Record<string, C> | null): Promise<HTMLElement> {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', async (u: string, o: RequestInit = {}) => {
    if (!String(u).includes('/compteurs')) return vrai(u, o);
    if (parEntree === null) return new Response('{}', { status: 500 });
    return Response.json({ body: { parEntree, alertesDuJour: { cartes: [], urgentesTotal: 0 } } });
  });
  const routeur = creerRouteur([routeM04], createMemoryHistory({ initialEntries: ['/'] }));
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => racine?.render(<RouterProvider router={routeur} />));
  await act(async () => void (await new Promise((r) => setTimeout(r, 400))));
  return hote;
}
const lien = (h: HTMLElement, zone: string, nom: string) => [...h.querySelectorAll(zone + ' a')].find((a) => a.textContent?.includes(nom)) as Element;
const cloche = (h: HTMLElement) => [...h.querySelectorAll('button')].find((b) => b.textContent === socle.cloche) as HTMLButtonElement;
const cliquer = async (el: Element) => void (await act(async () => void el.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
const trois: C = { ouvertes: 3, urgentes: 1, pointExclamation: true };

describe('compteurs de la coque', () => {
  it('compteur-par-entree', async () => {
    const h = await monter({ banque: trois, factures: { ouvertes: 2, urgentes: 0, pointExclamation: false } });
    for (const zone of ['nav.menu-bureau', '.barre-mobile nav']) {
      expect(lien(h, zone, 'Ma banque').querySelector('.compteur__nombre')?.textContent).toBe('3');
      expect(lien(h, zone, 'Mon mois').querySelector('.compteur')).toBeNull();
    }
    expect(lien(h, 'nav.menu-bureau', 'Mes factures').querySelector('.compteur__nombre')?.textContent).toBe('2');
  });

  it('point-exclamation-si-urgent', async () => {
    const h = await monter({ banque: trois, factures: { ouvertes: 2, urgentes: 0, pointExclamation: false } });
    expect(lien(h, 'nav.menu-bureau', 'Ma banque').querySelector('.compteur__alerte')?.textContent).toBe('!');
    expect(lien(h, 'nav.menu-bureau', 'Mes factures').querySelector('.compteur__alerte')).toBeNull();
  });

  it('rien-a-zero', async () => {
    const h = await monter({ banque: { ouvertes: 0, urgentes: 0, pointExclamation: false } });
    expect(h.querySelectorAll('.compteur')).toHaveLength(0);
  });

  it('libelle-accessible-complet', async () => {
    const h = await monter({ banque: trois, factures: { ouvertes: 1, urgentes: 0, pointExclamation: false }, mois: { ouvertes: 4, urgentes: 2, pointExclamation: true } });
    expect(lien(h, 'nav.menu-bureau', 'Ma banque').querySelector('.compteur')?.getAttribute('aria-label')).toBe('3 alertes, dont une urgente');
    expect(lien(h, 'nav.menu-bureau', 'Mes factures').querySelector('.compteur')?.getAttribute('aria-label')).toBe('1 alerte');
    expect(lien(h, 'nav.menu-bureau', 'Mon mois').querySelector('.compteur')?.getAttribute('aria-label')).toBe('4 alertes, dont 2 urgentes');
    expect(libelleCompteur({ ouvertes: 2, urgentes: 0, pointExclamation: true })).toBe('2 alertes' + socle.compteur.prioritaire);
  });

  it('cloche-s-ouvre-et-se-ferme', async () => {
    const h = await monter({});
    expect(document.querySelector('.cloche')).toBeNull();
    await cliquer(cloche(h));
    expect(document.querySelector('.cloche')).not.toBeNull();
    expect(cloche(h).getAttribute('aria-expanded')).toBe('true');
    await cliquer([...document.querySelectorAll('.cloche button')].find((b) => b.textContent === t08.fermer) as Element);
    expect(document.querySelector('.cloche')).toBeNull();
    expect(cloche(h).getAttribute('aria-expanded')).toBe('false');
  });

  it('evenement-ouvrir-cloche', async () => {
    await monter({});
    act(() => void window.dispatchEvent(new Event('ouvrir-cloche')));
    expect(document.querySelector('.cloche')).not.toBeNull();
  });

  it('compteurs-en-panne-coque-intacte', async () => {
    const h = await monter(null);
    expect(h.querySelectorAll('nav.menu-bureau a')).toHaveLength(6);
    expect(h.querySelectorAll('.compteur')).toHaveLength(0);
    expect(h.textContent).not.toMatch(/erreur|impossible/i);
  });
});
