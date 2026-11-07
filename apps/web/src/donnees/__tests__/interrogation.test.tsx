// @vitest-environment jsdom
// Fiche L15-T49 : lecture interrogée toutes les 30 s et relue après chaque action.
import { QueryClient } from '@tanstack/react-query';
import { act } from 'react';
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

async function avancer(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function monter(opts: { intervalleMs?: number; chemin?: string; client?: QueryClient } = {}): Promise<EtatLecture<Env>[]> {
  const sortie: EtatLecture<Env>[] = [];
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
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
    const dernier = sortie[sortie.length - 1];
    expect(['pret', 'vide']).toContain(dernier?.etat);
    expect(typeof dernier?.donnees?.total).toBe('number');
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
    // 300 ms déjà écoulées au montage
    await avancer(INTERVALLE - 500);
    expect(nb()).toBe(1);
    await avancer(100);
    expect(nb()).toBe(1);
  });

  it('relire-apres-action-invalide-les-prefixes', async () => {
    const client = creerClient();
    await monter({ intervalleMs: 3_600_000, client });
    expect(nb()).toBe(1);
    // préfixe qui ne correspond pas : pas de relecture
    await act(async () => {
      await relireApresAction(client, ['/exercices', '/tiers']);
    });
    await avancer(300);
    expect(nb()).toBe(1);
    // aucun préfixe, ou préfixe vide : rien n'est relu
    await act(async () => {
      await relireApresAction(client, []);
      await relireApresAction(client, ['']);
    });
    await avancer(300);
    expect(nb()).toBe(1);
    // préfixe qui correspond : relue
    await act(async () => {
      await relireApresAction(client, ['/exercices', '/ecr']);
    });
    await avancer(300);
    expect(nb()).toBe(2);
    // une clé étrangère à la lecture n'est pas touchée
    let appelsAutre = 0;
    client.setQueryData(['autre', '/ecritures'], 1);
    client.getQueryCache().find({ queryKey: ['autre', '/ecritures'] })?.setOptions({ queryFn: () => ++appelsAutre });
    await act(async () => {
      await relireApresAction(client, ['/ecritures']);
    });
    await avancer(300);
    expect(appelsAutre).toBe(0);
  });

  it('onglet-cache-pas-d-interrogation', async () => {
    await monter();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await avancer(INTERVALLE * 5);
    expect(nb()).toBe(1);
  });

  it('erreur-4xx-pas-de-nouvelle-tentative', async () => {
    // limite 0 : le faux serveur répond 400, sans nouvelle tentative avant l'intervalle
    const sortie = await monter({ chemin: '/ecritures?limite=0', intervalleMs: 3_600_000 });
    await avancer(2000);
    expect(sortie[sortie.length - 1]?.etat).toBe('erreur');
    expect(nb('limite=0')).toBe(1);
  });

  it('intervalle-invalide-refuse', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const v of [0, -1, NaN, Infinity, -Infinity]) {
      const hote = document.createElement('div');
      const r = createRoot(hote);
      const attrape: unknown[] = [];
      class Frontiere extends (await import('react')).Component<{ children: React.ReactNode }> {
        override state = { erreur: false };
        static getDerivedStateFromError(e: unknown) {
          attrape.push(e);
          return { erreur: true };
        }
        override render() {
          return this.state.erreur ? null : this.props.children;
        }
      }
      await act(async () => {
        r.render(
          <FournisseurDonnees client={creerClient()}>
            <Frontiere>
              <Sonde sortie={[]} intervalleMs={v} chemin="/ecritures" />
            </Frontiere>
          </FournisseurDonnees>,
        );
      });
      expect(attrape[0]).toBeInstanceOf(RangeError);
      act(() => r.unmount());
    }
    expect(nb()).toBe(0);
    erreurs.mockRestore();
  });
});
