import { describe, expect, it } from 'vitest';
import { nomFichierFec } from '../../lignes.js';
import {
  ATTENDU_BROUILLONS_ABSENTS,
  ATTENDU_DIX_HUIT_MOIS,
  ATTENDU_SANS_MOUVEMENT,
  ATTENDU_SIX_MOIS,
  ATTENDU_VINGT_QUATRE_MOIS,
  ENTETE_2,
} from './attendus-2.js';
import { brouillonsPresents, dixHuitMois, sansMouvement, sixMois, vingtQuatreMois } from './jeux-2.js';
import { type JeuBanc, produire } from './outils.js';

const CRLF = String.fromCharCode(13, 10);
const lire = (octets: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(octets);
const identique = (jeu: JeuBanc, attendu: string): void => {
  const octets = produire(jeu);
  expect(lire(octets)).toBe(attendu);
  expect(octets).toEqual(new TextEncoder().encode(attendu));
  expect(octets.subarray(0, 3)).not.toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  expect(lire(octets).endsWith(CRLF)).toBe(false);
};

describe('banc FEC 2', () => {
  it('six-mois-octet-par-octet', () => {
    identique(sixMois, ATTENDU_SIX_MOIS);
    expect(lire(produire(sixMois)).split(CRLF)).toHaveLength(5);
    expect(lire(produire(sixMois))).not.toContain('A nouveaux');
  });
  it('dix-huit-mois-octet-par-octet', () => {
    identique(dixHuitMois, ATTENDU_DIX_HUIT_MOIS);
    expect(lire(produire(dixHuitMois)).split(CRLF)).toHaveLength(5);
  });
  it('vingt-quatre-mois-octet-par-octet', () => {
    identique(vingtQuatreMois, ATTENDU_VINGT_QUATRE_MOIS);
    expect(lire(produire(vingtQuatreMois)).split(CRLF)).toHaveLength(5);
  });
  it('noms-a-la-date-de-cloture', () => {
    const siren = '123456782';
    const noms = ['2026-03-31', '2026-06-30', '2026-06-30'].map((dateCloture) => nomFichierFec({ siren, dateCloture, travail: false }));
    expect(noms).toEqual(['123456782FEC20260331.txt', '123456782FEC20260630.txt', '123456782FEC20260630.txt']);
    expect(nomFichierFec({ siren, dateCloture: '2026-03-31', travail: true })).toBe('123456782FEC20260331_TRAVAIL.txt');
  });
  it('sans-mouvement-en-tete-seul', () => {
    identique(sansMouvement, ATTENDU_SANS_MOUVEMENT);
    const texte = lire(produire(sansMouvement));
    expect(texte).toBe(ENTETE_2);
    expect(texte.split(CRLF)).toHaveLength(1);
    expect(texte.split(String.fromCharCode(9))).toHaveLength(18);
  });
  it('brouillons-absents-octet-par-octet', () => {
    expect(brouillonsPresents.ecritures).toHaveLength(7);
    expect(brouillonsPresents.ecritures.filter((e) => e.statut === 'brouillon')).toHaveLength(4);
    identique(brouillonsPresents, ATTENDU_BROUILLONS_ABSENTS);
    expect(lire(produire(brouillonsPresents)).split(CRLF)).toHaveLength(7);
    expect(lire(produire(brouillonsPresents))).not.toContain('Brouillon');
  });
});
