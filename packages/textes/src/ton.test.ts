import { describe, expect, it } from 'vitest';
import { fr } from './fr.js';
import { messagesTypes } from './messages-types.js';

function feuilles(o: unknown): string[] {
  if (typeof o === 'string') return [o];
  if (typeof o === 'object' && o !== null) return Object.values(o).flatMap(feuilles);
  return [];
}

const tous = [...feuilles(fr), ...feuilles(messagesTypes)];
const types = Object.values(messagesTypes);

function motsParPhrase(texte: string): number[] {
  return texte
    .split(/[.!?…]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.split(/\s+/u).filter((m) => /[\p{L}\p{N}]/u.test(m)).length);
}

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}‍️]/u;
const EURO = /(€|\beuros?\b|\bEUR\b)/iu;
const VERBE_GAIN = /(gagn|économis|epargn|épargn|récupér|recuper|touch|empoch|rembours|rapport|gratuit)/iu;
const TUTOIEMENT = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
const CODE_BRUT = /(\bERR[_-]?\w*\d+|\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|\b(?:HTTP\s*)?[45]\d\d\b|^\s*[\w.-]*\d{3,}\s*$)/u;

describe('ton des textes', () => {
  it('vingt-messages-types', () => {
    expect(types).toHaveLength(20);
    expect(new Set(types).size).toBe(20);
    for (const m of types) expect(m.trim().length).toBeGreaterThan(0);
  });

  it('phrases-de-douze-mots-au-plus', () => {
    for (const m of types) {
      for (const n of motsParPhrase(m)) expect(n, m).toBeLessThanOrEqual(12);
    }
    // le compteur lui-même : 12 passe, 13 échoue
    expect(motsParPhrase('un deux trois quatre cinq six sept huit neuf dix onze douze.')).toEqual([12]);
    expect(motsParPhrase('un deux trois quatre cinq six sept huit neuf dix onze douze treize.')).toEqual([13]);
    expect(motsParPhrase('Bonjour. Merci !')).toEqual([1, 1]);
  });

  it('aucun-emoji', () => {
    expect(tous.length).toBeGreaterThan(20);
    for (const t of tous) expect(EMOJI.test(t), t).toBe(false);
    expect(EMOJI.test('Bravo 🎉')).toBe(true);
    expect(EMOJI.test('Bravo')).toBe(false);
  });

  it('aucune-promesse-en-euros', () => {
    for (const t of tous) {
      expect(EURO.test(t) && VERBE_GAIN.test(t), t).toBe(false);
    }
    const promesse = (t: string) => EURO.test(t) && VERBE_GAIN.test(t);
    expect(promesse('Vous économisez 200 €.')).toBe(true);
    expect(promesse('Vous gagnez 50 euros.')).toBe(true);
    expect(promesse('Le total est de 20 €.')).toBe(false);
    expect(promesse('Vous économisez du temps.')).toBe(false);
  });

  it('vouvoiement-des-messages-types', () => {
    for (const m of types) expect(TUTOIEMENT.test(m), m).toBe(false);
    expect(TUTOIEMENT.test('Tu peux')).toBe(true);
    expect(types.some((m) => /\bvous\b|\bvotre\b|\bvos\b/iu.test(m))).toBe(true);
  });

  it('aucun-code-brut', () => {
    for (const m of types) expect(CODE_BRUT.test(m), m).toBe(false);
    expect(CODE_BRUT.test('ERR_TIMEOUT')).toBe(true);
    expect(CODE_BRUT.test('Erreur 500')).toBe(true);
    expect(CODE_BRUT.test('E4012')).toBe(true);
    expect(CODE_BRUT.test('Le fichier est trop lourd.')).toBe(false);
  });
});
