// @vitest-environment jsdom
// Fiche L02-T60 : onglet « À justifier » de l'écran E12.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e12 } from '../../../../../../packages/textes/src/ecrans/e12.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

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
const CODES = ['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel'];
const dem = (id: string, impact: number, nombre: number, cle = 'l:Fictiva Telecom|debit', ligneIds = ['L1']) =>
  ({ id, cle, ligneIds, impactCentimes: impact, nombre, type: 'debit', codeQuestion: 'factures_manquantes', reponsesPretes: CODES, etat: 'ouverte' });

/** Les demandes répondent par le corps donné ; chaque appel est enregistré. */
async function monter(demandes: unknown[], appels: string[] = []): Promise<void> {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', (u: string, o?: RequestInit) => {
    appels.push((o?.method ?? 'GET') + ' ' + String(u));
    if (String(u).includes('/banque/demandes')) return Promise.resolve(Response.json({ body: demandes, decalage: 0, total: demandes.length }));
    return vrai(u, o);
  });
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const onglet = (n: number) => document.querySelectorAll<HTMLElement>('[role=tab]')[n]!;
const ouvrir = async () => { await act(async () => onglet(1).click()); await attendre(); };
const cartes = () => [...document.querySelectorAll('.e12-demande')];
const touche = (el: Element, key: string) => act(async () => void el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));

describe('E12 à justifier', () => {
  it('onglet-sans-nombre-tant-inconnu', async () => {
    const vrai = globalThis.fetch;
    vi.stubGlobal('fetch', (u: string, o?: RequestInit) => (String(u).includes('/banque/demandes') ? Promise.resolve(new Response('{}', { status: 500 })) : vrai(u, o)));
    const client = creerClient();
    client.setDefaultOptions({ queries: { retry: false } });
    racine = createRoot(document.body.appendChild(document.createElement('div')));
    await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
    await attendre();
    expect(onglet(1).textContent).toBe(e12.onglets.aJustifier.replace(' ({nombre})', ''));
  });
  it('trois-factures-de-fictiva', async () => {
    await monter([dem('D1', 18600, 3)]);
    expect(onglet(1).textContent).toBe('À justifier (1)');
    await ouvrir();
    expect(cartes()[0]?.textContent).toContain('Il manque 3 factures de Fictiva Telecom (186,00');
    expect(cartes()[0]?.textContent).toContain('au total).');
  });
  it('triees-par-impact', async () => {
    await monter([dem('D1', 9000, 2, 'l:Alpha|debit'), dem('D2', 5000, 1, 'l:Beta|debit'), dem('D3', 1, 1, 'l:Gamma|debit')]);
    await ouvrir();
    expect(cartes().map((c) => /Alpha|Beta|Gamma/.exec(c.textContent ?? '')?.[0])).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
  it('reponses-desactivees-et-annoncees', async () => {
    const appels: string[] = [];
    await monter([dem('D1', 18600, 3)], appels);
    await ouvrir();
    const boutons = [...document.querySelectorAll<HTMLButtonElement>('.e12-reponses button')];
    expect(boutons.map((b) => b.textContent)).toEqual(CODES.map((c) => `${e12.aJustifier.reponses[c as keyof typeof e12.aJustifier.reponses]} (${e12.aJustifier.bientot})`));
    const avant = appels.length;
    for (const b of boutons) { expect(b.getAttribute('aria-disabled')).toBe('true'); await act(async () => b.click()); }
    await attendre();
    expect(appels.length).toBe(avant);
    expect(appels.some((a) => a.startsWith('POST'))).toBe(false);
  });
  it('voir-les-lignes-filtre-le-tableau', async () => {
    const vrai = globalThis.fetch;
    const lignes = (await (await vrai('/banque/lignes?limite=20&decalage=0')).json()) as { body: { id: string; libelle: string }[] };
    expect(lignes.body.length).toBeGreaterThan(1);
    const [a, b] = lignes.body as [{ id: string; libelle: string }, { id: string; libelle: string }];
    await monter([dem('D1', 100, 1, 'l:X|debit', [a.id])]);
    const avant = document.querySelectorAll('tbody tr').length;
    await ouvrir();
    await act(async () => document.querySelector<HTMLButtonElement>('.e12-demande > button')?.click());
    await attendre();
    expect(onglet(0).getAttribute('aria-selected')).toBe('true');
    const rangs = [...document.querySelectorAll('tbody tr')];
    expect(rangs).toHaveLength(1);
    expect(avant).toBeGreaterThan(1);
    expect(rangs[0]?.textContent).toContain(a.libelle);
    expect(document.body.textContent).not.toContain(a.libelle === b.libelle ? '' : b.libelle);
    await act(async () => [...document.querySelectorAll('button')].find((x) => x.textContent === e12.aJustifier.retirerFiltre)?.click());
    expect(document.querySelectorAll('tbody tr')).toHaveLength(avant);
  });
  it('voir-les-lignes-hors-premiere-page', async () => {
    const vrai = globalThis.fetch;
    const tout = (await (await vrai('/banque/lignes?limite=100&decalage=0')).json()) as { body: { id: string; libelle: string }[] };
    expect(tout.body.length).toBeGreaterThan(21);
    const [x, y] = [tout.body[tout.body.length - 1]!, tout.body[tout.body.length - 2]!];
    await monter([dem('D1', 100, 2, 'l:X|debit', [x.id, y.id])]);
    await ouvrir();
    await act(async () => document.querySelector<HTMLButtonElement>('.e12-demande > button')?.click());
    await attendre();
    const rangs = [...document.querySelectorAll('tbody tr')].map((r) => r.textContent ?? '');
    expect(rangs).toHaveLength(2);
    expect(rangs.some((r) => r.includes(x.libelle))).toBe(true);
    expect(rangs.some((r) => r.includes(y.libelle))).toBe(true);
  });
  it('onglets-au-clavier', async () => {
    await monter([dem('D1', 100, 1)]);
    expect(document.querySelector('[role=tablist]')).not.toBeNull();
    expect(onglet(0).getAttribute('aria-selected')).toBe('true');
    expect(onglet(1).tabIndex).toBe(-1);
    await touche(onglet(0), 'ArrowRight');
    expect(onglet(1).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(onglet(1));
    await touche(onglet(1), 'ArrowLeft');
    expect(onglet(0).getAttribute('aria-selected')).toBe('true');
    await touche(onglet(0), 'End');
    expect(onglet(1).getAttribute('aria-selected')).toBe('true');
    await touche(onglet(1), 'Home');
    expect(onglet(0).getAttribute('aria-selected')).toBe('true');
  });
  it('aucune-demande-etat-vide', async () => {
    await monter([]);
    expect(onglet(1).textContent).toBe('À justifier (0)');
    await ouvrir();
    expect(onglet(1).textContent).toBe('À justifier (0)');
    expect(document.body.textContent).toContain(e12.aJustifier.vide);
    expect(cartes()).toHaveLength(0);
  });
  it('cas-limites-singulier-sans-nom-et-un-centime', async () => {
    await monter([dem('D1', 1, 1, 'l:Fictiva Telecom|debit'), dem('D2', 1, 1, 'c:ID42|debit')]);
    await ouvrir();
    expect(cartes()[0]?.textContent).toContain('Il manque 1 facture de Fictiva Telecom (0,01');
    expect(cartes()[1]?.textContent).toMatch(/Il manque 1 facture \(0,01/);
  });
});
