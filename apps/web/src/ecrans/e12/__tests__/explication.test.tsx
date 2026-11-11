// @vitest-environment jsdom
// Fiche L02-T58 : panneau « Pourquoi ? » de l'écran E12.
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
const FACTEURS = [['reference', 45], ['montant', 25], ['tiers', 20], ['delai', 7], ['libelle', 3]] as const;
const corps = (surcharge: object = {}) => ({
  body: {
    codeMot: 'rattache', score: 100, etat: 'RAPPROCHEE', proposePar: 'regle', autresCandidats: [],
    facteurs: FACTEURS.map(([nom, points]) => ({ nom, points, code: nom, valeurs: { piece: 'FA-2026-0142', tiers: 'Fictiva Telecom', montant: '120,00 €', jours: 2, reference: 'FA-2026-0142', alias: 'Fictiva' } })),
    ...surcharge,
  },
});
/** Les routes d'explication répondent par `reponse` ; le reste passe au faux serveur. */
async function monter(reponse?: () => Response): Promise<void> {
  const vrai = globalThis.fetch;
  if (reponse) vi.stubGlobal('fetch', (u: string, o?: RequestInit) => (String(u).includes('/explication') ? Promise.resolve(reponse()) : vrai(u, o)));
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const boutons = () => [...document.querySelectorAll<HTMLButtonElement>('tbody button')];
const panneau = () => document.querySelector('.e12-explication');
async function ouvrir(i = 0): Promise<HTMLButtonElement> {
  const b = boutons()[i]!;
  await act(async () => b.click());
  await attendre();
  return b;
}
const ok = (c: object) => () => Response.json(c);

describe('E12 Pourquoi ?', () => {
  it('cinq-facteurs-et-total-cent', async () => {
    await monter(ok(corps()));
    await ouvrir();
    const items = [...panneau()!.querySelectorAll('li')];
    expect(items).toHaveLength(FACTEURS.length);
    FACTEURS.forEach(([nom, points], i) => expect(items[i]?.textContent).toContain(`${e12.explication.noms[nom]} : ${points} point`));
    expect(panneau()?.textContent).toContain('Total : 100 sur 100');
  });
  it('phrase-principale-sans-jargon', async () => {
    await monter(ok(corps()));
    await ouvrir();
    const p = panneau()!.querySelector('p')!.textContent;
    expect(p).toBe('Je rattache cette ligne à la facture FA-2026-0142 de Fictiva Telecom.');
    expect(p).not.toMatch(/rattache_|codeMot|undefined|\{/);
    expect(panneau()?.textContent).toContain(e12.explication.source.regle);
  });
  it('autres-candidats-affiches', async () => {
    await monter(ok(corps({ autresCandidats: [{ pieceId: 'FA-2026-0199', score: 62 }] })));
    await ouvrir();
    expect(panneau()?.textContent).toContain(e12.explication.autres);
    expect(panneau()?.textContent).toContain('FA-2026-0199');
    act(() => racine?.unmount());
    document.body.innerHTML = '';
    await monter(ok(corps({ facteurs: [{ nom: 'montant', points: 0, code: 'montant', valeurs: {} }] })));
    await ouvrir();
    expect(panneau()?.textContent).not.toContain(e12.explication.autres);
    expect(panneau()?.textContent).toContain('0 point');
    act(() => racine?.unmount());
    document.body.innerHTML = '';
    await monter(ok(corps({ score: undefined, facteurs: [], codeMot: 'sans_piece', etat: 'SANS_PIECE' })));
    await ouvrir();
    expect(panneau()?.textContent).toContain(e12.explication.sansScore);
    expect(panneau()?.textContent).not.toContain('Total');
    expect(panneau()?.querySelectorAll('h3')).toHaveLength(0);
  });
  it('fermeture-rend-le-focus', async () => {
    await monter(ok(corps()));
    const b = await ouvrir(1);
    expect(document.activeElement).toBe(panneau()?.querySelector('h2'));
    await act(async () => void panneau()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await attendre();
    expect(panneau()).toBeNull();
    expect(document.activeElement).toBe(b);
    await ouvrir(1);
    await act(async () => void [...panneau()!.querySelectorAll('button')].find((x) => x.textContent === e12.explication.fermer)!.click());
    await attendre();
    expect([panneau(), document.activeElement]).toEqual([null, b]);
  });
  it('erreur-404-message', async () => {
    await monter(() => Response.json({ code: 'LIGNE_INCONNUE' }, { status: 404 }));
    await ouvrir();
    expect(panneau()?.querySelector('[role=alert]')?.textContent).toContain(e12.explication.introuvable);
    expect(panneau()?.textContent).not.toContain(e12.explication.erreur);
  });
  it('bouton-libelle-accessible', async () => {
    await monter(ok(corps()));
    const premiere = document.querySelector('tbody tr')!.children[1]!.textContent!;
    const b = boutons()[0]!;
    expect(b.textContent).toBe(e12.tableau.pourquoi);
    expect(b.getAttribute('aria-label')).toBe(`Pourquoi cette ligne ? ${premiere}`);
    expect(b.getAttribute('aria-expanded')).toBe('false');
    await ouvrir();
    expect(b.getAttribute('aria-expanded')).toBe('true');
  });
});
