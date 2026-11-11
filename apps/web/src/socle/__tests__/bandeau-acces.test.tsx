// @vitest-environment jsdom
// Fiche L07-T27 : bandeau d'état d'accès de la coque.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { abonnement } from '../../../../../packages/textes/src/ecrans/abonnement.js';
import { FournisseurDonnees } from '../../donnees/lecture.js';
import { BandeauAcces } from '../BandeauAcces.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
let serveur: { fermer: () => void } | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  serveur?.fermer();
  racine = null;
  serveur = null;
  document.body.innerHTML = '';
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function monter(scenario: string | null, ecran = 'Écran fictif A'): Promise<HTMLElement> {
  serveur = demarrerNoeud(scenario === null ? {} : { scenarioAbonnement: scenario });
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(
      <FournisseurDonnees>
        <BandeauAcces />
        <main>{ecran}</main>
      </FournisseurDonnees>,
    );
  });
  await act(async () => void (await new Promise((r) => setTimeout(r, 100))));
  return hote;
}
const bandeaux = (h: HTMLElement): NodeListOf<Element> => h.querySelectorAll('section[role="status"]');
const ETATS = [
  ['essai', 'ESSAI'],
  ['delai_de_grace', 'DELAI_DE_GRACE'],
  ['lecture_seule', 'LECTURE_SEULE'],
  ['suspendu', 'SUSPENDU'],
  ['resilie', 'RESILIE'],
] as const;

describe('bandeau d’accès', () => {
  it('actif-pas-de-bandeau', async () => {
    const h = await monter('acces=actif');
    expect(bandeaux(h)).toHaveLength(0);
    expect(h.querySelector('main')?.textContent).toBe('Écran fictif A');
  });

  it('cinq-etats-un-bandeau-sur-chaque-ecran', async () => {
    for (const [code, etat] of ETATS) {
      for (const ecran of ['Écran fictif A', 'Écran fictif B', 'Écran fictif C']) {
        const h = await monter('acces=' + code, ecran);
        expect(bandeaux(h)).toHaveLength(1);
        expect(h.querySelector('h2')?.textContent).toBe(abonnement.banniere[etat].titre);
        expect(h.querySelector('main')?.textContent).toBe(ecran);
        act(() => racine?.unmount());
        serveur?.fermer();
        document.body.innerHTML = '';
      }
    }
  });

  it('gravite-attention-pour-suspendu-et-resilie', async () => {
    for (const [code, etat] of ETATS) {
      const h = await monter('acces=' + code);
      expect(bandeaux(h)[0]?.getAttribute('data-gravite')).toBe(etat === 'SUSPENDU' || etat === 'RESILIE' ? 'attention' : 'info');
      act(() => racine?.unmount());
      serveur?.fermer();
      document.body.innerHTML = '';
    }
  });

  it('aucun-montant-affiche', async () => {
    for (const [code] of ETATS) {
      const h = await monter('acces=' + code + ';reprise=oui');
      expect(h.textContent).not.toMatch(/€|\beuros?\b|\d\s*%/i);
      act(() => racine?.unmount());
      serveur?.fermer();
      document.body.innerHTML = '';
    }
  });

  it('resume-de-reprise-affiche', async () => {
    const h = await monter('acces=essai;reprise=oui');
    expect(h.textContent).toMatch(/pièces reçues pendant la pause ont été traitées/);
    const sans = await monter('acces=essai;reprise=non');
    expect(sans.textContent).not.toMatch(/pendant la pause/);
  });

  it('erreur-reseau-pas-de-bandeau-ecran-intact', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('réseau coupé')));
    const hote = document.body.appendChild(document.createElement('div'));
    racine = createRoot(hote);
    await act(async () => {
      racine?.render(
        <FournisseurDonnees>
          <BandeauAcces />
          <main>Écran fictif A</main>
        </FournisseurDonnees>,
      );
    });
    await act(async () => void (await new Promise((r) => setTimeout(r, 500))));
    expect(bandeaux(hote)).toHaveLength(0);
    expect(hote.querySelector('main')?.textContent).toBe('Écran fictif A');
  });

  it('lien-du-portail-seulement-si-variable-https', async () => {
    const h = await monter('acces=suspendu');
    expect(h.querySelector('a')).toBeNull();
    expect(h.textContent).toContain(abonnement.liens.contacter_axion);
    act(() => racine?.unmount());
    serveur?.fermer();
    document.body.innerHTML = '';
    vi.stubEnv('VITE_URL_PORTAIL', 'https://portail.exemple.invalid');
    const h2 = await monter('acces=suspendu');
    expect(h2.querySelector('a')?.textContent ?? h2.querySelector('.axion-banniere-acces__lien')?.textContent).toBeTruthy();
  });
});
