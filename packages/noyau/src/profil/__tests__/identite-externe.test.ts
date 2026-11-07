import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErreurProfil } from '../types.js';
import { cleTvaFrancaise } from '../identifiants.js';
import { rechercherSirene, statutVies } from '../identite-externe.js';
import type { Horloge, SourceSirene, SourceVies } from '../identite-externe.js';

const SIREN = '123456782';
const NUMERO_TVA = 'FR' + cleTvaFrancaise(SIREN) + SIREN;
const DELAI_TEST = 40;
const ATTENTE_AVANT_ECHEANCE = 39;
const ATTENTE_ECHEANCE = 1;
const DELAIS_INVALIDES = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5];
const REPONSE = { trouve: true, denomination: 'Atelier Exemple', forme: 'SARL', dateReponse: '2026-03-01' } as const;

const horloge: Horloge = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) };
const reglage = { delaiMaxMs: DELAI_TEST, horloge };
const code = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const sireneQui = (f: SourceSirene['chercher']): SourceSirene & { appels: number } => {
  const s = { appels: 0, chercher: (siren: string, signal: AbortSignal) => { s.appels += 1; return f(siren, signal); } };
  return s;
};
const viesQui = (f: SourceVies['verifier']): SourceVies & { appels: number } => {
  const s = { appels: 0, verifier: (n: string, signal: AbortSignal) => { s.appels += 1; return f(n, signal); } };
  return s;
};
const jamais = (): Promise<never> => new Promise<never>(() => undefined);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});

describe('identité externe : replis', () => {
  it('sirene-trouve', async () => {
    const source = sireneQui(async () => REPONSE);
    expect(await rechercherSirene(source, ' 123 456 782 ', reglage)).toEqual({ etat: 'trouve', origine: 'sirene', denomination: 'Atelier Exemple', forme: 'SARL', dateReponse: '2026-03-01' });
    expect(source.appels).toBe(1);
  });

  it('sirene-introuvable', async () => {
    expect(await rechercherSirene(sireneQui(async () => ({ trouve: false })), SIREN, reglage)).toEqual({ etat: 'introuvable' });
  });

  it('sirene-panne-saisie-manuelle', async () => {
    const manuelle = { etat: 'saisie_manuelle', origine: 'saisie_personne' };
    expect(await rechercherSirene(sireneQui(async () => Promise.reject(new Error('panne'))), SIREN, reglage)).toEqual(manuelle);
    expect(await rechercherSirene(sireneQui(() => { throw new Error('panne synchrone'); }), SIREN, reglage)).toEqual(manuelle);
    expect(await rechercherSirene(sireneQui((async () => ({ trouve: true })) as unknown as SourceSirene['chercher']), SIREN, reglage)).toEqual(manuelle);
  });

  it('sirene-delai-depasse-p03', async () => {
    let signalRecu: AbortSignal | undefined;
    const source = sireneQui((_s, signal) => {
      signalRecu = signal;
      return jamais();
    });
    const attente = rechercherSirene(source, SIREN, reglage);
    await vi.advanceTimersByTimeAsync(ATTENTE_AVANT_ECHEANCE);
    expect(signalRecu?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(ATTENTE_ECHEANCE);
    expect(await attente).toEqual({ etat: 'saisie_manuelle', origine: 'saisie_personne' });
    expect(signalRecu?.aborted).toBe(true);
  });

  it('siren-invalide-sans-appel', async () => {
    const source = sireneQui(async () => REPONSE);
    for (const siren of ['123456789', '', 'abc', '12345678']) {
      expect(await rechercherSirene(source, siren, reglage)).toEqual({ etat: 'refuse', motif: 'siren_invalide' });
    }
    expect(source.appels).toBe(0);
    const vies = viesQui(async () => 'valide');
    expect(await statutVies(vies, 'FR00' + SIREN, reglage)).toBe('invalide');
    expect(await statutVies(vies, 'FR12', reglage)).toBe('invalide');
    expect(vies.appels).toBe(0);
  });

  it('vies-valide-verifie', async () => {
    const vies = viesQui(async () => 'valide');
    expect(await statutVies(vies, NUMERO_TVA, reglage)).toBe('verifie');
    expect(await statutVies(viesQui(async () => 'invalide'), NUMERO_TVA, reglage)).toBe('invalide');
    expect(await statutVies(vies, 'DE000000000', reglage)).toBe('verifie');
    expect(vies.appels).toBe(2);
  });

  it('vies-panne-jamais-verifie', async () => {
    expect(await statutVies(viesQui(async () => Promise.reject(new Error('panne'))), NUMERO_TVA, reglage)).toBe('non_verifie');
    expect(await statutVies(viesQui(() => { throw new Error('panne synchrone'); }), NUMERO_TVA, reglage)).toBe('non_verifie');
    expect(await statutVies(viesQui((async () => 'peut-etre') as unknown as SourceVies['verifier']), NUMERO_TVA, reglage)).toBe('non_verifie');
    let signalRecu: AbortSignal | undefined;
    const attente = statutVies(viesQui((_n, signal) => { signalRecu = signal; return jamais(); }), NUMERO_TVA, reglage);
    await vi.advanceTimersByTimeAsync(DELAI_TEST);
    expect(await attente).toBe('non_verifie');
    expect(signalRecu?.aborted).toBe(true);
  });

  it('delai-invalide-refuse', async () => {
    const sirene = sireneQui(async () => REPONSE);
    const vies = viesQui(async () => 'valide');
    for (const delaiMaxMs of DELAIS_INVALIDES) {
      expect(await code(rechercherSirene(sirene, SIREN, { delaiMaxMs, horloge }))).toBe('delai_invalide');
      expect(await code(statutVies(vies, NUMERO_TVA, { delaiMaxMs, horloge }))).toBe('delai_invalide');
    }
    expect(await code(rechercherSirene(sirene, '123456789', { delaiMaxMs: 0, horloge }))).toBe('delai_invalide');
    expect(sirene.appels + vies.appels).toBe(0);
  });
});
