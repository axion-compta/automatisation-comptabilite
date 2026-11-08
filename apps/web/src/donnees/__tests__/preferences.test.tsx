// @vitest-environment jsdom
// Fiche L15-T56 : préférences mémorisées, copie locale, rejeu silencieux.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { FournisseurPreferences, usePreference } from '../preferences.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const COPIE = 'axion.preferences.v1';
const FILE = 'axion.preferences.file.v1';
let racine: Root | null = null;
let noeud: { fermer: () => void } | null = null;
let panne = false;
let appels: { methode: string; url: string; cle: string | null; corps: string }[] = [];
let ecrireMenu: (v: string) => void = () => undefined;

beforeEach(() => {
  localStorage.clear();
  panne = false; appels = [];
  noeud = demarrerNoeud({ base: location.origin });
  const reel = globalThis.fetch;
  vi.stubGlobal('fetch', (entree: RequestInfo | URL, init: RequestInit = {}) => {
    const h = new Headers(init.headers);
    appels.push({ methode: init.method ?? 'GET', url: String(entree), cle: h.get('idempotency-key'), corps: String(init.body ?? '') });
    if (panne) h.set('x-panne', 'reseau');
    return reel(entree, { ...init, headers: h });
  });
});
afterEach(() => {
  act(() => racine?.unmount());
  racine = null; noeud?.fermer(); document.body.innerHTML = ''; vi.unstubAllGlobals();
});
function Sonde() {
  const [menu, ecrire] = usePreference<string>('menu_etat');
  ecrireMenu = ecrire;
  return <span id="menu">{menu ?? 'aucune'}</span>;
}
const attendre = (ms = 150) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
async function monter(): Promise<void> {
  act(() => racine?.unmount());
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurPreferences><Sonde /></FournisseurPreferences>));
  await attendre();
}
const menu = () => document.getElementById('menu')?.textContent;
const puts = () => appels.filter((a) => a.methode === 'PUT');
const file = (): Record<string, unknown>[] => JSON.parse(localStorage.getItem(FILE) ?? '[]');
const ecrire = (v: string) => act(async () => ecrireMenu(v));
const online = () => act(async () => void window.dispatchEvent(new Event('online')));
const serveurAvec = (valeur: string) =>
  fetch('/preferences/menu_etat', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-initiale-' + valeur },
    body: JSON.stringify({ valeur, appareil: 'bureau' }),
  });
describe('préférences', () => {
  it('lecture-serveur-au-montage', async () => {
    await serveurAvec('reduit');
    appels = [];
    await monter();
    expect(appels[0]).toMatchObject({ methode: 'GET', url: expect.stringContaining('/preferences?appareil=bureau') });
    expect(menu()).toBe('reduit');
    expect(JSON.parse(localStorage.getItem(COPIE) ?? '{}').bureau.menu_etat).toBe('reduit');
  });
  it('copie-locale-si-serveur-injoignable', async () => {
    localStorage.setItem(COPIE, JSON.stringify({ bureau: { menu_etat: 'reduit' } }));
    panne = true; await monter();
    expect(menu()).toBe('reduit');
  });
  it('aucun-message-d-erreur', async () => {
    panne = true; await monter();
    await ecrire('reduit'); await attendre();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.body.textContent).toBe('reduit');
  });
  it('ecriture-mise-en-file-si-panne', async () => {
    panne = true; await monter();
    await ecrire('reduit');
    expect(menu()).toBe('reduit');
    expect(file()).toHaveLength(1);
    expect(file()[0]).toMatchObject({ cle: 'menu_etat', valeur: 'reduit', appareil: 'bureau' });
    expect(String(file()[0]?.idempotencyKey).length).toBeGreaterThanOrEqual(8); expect(typeof file()[0]?.modifieLeClient).toBe('number');
  });
  it('rejeu-au-retour-dans-l-ordre', async () => {
    panne = true; await monter();
    await ecrire('reduit'); await ecrire('ouvert');
    const attendues = file().map((e) => e.idempotencyKey);
    expect(attendues).toHaveLength(2);
    appels = []; panne = false;
    await online(); await attendre();
    expect(puts().map((p) => p.cle)).toEqual(attendues);
    expect(puts().map((p) => JSON.parse(p.corps).valeur)).toEqual(['reduit', 'ouvert']);
    expect(file()).toEqual([]);
    await monter();
    expect(menu()).toBe('ouvert');
  });
  it('rejeu-une-seule-fois', async () => {
    panne = true; await monter();
    await ecrire('reduit');
    const cle = file()[0]?.idempotencyKey;
    appels = []; panne = false;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });
    await attendre(); await online(); await attendre(); await monter();
    expect(puts().filter((p) => p.cle === cle)).toHaveLength(1);
  });
  it('copie-corrompue-ignoree', async () => {
    panne = true;
    for (const brut of ['{pas du json', JSON.stringify({ bureau: { menu_etat: 'inconnu', cle_inconnue: 'x' } }), JSON.stringify([1, 2])]) {
      localStorage.setItem(COPIE, brut);
      await monter();
      expect(menu()).toBe('aucune');
    }
  });
  it('appareil-mobile-ou-bureau', async () => {
    for (const [mobile, attendu] of [[true, 'mobile'], [false, 'bureau']] as const) {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: mobile && q.includes('max-width'), media: q }));
      appels = []; await monter();
      expect(appels[0]?.url).toContain('appareil=' + attendu);
      await ecrire('reduit');
      await attendre();
      expect(JSON.parse(puts()[0]?.corps ?? '{}').appareil).toBe(attendu);
    }
  });
});
