import { describe, expect, it } from 'vitest';
import { appelerModele } from '../appel.js';
import { creerModeleConsole, lireListeFermee, type CompleterConsole, type EvenementConsole } from '../passerelle-console.js';

const LISTE = ['alias-a', 'alias-b'];
const ENTREE = 'texte secret fictif';
const DELAI = 1000;
const STATUT_CLIENT = 422;
const STATUT_SERVEUR = 503;

function fauxServeur(comportement: Record<string, 'ok' | 'client' | 'serveur' | 'delai'> = {}, cout: unknown = 42, aCout = true) {
  const appels: { alias: string; entree: string }[] = [];
  const completer: CompleterConsole = (demande) => {
    appels.push({ alias: demande.alias, entree: demande.entree });
    const c = comportement[demande.alias] ?? 'ok';
    if (c === 'client') return Promise.reject({ statut: STATUT_CLIENT });
    if (c === 'serveur') return Promise.reject({ statut: STATUT_SERVEUR });
    if (c === 'delai') return Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' }));
    return Promise.resolve({ texte: 'reponse fictive', jetons: 3, coutMicroCentimes: (aCout ? cout : undefined) as number, modele: demande.alias, version: 'v1' });
  };
  return { completer, appels };
}
function monter(f: ReturnType<typeof fauxServeur>, evenements: EvenementConsole[] = []) {
  return creerModeleConsole({ completer: f.completer, listeFermee: LISTE, journaliser: (e) => evenements.push(e) });
}
const signal = () => new AbortController().signal;

describe('passerelle console', () => {
  it('appel-par-completer', async () => {
    const f = fauxServeur();
    const r = await monter(f).completer('alias-a', ENTREE, signal());
    expect(f.appels).toEqual([{ alias: 'alias-a', entree: ENTREE }]);
    expect(r).toMatchObject({ texte: 'reponse fictive', jetons: 3, modele: 'alias-a', version: 'v1' });
  });

  it('cout-en-micro-centimes', async () => {
    const r = await monter(fauxServeur()).completer('alias-a', ENTREE, signal());
    expect(r.coutMicroCentimes).toBe(42);
    for (const mauvais of [Number.NaN, Infinity, -1, 1.5, '42']) {
      const m = monter(fauxServeur({}, mauvais, mauvais !== undefined));
      await expect(m.completer('alias-a', ENTREE, signal())).rejects.toMatchObject({ sorte: 'serveur' });
    }
  });

  it('alias-hors-liste-refuse', async () => {
    const f = fauxServeur();
    await expect(monter(f).completer('alias-hors-liste', ENTREE, signal())).rejects.toMatchObject({ sorte: 'client' });
    expect(f.appels).toHaveLength(0);
    const r = await appelerModele({
      port: monter(f), reglage: { principal: 'alias-hors-liste' }, listeFermee: LISTE, entree: ENTREE, delaiMs: DELAI, ecriture: false,
    });
    expect(r).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(f.appels).toHaveLength(0);
  });

  it('aucun-contenu-dans-les-journaux', async () => {
    const evenements: EvenementConsole[] = [];
    await monter(fauxServeur(), evenements).completer('alias-a', ENTREE, signal());
    await monter(fauxServeur({ 'alias-a': 'serveur' }), evenements).completer('alias-a', ENTREE, signal()).catch(() => undefined);
    await monter(fauxServeur(), evenements).completer('alias-hors-liste', ENTREE, signal()).catch(() => undefined);
    expect(evenements.length).toBeGreaterThanOrEqual(3);
    const texte = JSON.stringify(evenements);
    expect(texte).not.toContain(ENTREE);
    expect(texte).not.toContain('reponse fictive');
  });

  it('secours-meme-zone', async () => {
    const f = fauxServeur({ 'alias-a': 'serveur' });
    const r = await appelerModele({
      port: monter(f), reglage: { principal: 'alias-a', secours: 'alias-b' }, listeFermee: LISTE, entree: ENTREE, delaiMs: DELAI, ecriture: false,
    });
    expect(r).toMatchObject({ issue: 'secours', reponse: { modele: 'alias-b' } });
    expect(f.appels.map((a) => a.alias)).toEqual(['alias-a', 'alias-b']);
    const hors = fauxServeur({ 'alias-a': 'serveur' });
    const arret = await appelerModele({
      port: monter(hors), reglage: { principal: 'alias-a', secours: 'alias-hors-liste' }, listeFermee: LISTE, entree: ENTREE, delaiMs: DELAI, ecriture: false,
    });
    expect(arret).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(hors.appels).toHaveLength(0);
  });

  it('erreurs-classees', async () => {
    await expect(monter(fauxServeur({ 'alias-a': 'client' })).completer('alias-a', ENTREE, signal())).rejects.toMatchObject({ sorte: 'client' });
    await expect(monter(fauxServeur({ 'alias-a': 'delai' })).completer('alias-a', ENTREE, signal())).rejects.toMatchObject({ sorte: 'delai' });
    await expect(monter(fauxServeur({ 'alias-a': 'serveur' })).completer('alias-a', ENTREE, signal())).rejects.toMatchObject({ sorte: 'serveur' });
  });

  it('liste-lue-dans-la-configuration', () => {
    expect(lireListeFermee(['alias-a', 'alias-b'])).toEqual(['alias-a', 'alias-b']);
    for (const mauvaise of [undefined, null, 'alias-a', [], [''], [' '], ['alias-a', 3], {}]) {
      expect(() => lireListeFermee(mauvaise)).toThrow();
    }
  });
});
