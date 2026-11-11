// @vitest-environment jsdom
// Fiche L04-T40 : écran E07 « Mes documents ».
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { genererPieces } from '../../../../../../packages/donnees-fictives/src/pieces.js';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e07 } from '../../../../../../packages/textes/src/ecrans/e07.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
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
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const lignes = () => [...document.querySelectorAll('tbody tr')];
const champ = (nom: string) => [...document.querySelectorAll('label')].find((l) => l.textContent?.startsWith(nom))!.querySelector('input,select') as HTMLInputElement;
function saisir(c: HTMLInputElement, valeur: string) {
  const proto = c instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(c, valeur);
  c.dispatchEvent(new Event(c instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}
async function rechercher(nom: string, valeur: string) {
  await act(async () => saisir(champ(nom), valeur));
  await act(async () => void document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await attendre();
}
const pieces = genererPieces().pieces;

describe('E07', () => {
  it('affiche-les-pieces-triees', async () => {
    await monter();
    expect(route).toMatchObject({ id: 'e07', chemin: '/documents', groupe: 'menu' });
    expect(document.querySelector('h1')?.textContent).toBe(e07.titre);
    const noms = lignes().map((l) => l.querySelector('a')!.textContent!);
    expect(noms).toHaveLength(pieces.length);
    const dates = noms.map((n) => n.slice(0, 10));
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(dates).size).toBeGreaterThan(1);
    expect(lignes()[0]?.querySelector('a')?.getAttribute('href')).toMatch(/^\/documents\/piece\?id=piece-\d{3}$/);
    expect(document.body.textContent).toContain(e07.prepare);
  });
  it('filtre-par-etat', async () => {
    await monter();
    await rechercher(e07.filtres.etat, 'prete');
    const attendu = pieces.filter((p) => p.etat === 'prete').length;
    expect(attendu).toBeGreaterThan(0);
    expect(lignes()).toHaveLength(attendu);
  });
  it('recherche-fournisseur-sans-accent', async () => {
    await monter();
    await rechercher(e07.filtres.fournisseur, 'résto');
    const attendu = pieces.filter((p) => p.champs.some((c) => c.nom === 'fournisseur_nom' && c.valeur.startsWith('RESTO'))).length;
    expect(attendu).toBeGreaterThan(0);
    expect(lignes()).toHaveLength(attendu);
  });
  it('non-comptee-marquee', async () => {
    await monter();
    const lignesNon = lignes().filter((l) => l.textContent?.includes(e07.tableau.nonComptee));
    expect(lignesNon).toHaveLength(pieces.filter((p) => !p.comptee).length);
    expect(lignesNon.length).toBeGreaterThan(0);
    for (const l of lignesNon) expect(l.textContent).toMatch(/non comptée \(.+\)/);
  });
  it('sensible-protegee', async () => {
    await monter();
    const sensibles = pieces.filter((p) => p.sensible);
    expect(sensibles.length).toBeGreaterThan(0);
    const protegees = lignes().filter((l) => l.textContent?.includes(e07.tableau.protegee));
    expect(protegees).toHaveLength(sensibles.length);
    for (const l of protegees) expect(l.querySelectorAll('td')[1]?.textContent).toBe(e07.tableau.protegee);
  });
  it('aucun-pourcentage-affiche', async () => {
    await monter();
    expect(lignes().length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('%');
    expect(document.querySelectorAll('tbody .axion-pastille__texte').length).toBe(lignes().length);
  });
  it('champs-de-formulaire-nommes', async () => {
    await monter();
    const noms = [e07.filtres.fournisseur, e07.filtres.du, e07.filtres.au, e07.filtres.etat, e07.filtres.type];
    for (const n of noms) expect(champ(n)).toBeTruthy();
    expect(document.querySelectorAll('form input, form select')).toHaveLength(noms.length);
    expect(document.querySelector('form button[type=submit]')?.textContent).toBe(e07.filtres.envoyer);
  });
});
