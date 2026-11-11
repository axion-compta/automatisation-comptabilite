// @vitest-environment jsdom
// Fiche L09-T42 : écran E45, modifier un champ, voir l'effet puis confirmer (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e45 } from '../../../../../../packages/textes/src/ecrans/e45.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const m = e45.modification;
const [APERCU, CONFIRMATION] = ['/profil/changements/apercu', '/profil/changements'];
let noeud: { fermer: () => void };
let racine: Root | null = null;
beforeEach(() => void (noeud = demarrerNoeud({ base: location.origin })));
afterEach(() => {
  act(() => racine?.unmount());
  noeud.fermer();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const pause = (ms = 300) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const bouton = (h: HTMLElement, t: string) => [...h.querySelectorAll('button')].find((b) => b.textContent === t);
const clic = () => new MouseEvent('click', { bubbles: true });
const cliquer = async (b: Element | undefined, ms = 300) => (await act(async () => void b?.dispatchEvent(clic())), await pause(ms));
const alerte = (h: HTMLElement) => h.querySelector('[role=alert]');
async function monter(): Promise<HTMLElement> {
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await pause();
  return hote;
}
async function saisir(champ: HTMLInputElement | undefined, valeur: string) {
  const ecrire = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => (ecrire.call(champ, valeur), champ?.dispatchEvent(new Event('input', { bubbles: true }))));
}
async function remplir(h: HTMLElement, valeur = 'reel_normal', date = '2026-08-01') {
  if (!h.querySelector('input')) {
    const ligne = [...h.querySelectorAll('div')].find((x) => x.textContent?.includes(e45.champs.regime_tva) && x.querySelector(':scope > button'));
    await cliquer(ligne?.querySelector(':scope > button') ?? undefined, 20);
  }
  const champs = [...h.querySelectorAll('input')];
  await saisir(champs[0], valeur);
  await saisir(champs[1], date);
}
const voirEffet = async (h: HTMLElement, valeur?: string, date?: string, ms?: number) => (await remplir(h, valeur, date), await cliquer(bouton(h, e45.boutons.voirEffet), ms));
type Appel = { methode: string; url: string; cle: string | null };
function espion(reponse?: (url: string, n: number) => Response | undefined): Appel[] {
  const appels: Appel[] = [];
  const reel = globalThis.fetch;
  vi.stubGlobal('fetch', async (e: RequestInfo | URL, init?: RequestInit) => {
    const [methode, url] = [init?.method ?? 'GET', new URL(String(e), location.origin).pathname];
    appels.push({ methode, url, cle: new Headers(init?.headers).get('idempotency-key') });
    const n = appels.filter((a) => a.methode === 'POST' && a.url === url).length;
    return (methode === 'POST' ? reponse?.(url, n) : undefined) ?? reel(e, init);
  });
  return appels;
}
const ecritures = (a: Appel[], url: string) => a.filter((x) => x.methode === 'POST' && x.url === url);

describe('écran E45, modification', () => {
  it('apercu-avant-confirmation', async () => {
    const appels = espion();
    const h = await monter();
    await remplir(h);
    expect(bouton(h, e45.boutons.confirmer)).toBeUndefined();
    await cliquer(bouton(h, e45.boutons.voirEffet));
    const apercu = h.querySelector(`ul[aria-label="${e45.boutons.voirEffet}"]`)!;
    expect(apercu.textContent).toContain(m.aucuneEcriture);
    expect(apercu.textContent).toMatch(new RegExp(m.brouillons + ' : \\d'));
    expect(apercu.textContent).toContain(m.periode + ' 2026-07-01');
    expect(bouton(h, e45.boutons.confirmer)).toBeDefined();
    expect([ecritures(appels, APERCU).length, ecritures(appels, CONFIRMATION).length]).toEqual([1, 0]);
  });

  it('rien-sans-confirmer', async () => {
    const h = await monter();
    const avant = await (await fetch('/profil')).text();
    const appels = espion();
    await voirEffet(h);
    await cliquer(bouton(h, m.fermer), 20);
    expect(h.querySelector('input')).toBeNull();
    expect(ecritures(appels, CONFIRMATION)).toHaveLength(0);
    expect(await (await fetch('/profil')).text()).toBe(avant);
  });

  it('confirmation-met-a-jour-l-ecran', async () => {
    const h = await monter();
    const appels = espion();
    await voirEffet(h);
    await cliquer(bouton(h, e45.boutons.confirmer));
    expect(ecritures(appels, CONFIRMATION)).toHaveLength(1);
    expect(h.textContent).toContain(m.enregistre);
    expect(bouton(h, e45.boutons.confirmer)).toBeUndefined();
    expect(appels.filter((a) => a.methode === 'GET' && a.url === '/profil').length).toBeGreaterThan(0);
  });

  it('periode-deposee-message', async () => {
    const h = await monter();
    await voirEffet(h, 'reel_normal', '2026-02-01');
    expect(alerte(h)?.textContent).toBe(m.erreurs.PERIODE_DEPOSEE);
    expect(bouton(h, e45.boutons.confirmer)).toBeUndefined();
  });

  it('apercu-perime-redemande', async () => {
    const appels = espion((url, n) => (url === CONFIRMATION && n === 1 ? Response.json({ code: 'APERCU_PERIME' }, { status: 409 }) : undefined));
    const h = await monter();
    await voirEffet(h);
    await cliquer(bouton(h, e45.boutons.confirmer));
    const [a, b] = ecritures(appels, APERCU);
    expect([ecritures(appels, APERCU).length, a?.cle === b?.cle]).toEqual([2, false]);
    expect(h.textContent).toContain(m.perime);
    expect(h.textContent).not.toContain(m.enregistre);
    await cliquer(bouton(h, e45.boutons.confirmer));
    expect(h.textContent).toContain(m.enregistre);
  });

  it('pas-de-double-envoi', async () => {
    const appels = espion();
    const h = await monter();
    await remplir(h);
    const deux = async (b: Element | undefined) => (await act(async () => void (b?.dispatchEvent(clic()), b?.dispatchEvent(clic()))), await pause());
    await deux(bouton(h, e45.boutons.voirEffet));
    expect(ecritures(appels, APERCU)).toHaveLength(1);
    await deux(bouton(h, e45.boutons.confirmer));
    expect(ecritures(appels, CONFIRMATION)).toHaveLength(1);
  });

  it('date-d-effet-invalide-refusee-avant-envoi', async () => {
    const appels = espion();
    const h = await monter();
    for (const date of ['2026-02-30', '', '2026-13-01', '01/08/2026']) {
      await voirEffet(h, 'reel_normal', date, 20);
      expect(alerte(h)?.textContent).toBe(m.dateInvalide);
    }
    await voirEffet(h, '  ', '2026-08-01', 20);
    expect(alerte(h)?.textContent).toBe(m.valeurVide);
    expect(appels.filter((a) => a.methode === 'POST')).toHaveLength(0);
  });

  it('focus-sur-le-message-d-erreur', async () => {
    const h = await monter();
    await voirEffet(h, 'reel_normal', 'pas une date', 20);
    expect(alerte(h)?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(alerte(h));
  });
});
