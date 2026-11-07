import { describe, expect, it } from 'vitest';
import { RAISONS } from '../../../noyau/src/securite/types.js';
import { securite } from './securite.js';

const { raisons: RAISONS_TEXTE, capaciteInconnue: CAPACITE_INCONNUE, signalement: SIGNALEMENT, finDeConsultation, bandeauSupport: BANDEAU_SUPPORT } = securite;

const garde = (await import(new URL('../../../../outils/gardes/textes.mjs', import.meta.url).href)) as { MOTS_INTERDITS: string[] };
const MOTS_INTERDITS = garde.MOTS_INTERDITS;

const PHRASES: [string, string][] = [
  ...Object.entries(RAISONS_TEXTE),
  ['capacite', CAPACITE_INCONNUE],
  ...Object.entries(SIGNALEMENT).map(([k, v]): [string, string] => [`signalement.${k}`, v]),
  ['bandeau', BANDEAU_SUPPORT('14:30')],
  ['fin', finDeConsultation],
];

describe('textes de sécurité', () => {
  it('une-phrase-par-raison', () => {
    expect(Object.keys(RAISONS_TEXTE).sort()).toEqual([...RAISONS].sort());
    for (const r of RAISONS) expect(RAISONS_TEXTE[r], r).toBeTypeOf('string');
    expect(RAISONS_TEXTE['role_lecture']).toBe('Votre accès est en lecture seule. Demandez à l’administrateur de votre société de changer votre rôle.');
    expect(RAISONS_TEXTE['mode_saisie_seule']).toBe('En mode Saisie seule, la clôture est faite par votre comptable.');
  });

  it('phrases-non-vides-et-terminees-par-un-point', () => {
    for (const [cle, p] of PHRASES.filter(([c]) => c !== 'fin' && c !== 'signalement.titre' && c !== 'signalement.champCapture')) {
      expect(p.trim(), cle).not.toBe('');
      expect(p, cle).toBe(p.trim());
      expect(p.endsWith('.'), cle).toBe(true);
    }
    for (const [cle, p] of PHRASES) expect(p.trim().length, cle).toBeGreaterThan(0);
    expect(SIGNALEMENT.merci).toBe('Merci, ça nous aide à améliorer le produit.');
  });

  it('vouvoiement', () => {
    for (const [cle, p] of PHRASES) expect(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu.test(p), cle).toBe(false);
    expect(PHRASES.some(([, p]) => /(?<!\p{L})(vous|votre|vos)(?!\p{L})/iu.test(p))).toBe(true);
  });

  it('aucun-delai-promis', () => {
    const delai = /[0-9]+\s*(jours?|heures?|minutes?|h\b|min\b)/iu;
    for (const [cle, p] of PHRASES) expect(delai.test(p), cle).toBe(false);
    expect(delai.test('sous 48 heures')).toBe(true);
    expect(delai.test('dans 5 minutes')).toBe(true);
  });

  it('aucun-mot-interdit', () => {
    expect(MOTS_INTERDITS.length).toBeGreaterThan(0);
    for (const [cle, p] of PHRASES) {
      for (const mot of MOTS_INTERDITS) expect(p.toLowerCase().includes(mot.toLowerCase()), `${cle} : ${mot}`).toBe(false);
    }
  });

  it('bandeau-insere-l-heure', () => {
    expect(BANDEAU_SUPPORT('14:30')).toBe('Le support Axion consulte votre dossier en lecture seule jusqu’à 14:30.');
    expect(BANDEAU_SUPPORT('18:05')).toContain('18:05');
    expect(BANDEAU_SUPPORT('')).toBe('Le support Axion consulte votre dossier en lecture seule jusqu’à .');
    const long = 'x'.repeat(500);
    expect(BANDEAU_SUPPORT(long)).toContain(long);
    expect(BANDEAU_SUPPORT('<b>&"')).toContain('<b>&"');
  });
});
