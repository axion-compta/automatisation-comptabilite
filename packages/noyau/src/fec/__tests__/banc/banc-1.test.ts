import { describe, expect, it } from 'vitest';
import { ATTENDU_CONTRE_PASSATION, ATTENDU_DECALE, ATTENDU_FEC_A, ATTENDU_LETTRAGE_PARTIEL } from './attendus-1.js';
import { contrePassation, decale, fecA, lettragePartiel } from './jeux-1.js';
import { COLONNES_BANC, type JeuBanc, produire } from './outils.js';

const TAB = String.fromCharCode(9);
const CRLF = String.fromCharCode(13, 10);
const lire = (octets: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(octets);
const identique = (jeu: JeuBanc, attendu: string): void => {
  const octets = produire(jeu);
  expect(lire(octets)).toBe(attendu); // diagnostic lisible
  expect(octets).toEqual(new TextEncoder().encode(attendu)); // puis octet par octet
  expect(octets.subarray(0, 3)).not.toEqual(new Uint8Array([0xef, 0xbb, 0xbf])); // sans marque d'ordre
  expect(lire(octets).endsWith(CRLF)).toBe(false); // sans fin de ligne finale
};
const corps = (jeu: JeuBanc): string[][] =>
  lire(produire(jeu)).split(CRLF).slice(1).map((l) => l.split(TAB));
const colonne = (nom: string): number => COLONNES_BANC.findIndex((x) => x.entete === nom);
const cents = (texte: string | undefined): number => Number((texte ?? '').replace(',', ''));

describe('banc FEC 1', () => {
  it('fec-a-octet-par-octet', () => {
    identique(fecA, ATTENDU_FEC_A);
    expect(COLONNES_BANC).toHaveLength(18);
  });
  it('fec-a-huit-lignes-19000', () => {
    const lignes = corps(fecA);
    expect(lignes).toHaveLength(8); // le brouillon de 50,00 est absent
    expect(lire(produire(fecA)).split(CRLF)).toHaveLength(9);
    expect(lignes.every((l) => l.length === 18)).toBe(true);
    const somme = (nom: string): number => lignes.reduce((total, l) => total + cents(l[colonne(nom)]), 0);
    expect(somme('Debit')).toBe(1900000);
    expect(somme('Credit')).toBe(1900000);
    expect(lire(produire(fecA))).not.toContain('Brouillon');
  });
  it('fec-a-an-en-premier-et-zero-virgule', () => {
    const lignes = corps(fecA);
    expect(lignes[0]?.[colonne('JournalCode')]).toBe('AN');
    expect(lignes.slice(0, 2).every((l) => l[colonne('JournalCode')] === 'AN')).toBe(true);
    const vente = lignes.find((l) => l[colonne('CompteNum')] === '706000');
    expect(vente?.[colonne('Debit')]).toBe('0,00');
    expect(vente?.[colonne('Credit')]).toBe('10000,00');
  });
  it('decale-octet-par-octet', () => {
    identique(decale, ATTENDU_DECALE);
    expect(lire(produire(decale))).toBe(ATTENDU_DECALE);
  });
  it('contre-passation-octet-par-octet', () => {
    identique(contrePassation, ATTENDU_CONTRE_PASSATION);
    expect(lire(produire(contrePassation))).toBe(ATTENDU_CONTRE_PASSATION);
  });
  it('lettrage-partiel-octet-par-octet', () => {
    identique(lettragePartiel, ATTENDU_LETTRAGE_PARTIEL);
    expect(lire(produire(lettragePartiel))).toBe(ATTENDU_LETTRAGE_PARTIEL);
  });
});
