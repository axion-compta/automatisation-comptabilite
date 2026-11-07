import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appelerModele, ErreurModele, type ModeleTexte } from '../appel.js';

const LISTE = ['alias-a', 'alias-b'];
const REP = { texte: 'bonjour', jetons: 1, coutMicroCentimes: 1, modele: 'modele-test', version: 'v1' };
const ENTREE = 'question fictive';
const DELAI = 1000;

type Comportement = 'ok' | 'serveur' | 'client' | 'pendu';
function faux(parAlias: Record<string, Comportement>) {
  const appels: { alias: string; entree: string }[] = [];
  const port: ModeleTexte = {
    completer(alias, entree) {
      appels.push({ alias, entree });
      const c = parAlias[alias] ?? 'ok';
      if (c === 'ok') return Promise.resolve({ ...REP, modele: alias });
      if (c === 'pendu') return new Promise(() => undefined);
      return Promise.reject(new ErreurModele(c));
    },
  };
  return { port, appels };
}
const lancer = (
  f: ReturnType<typeof faux>,
  o: { secours?: string; principal?: string; ecriture?: boolean; delaiMs?: number } = {},
) => {
  const reglage = { principal: o.principal ?? 'alias-a', ...(o.secours === undefined ? {} : { secours: o.secours }) };
  return appelerModele({
    port: f.port, reglage, listeFermee: LISTE, entree: ENTREE, delaiMs: o.delaiMs ?? DELAI, ecriture: o.ecriture ?? false,
  });
};

describe("appel du modèle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('principal-ok', async () => {
    const f = faux({});
    const r = await lancer(f, { secours: 'alias-b' });
    expect(r).toEqual({ issue: 'ok', reponse: { ...REP, modele: 'alias-a' } });
    expect(f.appels).toEqual([{ alias: 'alias-a', entree: ENTREE }]);
  });
  it('panne-serveur-un-secours', async () => {
    const f = faux({ 'alias-a': 'serveur' });
    const r = await lancer(f, { secours: 'alias-b' });
    expect(r).toEqual({ issue: 'secours', reponse: { ...REP, modele: 'alias-b' } });
    expect(f.appels).toEqual([{ alias: 'alias-a', entree: ENTREE }, { alias: 'alias-b', entree: ENTREE }]);
  });
  it('delai-depasse-un-secours', async () => {
    const f = faux({ 'alias-a': 'pendu' });
    const p = lancer(f, { secours: 'alias-b' });
    await vi.advanceTimersByTimeAsync(DELAI);
    expect(await p).toEqual({ issue: 'secours', reponse: { ...REP, modele: 'alias-b' } });
    expect(f.appels.map((a) => a.alias)).toEqual(['alias-a', 'alias-b']);
  });
  it('secours-en-panne-arret', async () => {
    const f = faux({ 'alias-a': 'serveur', 'alias-b': 'serveur' });
    expect(await lancer(f, { secours: 'alias-b' })).toEqual({ issue: 'arret', code: 'ia_indisponible' });
    expect(f.appels).toHaveLength(2);
    const g = faux({ 'alias-a': 'serveur', 'alias-b': 'pendu' });
    const p = lancer(g, { secours: 'alias-b' });
    await vi.advanceTimersByTimeAsync(DELAI);
    await vi.advanceTimersByTimeAsync(DELAI);
    expect(await p).toEqual({ issue: 'arret', code: 'ia_indisponible' });
  });
  it('pas-de-secours-arret', async () => {
    const f = faux({ 'alias-a': 'serveur' });
    expect(await lancer(f)).toEqual({ issue: 'arret', code: 'ia_indisponible' });
    expect(f.appels).toHaveLength(1);
  });
  it('alias-hors-liste-sans-appel', async () => {
    const f = faux({});
    expect(await lancer(f, { principal: 'alias-hors-liste' })).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(await lancer(f, { principal: '' })).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(await lancer(f, { principal: 'toString' })).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(f.appels).toHaveLength(0);
  });
  it('secours-hors-liste-arret', async () => {
    const f = faux({ 'alias-a': 'serveur' });
    expect(await lancer(f, { secours: 'alias-hors-liste' })).toEqual({ issue: 'arret', code: 'outil_hors_liste' });
    expect(f.appels).toHaveLength(0);
  });
  it('ecriture-jamais-rejouee', async () => {
    const f = faux({ 'alias-a': 'serveur' });
    expect(await lancer(f, { secours: 'alias-b', ecriture: true })).toEqual({ issue: 'arret', code: 'ia_indisponible' });
    expect(f.appels).toHaveLength(1);
    const g = faux({ 'alias-a': 'pendu' });
    const p = lancer(g, { secours: 'alias-b', ecriture: true });
    await vi.advanceTimersByTimeAsync(DELAI);
    expect(await p).toEqual({ issue: 'arret', code: 'ia_indisponible' });
    expect(g.appels).toHaveLength(1);
    expect((await lancer(faux({}), { secours: 'alias-b', ecriture: true })).issue).toBe('ok');
  });
  it('erreur-client-pas-de-secours', async () => {
    const f = faux({ 'alias-a': 'client' });
    expect(await lancer(f, { secours: 'alias-b' })).toEqual({ issue: 'arret', code: 'ia_indisponible' });
    expect(f.appels).toHaveLength(1);
  });
  it('delai-invalide', async () => {
    for (const d of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const f = faux({});
      expect(await lancer(f, { delaiMs: d })).toEqual({ issue: 'arret', code: 'ia_indisponible' });
      expect(f.appels).toHaveLength(0);
    }
  });
});
