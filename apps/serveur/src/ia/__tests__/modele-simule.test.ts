import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErreurModele } from '../appel.js';
import { creerModeleSimule, empreinte, enregistrer, normaliser, type ReponsesSimulees } from '../modele-simule.js';

type Entree = { entree: string; texte: string; jetons: number; coutMicroCentimes: number };
const fichier = JSON.parse(readFileSync(new URL('../reponses-simulees.json', import.meta.url), 'utf8')) as Record<string, Entree>;
const signal = new AbortController().signal;
const REP = { texte: 'réponse fictive', jetons: 4, coutMicroCentimes: 2 };

afterEach(() => vi.restoreAllMocks());

describe('modèle simulé', () => {
  it('meme-entree-meme-reponse', async () => {
    const m = creerModeleSimule(enregistrer({}, 'bonjour fictif', REP));
    const a = await m.completer('alias', 'bonjour fictif', signal);
    const b = await m.completer('autre-alias', 'bonjour fictif', signal);
    expect(a).toEqual({ ...REP, modele: 'simule', version: 'simule' });
    expect(b).toEqual(a);
    const base: ReponsesSimulees = {};
    expect(enregistrer(base, 'x', REP)).not.toBe(base);
    expect(base).toEqual({});
  });

  it('normalisation-espaces-et-fins-de-ligne', async () => {
    expect(normaliser('a   b\t\tc')).toBe('a b c');
    expect(normaliser('l1  \r\nl2\rl3 \t\nl4   ')).toBe('l1\nl2\nl3\nl4');
    expect(empreinte('a  b\r\nc  ')).toBe(empreinte('a b\nc'));
    expect(empreinte('a b')).not.toBe(empreinte('ab'));
    expect(empreinte('a\nb')).not.toBe(empreinte('a b'));
    const m = creerModeleSimule(enregistrer({}, 'a b\nc', REP));
    expect((await m.completer('x', 'a   b \r\nc  ', signal)).texte).toBe(REP.texte);
  });

  it('nfc-et-nfd-identiques', () => {
    const nfc = 'café fictif';
    const nfd = 'café fictif';
    expect(nfc).not.toBe(nfd);
    expect(empreinte(nfd)).toBe(empreinte(nfc));
    expect(empreinte(nfc)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('inconnue-non-enregistree', async () => {
    const m = creerModeleSimule(enregistrer({}, 'connue', REP));
    const e = await m.completer('x', 'inconnue', signal).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurModele);
    expect((e as ErreurModele).sorte).toBe('client');
    expect((e as { code: string }).code).toBe('non_enregistree');
    await expect(creerModeleSimule({}).completer('x', 'connue', signal)).rejects.toBeInstanceOf(ErreurModele);
  });

  it('entree-vide', async () => {
    expect(empreinte('')).toBe(createHash('sha256').update('').digest('hex'));
    expect(empreinte('  \n ')).not.toBe(empreinte(''));
    await expect(creerModeleSimule({}).completer('x', '', signal)).rejects.toMatchObject({ code: 'non_enregistree' });
    const m = creerModeleSimule(enregistrer({}, '', REP));
    expect((await m.completer('x', '', signal)).texte).toBe(REP.texte);
  });

  it('zero-appel-reseau', async () => {
    const espion = vi.spyOn(globalThis, 'fetch');
    const m = creerModeleSimule(fichier);
    const premiere = Object.values(fichier)[0]!;
    await m.completer('x', premiere.entree, signal);
    await m.completer('x', 'inconnue', signal).catch(() => undefined);
    expect(espion).toHaveBeenCalledTimes(0);
  });

  it('fichier-de-reponses-valide', () => {
    const lignes = Object.values(fichier);
    expect(lignes.length).toBeGreaterThanOrEqual(6);
    for (const l of lignes) {
      expect(typeof l.entree).toBe('string');
      expect(l.entree.length).toBeGreaterThan(0);
      expect(typeof l.texte).toBe('string');
      expect(Number.isInteger(l.jetons) && l.jetons >= 0).toBe(true);
      expect(Number.isInteger(l.coutMicroCentimes) && l.coutMicroCentimes >= 0).toBe(true);
    }
    expect(lignes.some((l) => l.texte.includes('{{ref:'))).toBe(true);
    expect(JSON.stringify(fichier)).not.toMatch(/@(?!exemple\.fr)/);
  });

  it('empreintes-du-fichier-recalculees', async () => {
    const cles = Object.keys(fichier);
    expect(new Set(cles).size).toBe(cles.length);
    for (const [cle, l] of Object.entries(fichier)) {
      expect(cle).toBe(empreinte(l.entree));
      const r = await creerModeleSimule(fichier).completer('x', l.entree, signal);
      expect(r.texte).toBe(l.texte);
      expect(r.modele).toBe('simule');
    }
  });
});
