// @vitest-environment jsdom
// Fiche L01-T38 : écran E44 Mes clients et fournisseurs.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e44 } from '../../../../../../packages/textes/src/ecrans/e44.js';
import { FournisseurDonnees } from '../../../donnees/lecture.js';
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
});

const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));

async function monter(): Promise<void> {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees><Ecran /></FournisseurDonnees>));
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
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
  await attendre();
}

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
    await act(async () => onglet(e44.onglets.fournisseurs).click());
    await attendre();
    expect(onglet(e44.onglets.fournisseurs).getAttribute('aria-selected')).toBe('true');
    expect(lignes()).toHaveLength(6);
    for (const l of lignes()) expect(l.textContent).toContain(e44.tableau.fournisseur);
    await act(async () => onglet(e44.onglets.clients).click());
    await attendre();
    expect(lignes()).toHaveLength(6);
    for (const l of lignes()) expect(l.textContent).not.toContain(e44.tableau.fournisseur);
  });

  it('onglets-au-clavier', async () => {
    await monter();
    const tous = onglet(e44.onglets.tous);
    expect(tous.tabIndex).toBe(0);
    expect(onglet(e44.onglets.clients).tabIndex).toBe(-1);
    await touche(tous, 'ArrowRight');
    expect(onglet(e44.onglets.clients).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(onglet(e44.onglets.clients));
    await touche(onglet(e44.onglets.clients), 'ArrowLeft');
    expect(tous.getAttribute('aria-selected')).toBe('true');
    // ordre inversé : depuis le premier, flèche gauche = dernier onglet
    await touche(tous, 'ArrowLeft');
    expect(onglet(e44.onglets.fournisseurs).getAttribute('aria-selected')).toBe('true');
    await touche(onglet(e44.onglets.fournisseurs), 'ArrowRight');
    expect(tous.getAttribute('aria-selected')).toBe('true');
    await touche(tous, 'a');
    expect(lignes()).toHaveLength(12);
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
  it('route-declaree', () => {
    expect([route.id, route.chemin, route.groupe]).toEqual(['e44', '/reglages/entreprise/tiers', 'reglages']);
  });
});
