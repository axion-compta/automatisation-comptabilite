// @vitest-environment jsdom
// Fiche L03-T46 : écran E57 Ce que le logiciel a vérifié.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e57 } from '../../../../../../packages/textes/src/ecrans/e57.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Controles, Ecran } from '../Ecran.js';
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
  await act(async () => racine?.render(<FournisseurDonnees client={client}>{exercice ? <Controles exercice={exercice} /> : <Ecran />}</FournisseurDonnees>));
  await attendre();
}
const trace = (resultat: string, id: string, extra: object = {}) => ({ regleId: id, gravite: 'M', objetType: 'piece', objetId: 'P' + id, resultat, valeur: '12', ecartCentimes: 0, horodatage: '2026-03-05T10:00:00Z', ...extra });
/** Remplace seulement la réponse des contrôles ; le reste vient du faux serveur. */
function remplacer(body: object[]) {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', async (u: string, o?: RequestInit) => (String(u).endsWith('/controles') ? Response.json({ body, decalage: 0, total: body.length }) : vrai(u, o)));
}
const cliquer = async (el: Element) => (await act(async () => void (el as HTMLElement).click()), await attendre());
const radio = (texte: string) => [...document.querySelectorAll('[role=radio]')].find((r) => r.textContent === texte)!;
const lignes = () => [...document.querySelectorAll('tbody tr')];
const mots = (i: number) => lignes()[i]?.querySelector('.axion-pastille__texte')?.textContent;

describe('E57', () => {
  it('titre-h1-unique', async () => {
    await monter();
    expect(route).toMatchObject({ id: 'e57', chemin: '/documents/controles' });
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(e57.titre);
    expect(document.querySelector('main')).toBeNull();
  });
  it('liste-non-ok-d-abord', async () => {
    remplacer([trace('ALERTE', 'A1'), trace('IMPOSSIBLE', 'A2'), trace('OK', 'A3')]);
    await monter('EX2026');
    expect(lignes()).toHaveLength(3);
    expect(mots(0)).toBe(e57.resultats.ALERTE);
    expect(mots(2)).toBe(e57.resultats.OK);
  });
  it('filtre-alertes', async () => {
    remplacer([trace('ALERTE', 'B1'), trace('OK', 'B2'), trace('ALERTE', 'B3')]);
    await monter('EX2026');
    expect(document.querySelectorAll('[role=radiogroup]')).toHaveLength(1);
    await cliquer(radio(e57.resultats.ALERTE));
    expect(lignes()).toHaveLength(2);
    expect(radio(e57.resultats.ALERTE).getAttribute('aria-checked')).toBe('true');
    await cliquer(radio(e57.filtre.tous));
    expect(lignes()).toHaveLength(3);
  });
  it('impossible-libelle-distinct-de-reussi', async () => {
    remplacer([trace('IMPOSSIBLE', 'C1'), trace('OK', 'C2')]);
    await monter('EX2026');
    expect(mots(0)).toBe(e57.resultats.IMPOSSIBLE);
    expect(mots(0)).not.toBe(mots(1));
    expect(e57.resultats.IMPOSSIBLE).not.toMatch(/réussi|ok/i);
  });
  it('resume-chiffre', async () => {
    remplacer([trace('OK', 'D1'), trace('OK', 'D2'), trace('ALERTE', 'D3'), trace('IMPOSSIBLE', 'D4', { valeur: null, ecartCentimes: null }), trace('ECARTE', 'D5')]);
    await monter('EX2026');
    expect(document.querySelector('p')?.textContent).toBe('2 réussis, 1 alertes, 1 impossibles');
    await cliquer(radio(e57.resultats.ALERTE));
    expect(document.querySelector('p')?.textContent).toBe('2 réussis, 1 alertes, 1 impossibles');
    await cliquer(radio(e57.filtre.tous));
    const impossible = lignes().find((l) => l.textContent?.includes('D4'))!;
    expect(impossible.querySelectorAll(`[aria-label="${e57.valeurAbsente.libelle}"]`)).toHaveLength(2);
    expect(lignes().find((l) => l.textContent?.includes('D1'))?.textContent).toContain('0,00');
  });
  it('etat-vide', async () => {
    remplacer([]);
    await monter('EX2026');
    expect(document.body.textContent).toContain(e57.etats.vide);
    expect(document.querySelector('table')).toBeNull();
  });
});
