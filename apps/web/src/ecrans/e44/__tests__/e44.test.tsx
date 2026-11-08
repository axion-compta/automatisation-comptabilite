// @vitest-environment jsdom
// Fiche L01-T38 : écran E44 Mes clients et fournisseurs.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e44 } from '../../../../../../packages/textes/src/ecrans/e44.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { creerRouteur } from '../../../socle/routeur.js';
import { Ecran, cheminTiers } from '../Ecran.js';
import { route } from '../route.js';
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
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
async function monter(noeud?: ReactNode): Promise<void> {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(noeud ?? <FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const lignes = () => [...document.querySelectorAll('tbody tr')];
const onglet = (nom: string) => [...document.querySelectorAll<HTMLElement>('[role=tab]')].find((b) => b.textContent === nom)!;
const champ = () => document.querySelector<HTMLInputElement>('input[type=search]')!;
async function saisir(v: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(champ(), v);
    champ().dispatchEvent(new Event('input', { bubbles: true }));
  });
  await attendre();
}
async function touche(el: HTMLElement, key: string) {
  await act(async () => void el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
  await attendre();
}
const cliquer = async (el: Element) => (await act(async () => void (el as HTMLElement).click()), await attendre());
describe('E44', () => {
  it('affiche-les-douze-tiers', async () => {
    await monter();
    expect(document.querySelector('h1')?.textContent).toBe(e44.titre);
    expect(lignes()).toHaveLength(12);
    expect(document.body.textContent).toContain('@exemple.fr');
    expect(document.querySelectorAll('[role=tablist],[role=tabpanel]')).toHaveLength(2);
    expect(champ().getAttribute('aria-label')).toBe(e44.recherche.nom);
  });
  it('onglet-fournisseurs', async () => {
    await monter();
    await cliquer(onglet(e44.onglets.fournisseurs));
    expect(onglet(e44.onglets.fournisseurs).getAttribute('aria-selected')).toBe('true');
    expect(lignes()).toHaveLength(6);
    for (const l of lignes()) expect(l.textContent).toContain(e44.tableau.fournisseur);
    await cliquer(onglet(e44.onglets.clients));
    expect(lignes()).toHaveLength(6);
    for (const l of lignes()) expect(l.textContent).not.toContain(e44.tableau.fournisseur);
  });
  it('onglets-au-clavier', async () => {
    await monter();
    const choisi = () => [...document.querySelectorAll('[role=tab]')].findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const tab = (i: number) => document.querySelectorAll<HTMLElement>('[role=tab]')[i]!;
    expect([tab(0).tabIndex, tab(1).tabIndex, choisi()]).toEqual([0, -1, 0]);
    await touche(tab(0), 'ArrowRight');
    expect([choisi(), document.activeElement]).toEqual([1, tab(1)]);
    await touche(tab(1), 'ArrowLeft');
    expect(choisi()).toBe(0);
    await touche(tab(0), 'ArrowLeft'); // ordre inversé : dernier onglet
    expect(choisi()).toBe(2);
    await touche(tab(2), 'ArrowRight');
    expect(choisi()).toBe(0);
    await touche(tab(0), 'a');
    expect([choisi(), lignes().length]).toEqual([0, 12]);
  });
  it('recherche-par-nom', async () => {
    await monter();
    const nom = lignes()[0]!.querySelectorAll('td')[1]!.textContent!;
    await saisir(nom.toUpperCase());
    expect(lignes().length).toBeGreaterThan(0);
    expect(lignes().length).toBeLessThan(12);
    for (const l of lignes()) expect(l.textContent).toContain(nom);
    await saisir('  ' + nom + '  ');
    expect(lignes().length).toBeGreaterThan(0);
    await saisir('');
    expect(lignes()).toHaveLength(12);
  });
  it('etat-vide-recherche-sans-resultat', async () => {
    await monter();
    await saisir('zzzzzz-introuvable');
    expect(lignes()).toHaveLength(0);
    expect(document.body.textContent).toContain(e44.etats.videRecherche);
    expect(document.body.textContent).not.toContain(e44.etats.vide);
    expect(champ().value).toBe('zzzzzz-introuvable');
    await saisir('   ');
    expect(lignes()).toHaveLength(12);
  });
  it('etats-chargement-erreur-acces', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => undefined));
    await monter();
    expect(document.querySelector('[role=status]')?.textContent).toContain(e44.etats.chargement);
    expect(document.querySelector('[role=alert]')).toBeNull();
    act(() => racine?.unmount());
    for (const [statut, texte, autre] of [[403, e44.etats.acces, e44.etats.erreur], [500, e44.etats.erreur, e44.etats.acces]] as const) {
      vi.stubGlobal('fetch', () => Promise.resolve(Response.json({}, { status: statut })));
      await monter();
      expect(document.querySelector('[role=alert]')?.textContent).toContain(texte);
      expect(document.body.textContent).not.toContain(autre);
      expect(lignes()).toHaveLength(0);
      act(() => racine?.unmount());
    }
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('coupé')));
    await monter();
    expect(document.querySelector('[role=alert]')?.textContent).toContain(e44.etats.erreur);
  });
  it('page-remise-a-zero-au-changement-d-onglet', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (u: string) => {
      urls.push(String(u));
      return Promise.resolve(Response.json({ body: [{ code: 'T1', nom: 'Ma Société', type: 'client', email: 'a@exemple.fr' }], decalage: 0, total: 120 }));
    });
    await monter();
    await cliquer([...document.querySelectorAll('button')].find((b) => b.textContent === e44.pagination.suivant)!);
    expect(urls.at(-1)).toContain('decalage=50');
    await cliquer(onglet(e44.onglets.clients));
    expect(urls.at(-1)).toContain('type=client&limite=50&decalage=0');
  });
  it('un-seul-main-dans-la-coque', async () => {
    const routeur = creerRouteur([route], createMemoryHistory({ initialEntries: [route.chemin] }));
    await monter(<RouterProvider router={routeur} />);
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelector('main h1')?.textContent).toBe(e44.titre);
    expect(document.querySelector('section')?.getAttribute('aria-labelledby')).toBe(document.querySelector('h1')?.id);
  });
});
describe('cheminTiers', () => {
  it('construit-la-requete', () => {
    expect(cheminTiers('tous', '', 0)).toBe('/tiers?limite=50&decalage=0');
    expect(cheminTiers('client', ' Ab ', 50)).toBe('/tiers?type=client&q=Ab&limite=50&decalage=50');
    expect(cheminTiers('fournisseur', '   ', 0)).toBe('/tiers?type=fournisseur&limite=50&decalage=0');
    const q = new URL('http://x' + cheminTiers('tous', 'a'.repeat(80), 0)).searchParams.get('q');
    expect(q).toHaveLength(50);
    expect(cheminTiers('tous', 'a&b=c', 0)).toContain('q=a%26b%3Dc');
  });
  it('route-declaree', () => expect([route.id, route.chemin, route.groupe]).toEqual(['e44', '/reglages/entreprise/tiers', 'reglages']));
  it('e44-export-filtres-courants', async () => {
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const posts: unknown[] = [];
    vi.stubGlobal('fetch', (_u: string, init?: RequestInit) => {
      if (init?.method !== 'POST') return Promise.resolve(Response.json({ body: [], decalage: 0, total: 0 }));
      posts.push(JSON.parse(init.body as string));
      return Promise.resolve(Response.json({ body: { nom: 'x.csv', typeContenu: 'text/csv', octetsBase64: btoa('a;b'), nbLignes: 1, empreinte: 'a'.repeat(64) } }));
    });
    await monter();
    const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t)!;
    const exporter = async () => (await cliquer(bouton(e44.export.bouton)), await cliquer(bouton(e44.export.csv)));
    await cliquer(onglet(e44.onglets.fournisseurs));
    await saisir('  Zeta inventé  ');
    await exporter();
    expect(posts).toEqual([{ liste: 'listerTiers', format: 'csv', filtres: { type: 'fournisseur', q: 'Zeta inventé' } }]);
    await cliquer(onglet(e44.onglets.tous));
    await exporter();
    expect(posts[1]).toEqual({ liste: 'listerTiers', format: 'csv', filtres: { q: 'Zeta inventé' } });
  });
  it('e44-bouton-present', async () => {
    await monter();
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent === e44.export.bouton);
    expect(b).toBeDefined();
    expect(b?.closest('section')).toBe(document.querySelector('section'));
  });
});
