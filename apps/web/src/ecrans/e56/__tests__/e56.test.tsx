// @vitest-environment jsdom
// Fiche L15-T51 : écran E56 Mon activité.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e56 } from '../../../../../../packages/textes/src/ecrans/e56.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Activite, Ecran, cheminActivite } from '../Ecran.js';
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
async function monter(exercice?: string): Promise<void> {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}>{exercice ? <Activite exercice={exercice} /> : <Ecran />}</FournisseurDonnees>));
  await attendre();
}
const radios = () => [...document.querySelectorAll<HTMLElement>('[role=radio]')];
const choisie = () => radios().findIndex((r) => r.getAttribute('aria-checked') === 'true');
const lignes = () => [...document.querySelectorAll('tbody tr')];
const cliquer = async (el: Element) => (await act(async () => void (el as HTMLElement).click()), await attendre());
const touche = async (el: HTMLElement, key: string) => (await act(async () => void el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))), await attendre());
const CHIFFRE = (centimes: number) => ({ centimes, devise: 'EUR' });
const CHIFFRES = (base: number) => ({ ca: CHIFFRE(base), charges: CHIFFRE(base + 1), resultatProvisoire: CHIFFRE(base + 2), tresorerie: CHIFFRE(base + 3), enAttente: { nombre: 0, montant: CHIFFRE(0) } });
/** Réponse réelle du faux serveur, dont on remplace les chiffres : le serveur fournit tout, le front ne calcule rien. */
function remplacer(corps: Record<string, unknown>) {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', async (u: string, o?: RequestInit) => {
    const r = await vrai(u, o);
    if (!String(u).includes('tableau-de-bord')) return r;
    const j = (await r.json()) as { body: object };
    return Response.json({ body: { ...j.body, ...corps } });
  });
}

describe('E56', () => {
  it('trois-vues-seulement', async () => {
    await monter();
    expect(route).toMatchObject({ id: 'e56', chemin: '/activite' });
    expect(document.querySelectorAll('[role=radiogroup]')).toHaveLength(1);
    expect(radios().map((r) => r.textContent)).toEqual([e56.vues.mois, e56.vues.exercice, e56.vues.depuis_debut]);
    expect(choisie()).toBe(1);
  });
  it('changer-de-vue-relit-le-serveur', async () => {
    const urls: string[] = [];
    const vrai = globalThis.fetch;
    vi.stubGlobal('fetch', (u: string, o?: RequestInit) => (urls.push(String(u)), vrai(u, o)));
    await monter('EX2026');
    await cliquer(radios()[0]!);
    await cliquer(radios()[2]!);
    expect(urls.filter((u) => u.includes('tableau-de-bord')).map((u) => new URL(u).search)).toEqual(['?vue=exercice', '?vue=mois', '?vue=depuis_debut']);
    expect(cheminActivite('EX 1', 'mois')).toBe('/exercices/EX%201/tableau-de-bord?vue=mois');
  });
  it('comparaison-affichee', async () => {
    await monter('EX2026');
    expect(document.querySelectorAll('.e56-carte')).toHaveLength(4);
    expect(document.body.textContent).toContain(e56.comparaison.titre);
    expect(document.body.textContent).not.toContain(e56.vide.pas_d_exercice_precedent);
    expect(document.body.textContent).toContain('€');
  });
  it('sans-exercice-precedent-mot', async () => {
    await monter('EX2025');
    expect(document.body.textContent).toContain(e56.vide.pas_d_exercice_precedent);
    expect(document.querySelectorAll('.e56-carte')).toHaveLength(4);
    act(() => racine?.unmount());
    remplacer({ comparaison: { vide: 'precedent_trop_court' } });
    await monter('EX2026');
    expect(document.body.textContent).toContain(e56.vide.precedent_trop_court);
  });
  it('tableau-equivalent', async () => {
    await monter('EX2026');
    expect(document.querySelector('table')).not.toBeNull();
    expect([...document.querySelectorAll('th')].map((t) => t.textContent)).toEqual([e56.tableau.indicateur, e56.tableau.periode, e56.tableau.precedent]);
    expect(lignes()).toHaveLength(4);
    expect(lignes().map((l) => l.querySelector('td,th')?.textContent)).toEqual([e56.chiffres.ca, e56.chiffres.charges, e56.chiffres.resultat, e56.chiffres.tresorerie]);
  });
  it('clavier-fleches-changent-la-vue', async () => {
    await monter('EX2026');
    expect([radios()[1]!.tabIndex, radios()[0]!.tabIndex]).toEqual([0, -1]);
    await touche(radios()[1]!, 'ArrowRight');
    expect([choisie(), document.activeElement]).toEqual([2, radios()[2]]);
    await touche(radios()[2]!, 'ArrowRight');
    expect(choisie()).toBe(0);
    await touche(radios()[0]!, 'ArrowLeft');
    expect(choisie()).toBe(2);
    await touche(radios()[2]!, 'a');
    expect(choisie()).toBe(2);
  });
  it('aucun-calcul-au-front', async () => {
    remplacer({ chiffres: CHIFFRES(100000), comparaison: { periode: { debut: '2030-01-01', fin: '2030-12-31' }, chiffres: CHIFFRES(40000) } });
    await monter('EX2026');
    const texte = (document.body.textContent ?? '').replace(/\s/g, ' ');
    expect(texte).toContain('1 000,00');
    expect(texte).toContain('400,00');
    expect(texte).not.toContain('600,00');
  });
  it('titre-h1-unique', async () => {
    await monter();
    expect([...document.querySelectorAll('h1')].map((h) => h.textContent)).toEqual([e56.titre]);
    expect(radios().length).toBe(3);
  });
});
