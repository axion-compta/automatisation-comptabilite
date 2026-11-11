import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, matchRequestUrl, type HttpHandler } from 'msw';

// Marqueurs injectés par le test d'ordre ; vides sinon (les quinze lots sont vides au départ).
const marqueurs = vi.hoisted(() => [] as HttpHandler[]);
const reels = vi.hoisted(() => [] as HttpHandler[][]);
vi.mock('../registres/index.js', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../registres/index.js')>();
  return {
    handlersModules: (ctx: Parameters<typeof reel.handlersModules>[0]) => {
      const modules = reel.handlersModules(ctx);
      reels.push(modules);
      return [...modules, ...marqueurs];
    },
  };
});

import { creerHandlers } from '../handlers.js';
import { handlersGardeAcces } from '../garde-acces.js';

const H = 'http://exemple.fr';

type Info = { methode: string; chemin: string | RegExp };
const infoDe = (h: HttpHandler): Info => {
  const i = h.info as { method: unknown; path: unknown };
  return { methode: typeof i.method === 'string' ? i.method.toUpperCase() : '*' /* http.all : toutes méthodes */, chemin: i.path instanceof RegExp ? i.path : String(i.path) };
};
const correspond = (motif: string | RegExp, chemin: string | RegExp) =>
  typeof chemin === 'string' && matchRequestUrl(new URL(chemin.replace(/:\w+/g, 'valeur-essai')), motif).matches;

/** Masquages module/socle, deux sens, doublon exact compris ; paramètres :id remplacés par une valeur d'essai ; deux RegExp : signalé. */
function masquages(modules: HttpHandler[], socle: HttpHandler[]): string[] {
  const trouves: string[] = [];
  for (const m of modules.map(infoDe)) {
    for (const s of socle.map(infoDe)) {
      if (m.methode !== s.methode && m.methode !== '*' && s.methode !== '*') continue;
      if ((m.chemin instanceof RegExp && s.chemin instanceof RegExp) || correspond(m.chemin, s.chemin) || correspond(s.chemin, m.chemin)) trouves.push(`${m.methode} ${String(m.chemin)} / ${String(s.chemin)}`);
    }
  }
  return trouves;
}

const ok = () => HttpResponse.json({});
const optionsGarde = { base: H, horloge: () => '2026-01-15T10:00:00.000Z', scenarioParDefaut: null, attendre: async () => {} };
const tailleGarde = handlersGardeAcces(optionsGarde).length;

describe('faux serveur : registres par lot', () => {
  it('detecte-un-id-de-module-avant-une-route-statique-du-socle', () => {
    expect(masquages([http.get(H + '/exemples/:id', ok)], [http.get(H + '/exemples/export', ok)])).toHaveLength(1);
  });
  it('detecte-aussi-le-sens-inverse-et-le-doublon-exact', () => {
    expect(masquages([http.get(H + '/autres/export', ok)], [http.get(H + '/autres/:id', ok)])).toHaveLength(1);
    expect(masquages([http.post(H + '/doubles', ok)], [http.post(H + '/doubles', ok)])).toHaveLength(1);
  });
  it('ne-signale-ni-autre-methode-ni-autre-chemin', () => {
    expect(masquages([http.post(H + '/exemples/:id', ok)], [http.get(H + '/exemples/export', ok)])).toEqual([]);
    expect(masquages([http.get(H + '/exemples/:id', ok)], [http.get(H + '/ailleurs/export', ok)])).toEqual([]);
  });
  it('un-module-face-a-une-route-regexp-du-socle-ne-plante-pas', () => {
    const socle = [http.get(/\/exemples\/regex-\d+$/, ok)];
    expect(masquages([http.get(H + '/zzz-essai', ok)], socle)).toEqual([]);
    expect(masquages([http.get(H + '/exemples/regex-12', ok)], socle)).toHaveLength(1);
    expect(masquages([http.get(/\/a$/, ok)], [http.get(/\/b$/, ok)])).toHaveLength(1);
  });
  it('un-module-face-a-un-http-all-du-socle-est-signale', () => {
    const socle = [http.all(H + '/exercices/:exercice/repli', ok)];
    expect(masquages([http.post(H + '/exercices/:exercice/repli', ok)], socle)).toHaveLength(1);
    expect(masquages([http.post(H + '/ailleurs', ok)], socle)).toEqual([]);
  });
  it('aucun-handler-de-module-ne-masque-le-socle-reel', () => {
    marqueurs.length = 0;
    const tous = creerHandlers({ base: H });
    const modules = reels[reels.length - 1] as HttpHandler[];
    const socle = tous.slice(tailleGarde + modules.length);
    expect(socle.length).toBeGreaterThan(0);
    expect(masquages(modules, socle)).toEqual([]);
  });

  it('ordre-garde-puis-modules-puis-socle', () => {
    const marqueur = http.get(H + '/marqueur-module-essai', ok);
    marqueurs.push(marqueur);
    try {
      const tous = creerHandlers({ base: H });
      const garde = handlersGardeAcces(optionsGarde).map((h) => infoDe(h).chemin);
      expect(tous.slice(0, tailleGarde).map((h) => infoDe(h).chemin)).toEqual(garde);
      expect(tous[tailleGarde]).toBe(marqueur);
      expect(infoDe(tous[tailleGarde + 1] as HttpHandler)).toEqual({ methode: 'GET', chemin: H + '/ecritures' });
    } finally {
      marqueurs.length = 0;
    }
  });
});
