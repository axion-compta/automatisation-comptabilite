// @vitest-environment jsdom
// Fiche L07-T28 : écran E53 Mon abonnement (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e53 } from '../../../../../../packages/textes/src/ecrans/e53.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let serveur: { fermer: () => void } | null = null;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  serveur?.fermer();
  serveur = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
async function monter(scenario: string): Promise<HTMLElement> {
  serveur = demarrerNoeud({ base: location.origin, scenarioAbonnement: scenario });
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
  return hote;
}
const bouton = (h: HTMLElement, texte: string) => [...h.querySelectorAll('button')].find((b) => b.textContent === texte) as HTMLButtonElement | undefined;
const clic = async (el: Element | undefined) => {
  await act(async () => el?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await attendre();
};

describe('écran E53', () => {
  it('jauge-rendue-avec-estimation', async () => {
    const h = await monter('volume=normal');
    expect(route.chemin).toBe('/reglages/abonnement');
    expect(h.querySelector('h1')?.textContent).toBe(e53.titre);
    expect(h.querySelector('[role=meter]')).not.toBeNull();
    expect(h.querySelector('[data-estimation]')?.textContent).toContain('Estimation');
  });

  it('normal-pas-de-choix', async () => {
    const h = await monter('volume=normal');
    expect(h.querySelector('[data-bloc=choix]')).toBeNull();
    expect(bouton(h, e53.choix.demander)).toBeUndefined();
  });

  it('depasse-deux-choix', async () => {
    const h = await monter('volume=depasse');
    expect(bouton(h, e53.choix.attendre)).toBeDefined();
    expect(bouton(h, e53.choix.demander)).toBeDefined();
    await clic(bouton(h, e53.choix.attendre));
    expect(h.querySelector('[data-bloc=choix]')).toBeNull();
  });

  it('bouton-desactive-sans-accord', async () => {
    const h = await monter('volume=depasse');
    await clic(bouton(h, e53.choix.demander));
    const case_ = h.querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(case_.checked).toBe(false);
    expect(bouton(h, e53.demande.envoyer)?.disabled).toBe(true);
    await clic(case_);
    expect(bouton(h, e53.demande.envoyer)?.disabled).toBe(false);
  });

  it('envoi-avec-accord-message-palier-inchange', async () => {
    const h = await monter('volume=depasse');
    await clic(bouton(h, e53.choix.demander));
    await clic(h.querySelector('input[type=checkbox]') ?? undefined);
    await clic(bouton(h, e53.demande.envoyer));
    const statut = h.querySelector('[role=status]')?.textContent ?? '';
    expect(statut).toContain('Demande envoyée');
    expect(statut).toContain('votre palier reste 100 pièces par mois');
  });

  it('renvoi-meme-cle', async () => {
    const h = await monter('volume=depasse');
    const reel = globalThis.fetch;
    const cles: string[] = [];
    vi.stubGlobal('fetch', (entree: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        cles.push(new Headers(init.headers).get('idempotency-key') ?? '');
        if (cles.length === 1) return Promise.reject(new TypeError('réseau coupé'));
      }
      return reel(entree, init);
    });
    await clic(bouton(h, e53.choix.demander));
    await clic(h.querySelector('input[type=checkbox]') ?? undefined);
    await clic(bouton(h, e53.demande.envoyer));
    expect(h.querySelector('[role=alert]')).not.toBeNull();
    await clic(bouton(h, e53.demande.envoyer));
    expect(cles).toHaveLength(2);
    expect(cles[0]).not.toBe('');
    expect(cles[1]).toBe(cles[0]);
    expect(h.querySelector('[role=status]')?.textContent).toContain('Demande envoyée');
  });

  it('aucun-prix-ni-montant-a-l-ecran', async () => {
    const h = await monter('volume=depasse');
    await clic(bouton(h, e53.choix.demander));
    expect(h.textContent).not.toMatch(/€|\beuros?\b|\bEUR\b|\bprix\b|\btarif\b|\bHT\b|\bTTC\b/i);
  });

  it('lien-portail-ou-texte-contact', async () => {
    const h = await monter('volume=normal');
    expect(h.querySelector('a')).toBeNull();
    expect(h.textContent).toContain(e53.lien.contact);
    act(() => racine?.unmount());
    document.body.innerHTML = '';
    serveur?.fermer();
    vi.stubEnv('VITE_URL_PORTAIL', 'https://portail.exemple.invalid');
    const h2 = await monter('volume=normal');
    const lien = h2.querySelector('a');
    expect(lien?.textContent).toBe('Abonnement et factures');
    expect(lien?.getAttribute('href')).toMatch(/^https:\/\/portail\.exemple\.invalid\//);
    expect(h2.textContent).not.toContain(e53.lien.contact);
  });
});
