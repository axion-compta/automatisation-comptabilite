// @vitest-environment jsdom
// Fiche L11-T33 : écran E17, bandeau « Barème à confirmer » et filtre par période (faux serveur par fetch).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { e17 } from '../../../../../../packages/textes/src/ecrans/e17.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const ligneBareme = (statut: string) => ({ body: { cle: 'bareme_ik_voiture', pays: 'FR', effetDebut: '2025-01-01', effetFin: null, statut, source: 'Source fictive', dateReleve: '2026-01-01', puissances: [], majorationPourcent: null } });
const frais = (montant: number) => ({ body: [{ id: 'F1', personneId: 'P1', nature: 'depense', date: '2026-10-01', libelle: 'Ticket fictif', montantTtcCentimes: montant, payeur: 'personne', statut: 'valide' }], decalage: 0, total: 1, totaux: { aRembourserCentimes: montant, enAttenteCentimes: 0, exclusCentimes: 0, kmSansMontantDixiemes: 0 } });

/** Faux serveur : `bareme` = statut, ou 404 si null ; `montants` selon la présence de `du` dans la requête. */
function simuler(bareme: string | null, montants: (u: URL) => number = () => 1000) {
  const appels: URL[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    const u = new URL(url);
    appels.push(u);
    if (u.pathname === '/parametres/bareme_ik_voiture') return Promise.resolve(bareme === null ? Response.json({}, { status: 404 }) : Response.json(ligneBareme(bareme)));
    return Promise.resolve(Response.json(frais(montants(u))));
  });
  return appels;
}
async function monter(): Promise<void> {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 100))));
const champ = (nom: string) => document.querySelector<HTMLInputElement>(`input[type="date"][name="${nom}"]`)!;
async function saisir(nom: string, valeur: string): Promise<void> {
  const el = champ(nom);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valeur);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await attendre();
}
const bandeau = () => document.querySelector('[role="status"]');
const phrase = (annee: string) => e17.bareme.replace('{annee}', annee);

describe('E17 barème et période', () => {
  it('bandeau-si-a-verifier', async () => {
    simuler('a_verifier');
    await monter();
    await saisir('au', '2026-12-31');
    expect(bandeau()?.textContent).toBe(phrase('2026'));
  });
  it('pas-de-bandeau-si-valide', async () => {
    simuler('valide');
    await monter();
    await saisir('au', '2026-12-31');
    expect(bandeau()).toBeNull();
    expect(document.body.textContent).not.toContain('à confirmer');
  });
  it('bandeau-si-bareme-absent', async () => {
    simuler(null);
    await monter();
    await saisir('au', '2026-12-31');
    expect(bandeau()?.textContent).toBe(phrase('2026'));
  });
  it('filtre-periode-change-les-totaux', async () => {
    const appels = simuler('valide', (u) => (u.searchParams.get('du') === '2026-10-01' ? 2500 : 1000));
    await monter();
    expect(document.body.textContent).toMatch(/10,00/);
    await saisir('du', '2026-10-01');
    await saisir('au', '2026-10-31');
    const dernier = appels.filter((u) => u.pathname === '/frais').at(-1)!;
    expect(dernier.searchParams.get('du')).toBe('2026-10-01');
    expect(dernier.searchParams.get('au')).toBe('2026-10-31');
    expect(document.body.textContent).toMatch(/25,00/);
    expect(document.querySelector('label')?.textContent).toBe(e17.periode.du);
  });
  it('periode-inversee-sans-requete', async () => {
    const appels = simuler('valide');
    await monter();
    await saisir('du', '2026-10-01');
    const avant = appels.length;
    await saisir('au', '2026-09-01');
    expect(appels.length).toBe(avant);
    expect(document.body.textContent).toContain(e17.periode.ordre);
    await saisir('au', '2026-10-31');
    expect(document.body.textContent).not.toContain(e17.periode.ordre);
  });
  it('annee-du-bandeau-tiree-de-la-date', async () => {
    const appels = simuler('a_verifier');
    await monter();
    await saisir('au', '2025-12-31');
    expect(bandeau()?.textContent).toBe(phrase('2025'));
    expect(appels.some((u) => u.pathname === '/parametres/bareme_ik_voiture' && u.searchParams.get('date') === '2025-12-31')).toBe(true);
  });
  it('bandeau-annonce-aux-lecteurs-d-ecran', async () => {
    simuler('a_verifier');
    await monter();
    await saisir('au', '2026-12-31');
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
  });
});
