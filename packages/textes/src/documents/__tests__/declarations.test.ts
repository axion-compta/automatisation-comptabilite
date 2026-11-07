import { describe, expect, it } from 'vitest';
import { datesIndicatives, filigranes, mentionDocument, messagesDeclarations, piecesARegarder } from '../declarations.js';

const CODES = [
  'siren_absent', 'mode_saisie_seule', 'exercice_non_cloture', 'autre_entreprise', 'doublon', 'fichier_de_travail', 'prorata',
  'lien_expire', 'tva_en_doute', 'regime_non_traite', 'ligne_absente', 'base_negative', 'controle_bloquant_ouvert', 'conserver_originaux',
] as const;

function tousLesTextes(): string[] {
  return [
    ...Object.values(messagesDeclarations), ...Object.values(filigranes),
    mentionDocument(), mentionDocument({ validePar: 'Camille Fictif', valideLe: '2026-05-12' }),
    piecesARegarder(0), piecesARegarder(1), piecesARegarder(4), datesIndicatives('2026-01-01', '2026-12-31'),
  ];
}

describe('textes des déclarations', () => {
  it('phrases-exactes-de-la-spec', () => {
    expect(messagesDeclarations.siren_absent).toBe('Ajoutez votre numéro SIREN pour préparer ce fichier');
    expect(messagesDeclarations.mode_saisie_seule).toBe('Votre expert-comptable réalise la clôture : je vous montre une vue indicative');
    expect(messagesDeclarations.autre_entreprise).toBe('Ce fichier appartient à une autre entreprise');
    expect(messagesDeclarations.prorata).toBe('Votre déclaration demande un calcul de prorata : à faire avec votre expert-comptable');
    expect(messagesDeclarations.lien_expire).toBe('Ce lien a expiré : demandez-en un nouveau');
    expect(messagesDeclarations.conserver_originaux).toBe('Conservez vos justificatifs originaux');
    expect(datesIndicatives('2026-01-01', '2026-12-31')).toBe(
      'Dates indicatives, calculées sur votre année comptable du 01/01 au 31/12. À vérifier sur impots.gouv.fr et urssaf.fr.',
    );
    expect(datesIndicatives('2025-07-01', '2026-06-30')).toContain('du 01/07 au 30/06.');
    expect(() => datesIndicatives('2026-13-01', '2026-12-31')).toThrow();
    expect(() => datesIndicatives('2026-01-01', '31/12/2026')).toThrow();
  });

  it('mention-avant-et-apres-validation', () => {
    expect(mentionDocument()).toBe('Préparé par IA, à valider');
    expect(mentionDocument({ validePar: 'Camille Fictif', valideLe: '2026-05-12' })).toBe(
      'Préparé par IA, à valider. Validé par Camille Fictif le 12/05/2026',
    );
    for (const mauvaise of ['', '12/05/2026', '2026-5-12', '2026-00-12', '2026-05-32', 'NaN', '2026-05-12x']) {
      expect(() => mentionDocument({ validePar: 'Camille Fictif', valideLe: mauvaise })).toThrow();
    }
    expect(() => mentionDocument({ validePar: 'Camille Fictif' })).toThrow();
    expect(() => mentionDocument({ valideLe: '2026-05-12' })).toThrow();
    expect(() => mentionDocument({ validePar: '  ', valideLe: '2026-05-12' })).toThrow();
  });

  it('pluriel-pieces', () => {
    expect(piecesARegarder(0)).toBe('Il ne reste aucune pièce à regarder');
    expect(piecesARegarder(1)).toBe('Il reste 1 pièce à regarder');
    expect(piecesARegarder(2)).toBe('Il reste 2 pièces à regarder');
    expect(piecesARegarder(12)).toBe('Il reste 12 pièces à regarder');
    for (const mauvais of [NaN, Infinity, -Infinity, -1, 1.5]) expect(() => piecesARegarder(mauvais)).toThrow();
  });

  it('chaque-code-a-une-phrase-non-vide', () => {
    expect(Object.keys(messagesDeclarations).sort()).toEqual([...CODES].sort());
    for (const c of CODES) expect(messagesDeclarations[c].trim().length).toBeGreaterThan(0);
    expect(filigranes.indicatif).toBe('Indicatif');
    expect(filigranes.non_officiel).toBe('Non officiel');
    expect(Object.keys(filigranes).sort()).toEqual(['a_valider', 'indicatif', 'non_officiel', 'provisoire']);
    for (const f of Object.values(filigranes)) expect(f.trim().length).toBeGreaterThan(0);
  });

  it('vouvoiement-sauf-citation', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const t of tousLesTextes()) expect(t).not.toMatch(tutoiement);
    expect(messagesDeclarations.mode_saisie_seule).toContain('je vous montre');
  });

  it('aucun-mot-interdit', () => {
    const mots = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));
    for (const t of tousLesTextes()) {
      for (const m of mots) expect(t.toLowerCase()).not.toContain(m.toLowerCase());
    }
  });
});
