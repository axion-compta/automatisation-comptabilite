// @vitest-environment jsdom
// Fiche L15-T49 : lecture interrogée toutes les 30 s et relue après chaque action.
import { QueryClient } from '@tanstack/react-query';
import { Component, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { INTERVALLE_TABLEAU_DE_BORD_MS, relireApresAction, useLectureInterrogee } from '../interrogation.js';
import { FournisseurDonnees, creerClient, type EtatLecture } from '../lecture.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const schema = z.object({ total: z.number() }).passthrough();
type Env = z.infer<typeof schema>;
const INTERVALLE = 1000;

let racine: Root | null = null;
let noeud: { fermer: () => void } | null = null;
let appels: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  noeud = demarrerNoeud({ base: location.origin });
  const reel = globalThis.fetch;
  appels = [];
  vi.stubGlobal('fetch', (entree: RequestInfo | URL, init?: RequestInit) => {
    appels.push(String(entree));
    return reel(entree, init);
  });
});
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  noeud?.fermer();
  noeud = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

function Sonde({ sortie, intervalleMs, chemin }: { sortie: EtatLecture<Env>[]; intervalleMs: number; chemin: string }) {
  sortie.push(useLectureInterrogee<Env>(chemin, schema, { intervalleMs }));
  return null;
}

const avancer = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

async function monter(opts: { intervalleMs?: number; chemin?: string; client?: QueryClient } = {}): Promise<EtatLecture<Env>[]> {
  const sortie: EtatLecture<Env>[] = [];
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => {
    racine?.render(
      <FournisseurDonnees client={opts.client ?? creerClient()}>
        <Sonde sortie={sortie} intervalleMs={opts.intervalleMs ?? INTERVALLE} chemin={opts.chemin ?? '/ecritures'} />
      </FournisseurDonnees>,
    );
  });
  await avancer(300);
  return sortie;
}

const nb = (chemin = '/ecritures') => appels.filter((a) => a.includes(chemin)).length;

describe('useLectureInterrogee', () => {
  it('premiere-lecture', async () => {
    expect(INTERVALLE_TABLEAU_DE_BORD_MS).toBe(30_000);
    const sortie = await monter();
    expect(sortie[0]?.etat).toBe('chargement');
    expect(['pret', 'vide']).toContain(sortie[sortie.length - 1]?.etat);
    expect(nb()).toBe(1);
  });

  it('relue-apres-l-intervalle', async () => {
    await monter();
    expect(nb()).toBe(1);
    await avancer(INTERVALLE);
    expect(nb()).toBe(2);
    await avancer(INTERVALLE);
    expect(nb()).toBe(3);
  });

  it('pas-relue-avant-l-intervalle', async () => {
    await monter();
    await avancer(INTERVALLE - 500);
    expect(nb()).toBe(1);
    await avancer(100);
    expect(nb()).toBe(1);
  });

  it('relire-apres-action-invalide-les-prefixes', async () => {
    const client = creerClient();
    await monter({ intervalleMs: 3_600_000, client });
    expect(nb()).toBe(1);
    await act(() => relireApresAction(client, ['/exercices', '/tiers']));
    await avancer(300);
    expect(nb()).toBe(1);
    await act(() => Promise.all([relireApresAction(client, []), relireApresAction(client, [''])]).then(() => undefined));
    await avancer(300);
    expect(nb()).toBe(1);
    await act(() => relireApresAction(client, ['/exercices', '/ecr']));
    await avancer(300);
    expect(nb()).toBe(2);
  });

  it('onglet-cache-pas-d-interrogation', async () => {
    await monter();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await avancer(INTERVALLE * 5);
    expect(nb()).toBe(1);
  });

  it('erreur-4xx-pas-de-nouvelle-tentative', async () => {
    const sortie = await monter({ chemin: '/ecritures?limite=0', intervalleMs: 3_600_000 });
    await avancer(2000);
    expect(sortie[sortie.length - 1]?.etat).toBe('erreur');
    expect(nb('limite=0')).toBe(1);
  });

  it('intervalle-invalide-refuse', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const attrape: unknown[] = [];
    class Frontiere extends Component<{ children: ReactNode }> {
      override state = { erreur: false };
      static getDerivedStateFromError(e: unknown) {
        attrape.push(e);
        return { erreur: true };
      }
      override render() {
        return this.state.erreur ? null : this.props.children;
      }
    }
    for (const v of [0, -1, NaN, Infinity, -Infinity]) {
      const r = createRoot(document.createElement('div'));
      await act(async () => {
        r.render(
          <FournisseurDonnees client={creerClient()}>
            <Frontiere>
              <Sonde sortie={[]} intervalleMs={v} chemin="/ecritures" />
            </Frontiere>
          </FournisseurDonnees>,
        );
      });
      act(() => r.unmount());
    }
    expect(attrape.length).toBeGreaterThanOrEqual(5);
    expect(attrape.every((e) => e instanceof RangeError)).toBe(true);
    expect(nb()).toBe(0);
    erreurs.mockRestore();
  });
});
