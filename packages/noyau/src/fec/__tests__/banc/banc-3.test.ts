import { describe, expect, it } from 'vitest';
import { balance } from '../../../livres/balance.js';
import { controlerEquilibre } from '../../controles-equilibre.js';
import { type ParametresLecture, lireFichierFec } from '../../controles-structure.js';
import type { ChampFec } from '../../lignes.js';
import { ATTENDU_A_NOUVEAUX_PAR_TIERS, ATTENDU_CHANGEMENT_DE_LOGICIEL, ATTENDU_PLUSIEURS_JOURNAUX } from './attendus-3.js';
import * as jeux1 from './jeux-1.js';
import * as jeux2 from './jeux-2.js';
import { aNouveauxParTiers, changementDeLogiciel, plusieursJournaux } from './jeux-3.js';
import * as jeux3 from './jeux-3.js';
import { COLONNES_BANC, type JeuBanc, OPTIONS_BANC, produire } from './outils.js';

const TAB = String.fromCharCode(9);
const CRLF = String.fromCharCode(13, 10);
const lire = (octets: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(octets);
const identique = (jeu: JeuBanc, attendu: string): void => {
  const octets = produire(jeu);
  expect(lire(octets)).toBe(attendu);
  expect(octets).toEqual(new TextEncoder().encode(attendu));
  expect(octets.subarray(0, 3)).not.toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  expect(lire(octets).endsWith(CRLF)).toBe(false);
};
const corps = (jeu: JeuBanc): string[][] => lire(produire(jeu)).split(CRLF).slice(1).map((l) => l.split(TAB));
const col = (nom: string): number => COLONNES_BANC.findIndex((x) => x.entete === nom);
const LECTURE: ParametresLecture = {
  colonnes: COLONNES_BANC, options: OPTIONS_BANC, finDeLigne: CRLF, marqueOrdreAcceptee: false,
  obligatoires: ['journalCode', 'ecritureNum', 'ecritureDate', 'ecritureLib'] satisfies ChampFec[],
};
const TOUS: [string, JeuBanc][] = [jeux1, jeux2, jeux3].flatMap((m) => Object.entries(m) as [string, JeuBanc][]);
const cents = (t: string): number => Number(t.replace(',', ''));

describe('banc FEC 3', () => {
  it('plusieurs-journaux-octet-par-octet', () => {
    identique(plusieursJournaux, ATTENDU_PLUSIEURS_JOURNAUX);
    expect([...new Set(corps(plusieursJournaux).map((l) => l[0]))]).toEqual(['AN', 'VE', 'AC', 'BQ1', 'OD']);
  });
  it('a-nouveaux-par-tiers-octet-par-octet', () => {
    identique(aNouveauxParTiers, ATTENDU_A_NOUVEAUX_PAR_TIERS);
    const an = corps(aNouveauxParTiers).filter((l) => l[0] === 'AN' && l[col('CompteNum')] === '411000');
    expect(an.map((l) => l[col('CompAuxNum')])).toEqual(['CLI001', 'CLI002', 'CLI003']);
  });
  it('changement-de-logiciel-octet-par-octet', () => {
    identique(changementDeLogiciel, ATTENDU_CHANGEMENT_DE_LOGICIEL);
    const lignes = corps(changementDeLogiciel);
    expect(lignes.filter((l) => l[0] === 'AN').every((l) => l[col('EcritureDate')] === '20260301')).toBe(true);
    expect(lignes[0]?.[0]).toBe('AN');
  });
  it('aller-retour-memes-soldes', () => {
    for (const [nom, jeu] of TOUS) {
      const lu = lireFichierFec(produire(jeu), LECTURE);
      const soldes = new Map<string, number>();
      for (const l of lu.lignes) {
        const compte = l.valeurs.compteNum;
        soldes.set(compte, (soldes.get(compte) ?? 0) + cents(l.valeurs.debit) - cents(l.valeurs.credit));
      }
      const attendu = balance(jeu.ecritures).lignes.map((x) => [x.compte, x.solde] as const);
      expect([nom, [...soldes.entries()].sort(([a], [b]) => (a < b ? -1 : 1))]).toEqual([nom, attendu]);
      expect(lu.lignes).toHaveLength(jeu.ecritures.filter((e) => e.statut === 'valide').flatMap((e) => e.lignes).length);
    }
  });
  it('aller-retour-zero-ecart-de-structure', () => {
    for (const [nom, jeu] of TOUS) {
      const lu = lireFichierFec(produire(jeu), LECTURE);
      expect([nom, lu.ecarts]).toEqual([nom, []]);
      expect([nom, controlerEquilibre(lu.lignes)]).toEqual([nom, []]);
    }
  });
  it('onze-jeux-presents', () => {
    // La fiche annonce 11 jeux ; le banc en compte 12 (4 + 5 + 3), le douzième jeu (devise) restant hors banc.
    expect(TOUS.map(([nom]) => nom)).toEqual([
      'fecA', 'decale', 'contrePassation', 'lettragePartiel',
      'sixMois', 'dixHuitMois', 'vingtQuatreMois', 'sansMouvement', 'brouillonsPresents',
      'plusieursJournaux', 'aNouveauxParTiers', 'changementDeLogiciel',
    ]);
    expect(new Set(TOUS.map(([, j]) => j)).size).toBe(TOUS.length);
  });
});
