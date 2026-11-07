import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../../../../../packages/noyau/src/pieces/types.js';
import { creerModelePasserelle, type ConfigPasserelle, type FetchPasserelle } from '../modele-passerelle.js';

const TEXTE = 'Facture fictive Dupont Exemple numéro 42';
const config: ConfigPasserelle = {
  adresse: 'https://passerelle.exemple.fr',
  jeton: 'j'.repeat(6),
  routePrincipale: 'route-a',
  routeSecours: 'route-b',
  routesAutorisees: ['route-a', 'route-b'],
  delaiMs: 20,
  microCentimesParCaractere: 3,
};
const entree = { invite: 'invite fictive', texte: TEXTE, versionInvite: 1 };

function reponse(sortie: string, cout: number): Response {
  return new Response(JSON.stringify({ sortie, consommation: { micro_centimes: cout } }), { status: 200 });
}

/** Faux serveur : chaque route a un comportement ; les appels sont notés. */
function serveur(routes: Record<string, 'ok' | 'panne' | 'lent' | number>) {
  const appels: { url: string; corps: string; auth: string | null }[] = [];
  const fetchFaux: FetchPasserelle = async (url, init) => {
    const route = url.slice(url.lastIndexOf('/') + 1);
    appels.push({ url, corps: init.body, auth: init.headers['authorization'] ?? null });
    const mode = routes[route];
    if (mode === 'panne') return new Response('{}', { status: 503 });
    if (mode === 'lent') {
      return new Promise<Response>((_, rejet) => {
        init.signal.addEventListener('abort', () => rejet(new Error('interrompu')));
      });
    }
    return reponse('{"ok":true}', typeof mode === 'number' ? mode : 7);
  };
  return { appels, fetchFaux };
}

describe('modele-passerelle', () => {
  it('appel-route-principale', async () => {
    const s = serveur({ 'route-a': 'ok', 'route-b': 'ok' });
    const modele = creerModelePasserelle(config, { fetch: s.fetchFaux, journal: () => {} });
    const r = await modele.completer(entree);
    expect(r.sortie).toBe('{"ok":true}');
    expect(s.appels).toHaveLength(1);
    expect(s.appels[0]?.url).toBe('https://passerelle.exemple.fr/route-a');
    expect(s.appels[0]?.auth).toBe('Bearer ' + config.jeton);
    expect(s.appels[0]?.corps).toContain(TEXTE);
  });

  it('delai-depasse-bascule-vers-secours', async () => {
    const s = serveur({ 'route-a': 'lent', 'route-b': 'ok' });
    const modele = creerModelePasserelle(config, { fetch: s.fetchFaux, journal: () => {} });
    const r = await modele.completer(entree);
    expect(r.sortie).toBe('{"ok":true}');
    expect(s.appels.map((a) => a.url.slice(a.url.lastIndexOf('/') + 1))).toEqual(['route-a', 'route-b']);
  });

  it('deux-routes-en-panne-ia-indisponible', async () => {
    const s = serveur({ 'route-a': 'panne', 'route-b': 'lent' });
    const modele = creerModelePasserelle(config, { fetch: s.fetchFaux, journal: () => {} });
    await expect(modele.completer(entree)).rejects.toMatchObject({ code: 'ia_indisponible' });
    expect(s.appels).toHaveLength(2);
  });

  it('cout-lu-en-micro-centimes', async () => {
    const s = serveur({ 'route-a': 1234, 'route-b': 'ok' });
    const modele = creerModelePasserelle(config, { fetch: s.fetchFaux, journal: () => {} });
    expect((await modele.completer(entree)).coutMicroCentimes).toBe(1234);
    expect(modele.estimer('abcd')).toBe(4 * config.microCentimesParCaractere);
    for (const mauvais of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const m = creerModelePasserelle(config, { fetch: serveur({ 'route-a': mauvais, 'route-b': mauvais }).fetchFaux, journal: () => {} });
      await expect(m.completer(entree)).rejects.toMatchObject({ code: 'ia_indisponible' });
    }
  });

  it('aucun-contenu-dans-les-journaux', async () => {
    const lignes: string[] = [];
    const s = serveur({ 'route-a': 'panne', 'route-b': 'lent' });
    const modele = creerModelePasserelle(config, { fetch: s.fetchFaux, journal: (l) => lignes.push(l) });
    await modele.completer(entree).catch(() => undefined);
    const ok = serveur({ 'route-a': 'ok', 'route-b': 'ok' });
    await creerModelePasserelle(config, { fetch: ok.fetchFaux, journal: (l) => lignes.push(l) }).completer(entree);
    expect(lignes.length).toBeGreaterThan(0);
    const tout = lignes.join('\n');
    expect(tout).not.toContain('Dupont');
    expect(tout).not.toContain(TEXTE);
    expect(tout).not.toContain(config.jeton);
    for (const mot of (TEXTE + " " + entree.invite).split(/\s+/)) expect(tout).not.toContain(mot);
    for (const l of lignes) expect(l).toMatch(/^passerelle: échec rang [12] \((Error|AbortError|inconnu)\)$/);
  });

  it('cout-par-caractere-valide', () => {
    const faux = serveur({});
    const cree = (v: number) => () => creerModelePasserelle({ ...config, microCentimesParCaractere: v }, { fetch: faux.fetchFaux, journal: () => {} });
    expect(cree(0)).not.toThrow();
    for (const v of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(cree(v)).toThrow(ErreurPiece);
  });

  it('route-hors-liste-refusee', () => {
    const faux = serveur({});
    for (const mauvaise of [{ routePrincipale: 'route-x' }, { routeSecours: '../route-a' }]) {
      expect(() => creerModelePasserelle({ ...config, ...mauvaise }, { fetch: faux.fetchFaux, journal: () => {} })).toThrow(ErreurPiece);
    }
    expect(faux.appels).toHaveLength(0);
  });
});
