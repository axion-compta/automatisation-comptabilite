import { describe, expect, it } from 'vitest';
import * as T from '../types.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof T.ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

const LISTES: Record<string, readonly string[]> = {
  FORMES: ['EI', 'EURL', 'SARL', 'SASU', 'SAS', 'SCI'],
  FORMES_REFUSEES_MVP: ['association'],
  ORIGINES: ['document', 'sirene', 'declaration', 'fec_reprise', 'saisie_personne', 'proposition_ia'],
  CONFIANCES: ['sur', 'a_verifier', 'douteux'],
  STATUTS_CHAMP: ['confirme', 'a_confirmer', 'vide', 'je_ne_sais_pas'],
  ETATS_PROFIL: ['incomplet', 'a_confirmer', 'complet'],
  TENUES: ['partie_double', 'livre_recettes'],
  REGIMES_TVA: ['franchise', 'reel_simplifie', 'reel_normal', 'non_assujetti'],
  IMPOTS: ['IS', 'IR'],
  CATEGORIES: ['BIC', 'BNC', 'revenus_fonciers'],
  REGIMES_IMPOSITION: ['micro', 'reel_simplifie', 'reel_normal', 'declaration_controlee'],
  MOTIFS_CHANGEMENT: ['creation', 'option', 'depassement_seuil', 'bascule_legale', 'correction'],
  REPONSES_CAC: ['oui', 'non', 'je_ne_sais_pas'],
};
const reel = T as unknown as Record<string, readonly string[]>;

describe('types du profil', () => {
  it('listes-sans-doublon', () => {
    for (const nom of Object.keys(LISTES)) {
      const l = reel[nom] as readonly string[];
      expect(new Set(l).size, nom).toBe(l.length);
    }
  });
  it('listes-figees', () => {
    for (const [nom, attendu] of Object.entries(LISTES)) expect(reel[nom], nom).toEqual(attendu);
  });
  it('erreur-profil-porte-son-code', () => {
    const e = new T.ErreurProfil('mon_code');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('mon_code');
    expect(e.name).toBe('ErreurProfil');
    expect(e.message).toBe('mon_code');
    expect(new T.ErreurProfil('c', 'texte').message).toBe('texte');
  });
  it('est-dans-refuse-inconnu', () => {
    expect(T.estDans(T.FORMES, 'SARL')).toBe(true);
    for (const v of ['', 'sarl', 'SARL ', undefined, null, 3]) expect(T.estDans(T.FORMES, v)).toBe(false);
    expect(T.estDans(T.FORMES, 'association')).toBe(false);
  });
  it('date-iso-stricte', () => {
    for (const t of ['2026-02-30', '2026-13-01', '2026-1-1', '', ' 2026-01-01', '2026-01-01 ', '2026-00-10', '2026-01-00', '2027-02-29', 20260101, null])
      expect(T.estDateIso(t), String(t)).toBe(false);
    for (const t of ['2028-02-29', '2026-12-31', '0099-01-01']) expect(T.estDateIso(t), t).toBe(true);
    expect(code(() => T.exigerDate('2026-02-30', 'debut'))).toBe('date_invalide');
    expect(T.exigerDate('2026-02-01', 'debut')).toBe('2026-02-01');
    expect(T.comparerDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(T.comparerDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(T.comparerDates('2026-01-01', '2026-01-01')).toBe(0);
    expect(code(() => T.comparerDates('x', '2026-01-01'))).toBe('date_invalide');
    expect(code(() => T.comparerDates('2026-01-01', 'x'))).toBe('date_invalide');
  });
  it('ajouter-jours-traverse-l-annee', () => {
    expect(T.ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(T.ajouterJours('2027-01-01', -1)).toBe('2026-12-31');
    expect(T.ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(T.ajouterJours('2027-02-28', 1)).toBe('2027-03-01');
    expect(T.ajouterJours('2026-05-05', 0)).toBe('2026-05-05');
    expect(T.ajouterJours('0099-12-31', 1)).toBe('0100-01-01');
    expect(code(() => T.ajouterJours('9999-12-31', 1))).toBe('date_invalide');
    expect(code(() => T.ajouterJours('0000-01-01', -1))).toBe('date_invalide');
    expect(code(() => T.ajouterJours('2026-02-30', 1))).toBe('date_invalide');
  });
  it('decalage-invalide-refuse', () => {
    for (const n of [Number.NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 2, '1' as unknown as number])
      expect(code(() => T.ajouterJours('2026-01-01', n)), String(n)).toBe('decalage_invalide');
    expect(code(() => T.ajouterJours('2026-01-01', Number.MAX_SAFE_INTEGER))).toBe('date_invalide');
  });
  it('jours-inclus-bornes', () => {
    expect(T.joursInclus('2026-03-03', '2026-03-03', 1)).toBe(1);
    expect(T.joursInclus('2026-07-01', '2026-12-31', 400)).toBe(184);
    expect(T.joursInclus('2027-01-01', '2027-12-31', 366)).toBe(365);
    expect(T.joursInclus('2028-01-01', '2028-12-31', 366)).toBe(366);
    expect(T.joursInclus('2026-12-31', '2027-01-01', 2)).toBe(2);
  });
  it('jours-inclus-refus', () => {
    expect(code(() => T.joursInclus('2026-03-04', '2026-03-03', 10))).toBe('ordre_inverse');
    expect(code(() => T.joursInclus('2026-01-01', '2026-01-10', 9))).toBe('ecart_trop_grand');
    expect(code(() => T.joursInclus('2026-01-01', '2026-01-02', 1))).toBe('ecart_trop_grand');
    expect(code(() => T.joursInclus('2026-01-01', '2026-01-01', 0))).toBe('ecart_trop_grand');
    for (const max of [1.5, Number.NaN, Infinity, -1]) expect(code(() => T.joursInclus('2026-01-01', '2026-01-02', max)), String(max)).toBe('ecart_trop_grand');
    expect(code(() => T.joursInclus('x', '2026-01-02', 5))).toBe('date_invalide');
    expect(code(() => T.joursInclus('2026-01-01', 'x', 5))).toBe('date_invalide');
  });
});
