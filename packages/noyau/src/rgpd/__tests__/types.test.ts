import { describe, expect, it } from 'vitest';
import {
  ETATS_DEMANDE, ErreurRgpd, ISSUES, ISSUES_PAR_DROIT, MARQUES, TYPES_DROIT, TYPES_EVENEMENT_PERSONNE,
  donneesPermises, verifierDate, verifierMotif,
} from '../types.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}
const sansDoublon = (l: readonly string[]) => new Set(l).size === l.length;

describe('types rgpd', () => {
  it('six-droits-sans-doublon', () => {
    expect(TYPES_DROIT).toEqual(['acces', 'rectification', 'effacement', 'limitation', 'portabilite', 'opposition']);
    expect(TYPES_EVENEMENT_PERSONNE).toEqual([
      'personne.demande_recue', 'personne.acces_produit', 'personne.portabilite_produite', 'personne.rectification',
      'personne.effacement_refuse', 'personne.marque_a_effacer', 'personne.limitation', 'personne.preference_oubliee',
      'personne.autres_personnes_incluses', 'personne.effacements_rejoues',
    ]);
    expect(sansDoublon(TYPES_DROIT)).toBe(true);
    expect(sansDoublon(TYPES_EVENEMENT_PERSONNE)).toBe(true);
  });

  it('etats-issues-marques-sans-doublon', () => {
    expect(ETATS_DEMANDE).toEqual(['recue', 'en_cours', 'traitee', 'refusee', 'transmise_a_la_societe']);
    expect(ISSUES).toEqual([
      'acces_produit', 'portabilite_produite', 'rectifiee', 'a_effacer', 'limitee', 'refus_conservation', 'refus_gel',
      'renvoi_societe',
    ]);
    expect(MARQUES).toEqual(['a_effacer', 'limitee', 'oubliee']);
    for (const l of [ETATS_DEMANDE, ISSUES, MARQUES]) expect(sansDoublon(l)).toBe(true);
  });

  it('date-reelle-seulement', () => {
    for (const d of ['2026-03-10', '2028-02-29', '2026-12-31']) expect(code(() => verifierDate(d))).toBeUndefined();
    for (const d of ['2026-02-29', '2026-1-5', '', '2026-13-01', '2026-04-31', '2026-03-10 ', '2026-03-10T00:00:00Z', 'NaN']) {
      expect(code(() => verifierDate(d))).toBe('date_invalide');
    }
    expect(code(() => verifierDate(undefined as unknown as string))).toBe('date_invalide');
  });

  it('motif-vide-ou-blanc-refuse', () => {
    for (const m of ['', '   ', '\n\t', 'a'.repeat(501), ` ${'a'.repeat(499)}  x`.padEnd(502, 'y')]) {
      expect(code(() => verifierMotif(m))).toBe('motif_manquant');
    }
    for (const m of ['a', 'a'.repeat(500), `  ${'a'.repeat(500)}  `]) expect(code(() => verifierMotif(m))).toBeUndefined();
    expect(code(() => verifierMotif(5 as unknown as string))).toBe('motif_manquant');
  });

  it('evenement-sans-contenu-de-demande', () => {
    for (const d of [{ nomPersonne: 'x' }, { email: 'x' }, { TEXTE: 'x' }, { montant_total: 1 }, { iban: 'x' }, { contenu: 'x' }, { ok: 1, nom: 'x' },
      { noms: 'x' }, { emails: 'x' }, { prenom: 'x' }, { NOMPersonne: 'x' }, { IBANClient: 'x' }, { textes: 'x' }, { montants: 1 }, { contenus: 'x' }]) {
      expect(code(() => donneesPermises(d))).toBe('valeur_interdite');
    }
    for (const d of [{ nombrePieces: 12 }, {}, { nombre_pieces: 1, etat: 'x' }, { nomenclature: 1 }, { denomination: 1 }]) expect(code(() => donneesPermises(d))).toBeUndefined();
  });

  it('issues-par-droit-completes', () => {
    expect(ISSUES_PAR_DROIT).toEqual({
      acces: ['acces_produit', 'renvoi_societe'],
      rectification: ['rectifiee', 'renvoi_societe'],
      effacement: ['a_effacer', 'refus_conservation', 'refus_gel', 'renvoi_societe'],
      limitation: ['limitee', 'renvoi_societe'],
      portabilite: ['portabilite_produite', 'renvoi_societe'],
      opposition: ['limitee', 'renvoi_societe'],
    });
    for (const t of TYPES_DROIT) expect(ISSUES_PAR_DROIT[t].length).toBeGreaterThan(0);
    const rattachees = new Set(TYPES_DROIT.flatMap((t) => ISSUES_PAR_DROIT[t]));
    for (const i of ISSUES) expect(rattachees.has(i)).toBe(true);
    expect(Object.keys(ISSUES_PAR_DROIT).sort()).toEqual([...TYPES_DROIT].sort());
  });

  it('erreur-porte-son-code', () => {
    const e = new ErreurRgpd('gel_actif');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('gel_actif');
    expect(e.message).toBe('gel_actif');
  });
});
