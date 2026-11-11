// @vitest-environment jsdom
// Fiche L07-T29 : écran E50, section fin de contrat (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error module .mjs sans déclaration de types
import { MOTS_INTERDITS } from '../../../../../../outils/gardes/textes.mjs';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e50 } from '../../../../../../packages/textes/src/ecrans/e50.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void } | null = null;
let racine: Root | null = null;
const demonter = () => {
  act(() => racine?.unmount());
  serveur?.fermer();
  document.body.innerHTML = '';
};
afterEach(() => { demonter(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
async function monter(scenario: string): Promise<HTMLElement> {
  serveur = demarrerNoeud({ base: location.origin, scenarioAbonnement: scenario });
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees client={creerClient()}><Ecran /></FournisseurDonnees>));
  await attendre();
  return hote;
}
const bouton = (texte: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texte) as HTMLButtonElement | undefined;
const clic = async (el: Element | undefined) => {
  await act(async () => el?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await attendre();
};
const saisir = (el: HTMLTextAreaElement, valeur: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

describe('écran E50, fin de contrat', () => {
  it('aucune-lien-ou-contact', async () => {
    vi.stubEnv('VITE_URL_PORTAIL', 'https://portail.exemple.fr');
    let h = await monter('finContrat=aucune');
    expect(route.chemin).toBe('/reglages/donnees');
    expect(h.querySelector('a')?.getAttribute('href')).toBe('https://portail.exemple.fr/demandes/fin-de-contrat');
    demonter();
    vi.stubEnv('VITE_URL_PORTAIL', '');
    h = await monter('finContrat=aucune');
    expect(h.querySelector('a')).toBeNull();
    expect(h.textContent).toContain(e50.fin.contact);
  });

  it('preavis-date-formatee', async () => {
    const h = await monter('finContrat=preavis');
    expect(h.textContent).toMatch(/Votre contrat se termine le \d{2}\/\d{2}\/\d{4}\. Téléchargez vos documents\./);
  });

  it('remis-accuse-avec-confirmation', async () => {
    const h = await monter('finContrat=remis');
    expect(h.textContent).not.toContain('ab12'.repeat(16));
    await clic(bouton(e50.fin.voirEmpreinte));
    expect(h.textContent).toContain('ab12'.repeat(16));
    await clic(bouton(e50.fin.accuser));
    await clic(bouton(e50.confirmation.confirmer));
    expect(document.querySelector('dialog')).toBeNull();
    expect(h.textContent).toContain('Effacement prévu le ');
  });

  it('annuler-la-confirmation-n-envoie-rien', async () => {
    await monter('finContrat=remis');
    const posts: string[] = [];
    const reel = globalThis.fetch;
    vi.stubGlobal('fetch', (e: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') posts.push(String(e));
      return reel(e, init);
    });
    await clic(bouton(e50.fin.accuser));
    await clic(bouton(e50.confirmation.annuler));
    expect(document.querySelector('dialog')).toBeNull();
    expect(posts).toEqual([]);
  });

  it('accuse-date-d-effacement', async () => {
    const h = await monter('finContrat=accuse');
    expect(h.textContent).toMatch(/Effacement prévu le \d{2}\/\d{2}\/\d{4}/);
  });

  it('gel-suspend-l-affichage-de-l-effacement', async () => {
    const h = await monter('finContrat=gele');
    expect(h.textContent).toContain(e50.fin.effacementSuspendu);
    expect(h.textContent).not.toContain('Effacement prévu');
    await saisir(h.querySelector('textarea') as HTMLTextAreaElement, 'Litige réglé');
    await clic(bouton(e50.gel.lever));
    expect(h.textContent).toContain('Effacement prévu le ');
  });

  it('motif-vide-bouton-desactive', async () => {
    const h = await monter('finContrat=preavis');
    const zone = h.querySelector('textarea') as HTMLTextAreaElement;
    expect(zone.maxLength).toBe(500);
    expect(bouton(e50.gel.poser)?.disabled).toBe(true);
    await saisir(zone, '   ');
    expect(bouton(e50.gel.poser)?.disabled).toBe(true);
    await saisir(zone, 'Contrôle en cours');
    expect(h.textContent).toContain('17 caractères sur 500');
    await clic(bouton(e50.gel.poser));
    expect(bouton(e50.gel.lever)).toBeDefined();
  });

  it('aucun-nombre-d-annees-ni-mot-interdit', async () => {
    const h = await monter('finContrat=remis');
    const textes = (JSON.stringify(e50) + (h.textContent ?? '')).toLowerCase();
    for (const mot of MOTS_INTERDITS as string[]) expect(textes).not.toContain(mot.toLowerCase());
    expect(h.textContent).toContain(e50.fin.conservation);
    expect(textes).not.toMatch(/\d+\s*(ans?|années?)\b/);
  });

  it('dialog-accessible', async () => {
    await monter('finContrat=remis');
    await clic(bouton(e50.fin.accuser));
    const boite = document.querySelector('dialog') as HTMLDialogElement;
    expect(boite.getAttribute('role')).toBe('dialog');
    expect(document.getElementById(boite.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(e50.confirmation.titre);
    expect(boite.contains(document.activeElement)).toBe(true);
    await act(async () => boite.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('dialog')).toBeNull();
  });
});
