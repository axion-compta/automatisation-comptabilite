// @vitest-environment jsdom
// Fiche L02-T57 : écran E12.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { creerServiceBanque } from '../../../../../../packages/contrat/src/domaines/banque-service.js';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { etatLigne } from '../../../../../../packages/textes/src/banque/mots.js';
import { e12 } from '../../../../../../packages/textes/src/ecrans/e12.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran, cheminLignes, etatDepuisUrl } from '../Ecran.js';
import { route } from '../route.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
async function monter(url = '/banque'): Promise<void> {
  window.history.replaceState(null, '', url);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const lignes = () => [...document.querySelectorAll('tbody tr')];
const selecteur = (nom: string) => [...document.querySelectorAll('label')].find((l) => l.textContent?.startsWith(nom))!.querySelector('select')!;
async function choisir(nom: string, valeur: string) {
  await act(async () => {
    const s = selecteur(nom);
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(s, valeur);
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await attendre();
}
const attendu = (etat: 'DOUTEUSE' | 'SANS_PIECE') => Math.min(20, creerServiceBanque().lignes({ etat })!.total);
const json = (corps: unknown, statut = 200) => () => Promise.resolve(Response.json(corps, { status: statut }));

describe('E12', () => {
  it('affiche-les-comptes-iban-masque', async () => {
    await monter();
    expect(route).toMatchObject({ id: 'e12', chemin: '/banque' });
    const cartes = [...document.querySelectorAll('.e12-carte')];
    expect(cartes).toHaveLength(3);
    expect(cartes[0]?.textContent).toMatch(/Banque Exemple.*FR\*+0001.*€.*\d{2}\/\d{2}\/\d{4}/);
  });
  it('lignes-avec-etat-en-mot', async () => {
    await monter('/banque?etat=DOUTEUSE');
    expect(lignes()).toHaveLength(attendu('DOUTEUSE'));
    for (const l of lignes()) expect(l.querySelector('.axion-pastille__texte')?.textContent).toBe(etatLigne('DOUTEUSE'));
    expect(document.querySelectorAll('.axion-pastille svg[aria-hidden=true]').length).toBeGreaterThan(0);
  });
  it('filtre-sans-piece', async () => {
    await monter();
    await choisir(e12.filtres.etat, 'SANS_PIECE');
    expect(selecteur(e12.filtres.etat).selectedOptions[0]?.textContent).toBe(e12.filtres.sansPiece);
    expect(lignes()).toHaveLength(attendu('SANS_PIECE'));
    for (const l of lignes()) expect(l.textContent).toContain(etatLigne('SANS_PIECE'));
  });
  it('filtre-dans-l-url', async () => {
    const urls: string[] = [];
    const vrai = globalThis.fetch;
    vi.stubGlobal('fetch', (u: string, o?: RequestInit) => (urls.push(String(u)), vrai(u, o)));
    await monter();
    await choisir(e12.filtres.etat, 'PROPOSEE');
    expect(window.location.search).toBe('?etat=PROPOSEE');
    expect(urls.some((u) => u.includes('etat=PROPOSEE'))).toBe(true);
    await choisir(e12.filtres.etat, '');
    expect(window.location.search).toBe('');
    act(() => racine?.unmount());
    await monter('/banque?etat=SANS_PIECE');
    expect(selecteur(e12.filtres.etat).value).toBe('SANS_PIECE');
    expect(lignes()).toHaveLength(attendu('SANS_PIECE'));
    expect(cheminLignes('PERSO', 'BQ1', 20)).toBe('/banque/lignes?etat=PERSO&compte=BQ1&limite=20&decalage=20');
  });
  it('rapprochee-n-est-pas-validee', async () => {
    await monter('/banque?etat=RAPPROCHEE');
    expect(lignes().length).toBeGreaterThan(0);
    for (const l of lignes()) expect([l.textContent, l.querySelector('.axion-pastille--ok')]).toEqual([expect.stringContaining(etatLigne('RAPPROCHEE')), null]);
    expect(document.querySelector('tbody')?.textContent).not.toMatch(/valid/i);
  });
  it('etat-erreur-403', async () => {
    vi.stubGlobal('fetch', json({ code: 'FORBIDDEN' }, 403));
    await monter();
    expect(document.querySelector('[role=alert]')?.textContent).toContain(e12.etats.acces);
    act(() => racine?.unmount());
    vi.stubGlobal('fetch', json({}, 500));
    await monter();
    expect(document.querySelector('[role=alert]')?.textContent).toContain(e12.etats.erreur);
    expect(document.body.textContent).not.toContain(e12.etats.acces);
  });
  it('titre-h1-unique', async () => {
    vi.stubGlobal('innerWidth', 360);
    window.dispatchEvent(new Event('resize'));
    await monter();
    expect([...document.querySelectorAll('h1')].map((h) => h.textContent)).toEqual([e12.titre]);
    expect(document.querySelector('main')).toBeNull();
    expect([document.querySelector('table'), document.querySelector('.e12-cartes')]).not.toContain(null);
  });
  it('cas-limites', async () => {
    vi.stubGlobal('fetch', json({ body: [], decalage: 0, total: 0 }));
    await monter();
    expect(document.body.textContent).toContain(e12.etats.videComptes);
    expect(document.body.textContent).toContain(e12.etats.videLignes);
    act(() => racine?.unmount());
    vi.unstubAllGlobals();
    await monter();
    await choisir(e12.filtres.etat, 'A_QUALIFIER');
    expect(lignes()).toHaveLength(0);
    expect(document.body.textContent).toContain(e12.etats.videLignes);
    act(() => racine?.unmount());
    await monter('/banque?etat=INCONNU');
    expect(selecteur(e12.filtres.etat).value).toBe('');
    expect(lignes().length).toBeGreaterThan(0);
    expect([etatDepuisUrl('?etat=INCONNU'), etatDepuisUrl('?etat=PERSO')]).toEqual([undefined, 'PERSO']);
  });
  it('montant-negatif-avec-signe', async () => {
    await monter();
    const negatif = document.querySelector('tbody [data-signe=negatif]');
    expect(negatif?.textContent).toMatch(/^[-−–]/);
    expect(negatif?.getAttribute('aria-label')).toContain(e12.tableau.montantNegatif.split('{')[0]);
  });
});
