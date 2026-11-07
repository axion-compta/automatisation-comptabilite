// Contrôles CC-T06 (une ligne de TVA par couple taux et nature) et CC-T16 (même code pour un même fournisseur).
// Règles pures, montants en centimes ; aucun texte affiché, comptes et natures en argument.
import { ajouter, soustraire, type Centimes } from '../../argent/index.js';
import type { CodeTraitement } from '../../tva/traitement.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle, alerte, exigerCentimes, ok, type PieceControlee } from './commun.js';

export interface HistoriqueCode {
  fournisseurId: string;
  nature: string;
  code: CodeTraitement;
  /** AAAA-MM-JJ */
  date: string;
}

const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'a_la_demande'];
const CHAMPS = ['ht', 'tva', 'ttc'] as const;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function valeurAbsolue(n: Centimes): Centimes {
  return exigerCentimes(n < 0 ? -n : n);
}

/** CC-T06 : un seul couple (taux, nature) par ligne, somme des lignes = pied, caution jamais en charge. */
export const regleCCT06: RegleControle<{
  piece: PieceControlee;
  comptesDepot: readonly string[];
  naturesCaution: readonly string[];
}> = {
  id: 'CC-T06',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer({ piece, comptesDepot, naturesCaution }): SortieRegle {
    let plusGrand = exigerCentimes(0);
    for (const champ of CHAMPS) {
      let somme = exigerCentimes(0);
      for (const l of piece.lignes) somme = ajouter(somme, exigerCentimes(l[champ]));
      const ecart = valeurAbsolue(soustraire(somme, exigerCentimes(piece.totaux[champ])));
      if (ecart > plusGrand) plusGrand = ecart;
    }
    const vus = new Set<string>();
    let doublon = false;
    let cautionEnCharge = false;
    for (const l of piece.lignes) {
      const couple = JSON.stringify([l.taux, l.nature]);
      if (vus.has(couple)) doublon = true;
      vus.add(couple);
      if (naturesCaution.includes(l.nature) && (l.compte === undefined || !comptesDepot.includes(l.compte))) {
        cautionEnCharge = true;
      }
    }
    if (doublon) return alerte(undefined, 'doublon_couple');
    if (plusGrand > 0) return alerte(plusGrand, 'somme');
    return cautionEnCharge ? alerte(undefined, 'caution_en_charge') : ok();
  },
};

function exigerDate(d: string): string {
  if (!DATE.test(d)) throw new ErreurControle('entree_invalide');
  return d;
}

/** CC-T16 : le code le plus récent du même couple (fournisseur, nature) dans l'exercice doit être le même. */
export const regleCCT16: RegleControle<{
  ligne: { fournisseurId: string; nature: string; code: CodeTraitement };
  historique: readonly HistoriqueCode[];
  exercice: { debut: string; fin: string };
}> = {
  id: 'CC-T16',
  version: 1,
  gravite: 'm',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer({ ligne, historique, exercice }): SortieRegle {
    const debut = exigerDate(exercice.debut);
    const fin = exigerDate(exercice.fin);
    if (debut > fin) throw new ErreurControle('entree_invalide');
    let recent: string | undefined;
    let codes = new Set<CodeTraitement>();
    for (const e of historique) {
      const date = exigerDate(e.date);
      if (e.fournisseurId !== ligne.fournisseurId || e.nature !== ligne.nature) continue;
      if (date < debut || date > fin) continue;
      if (recent === undefined || date > recent) {
        recent = date;
        codes = new Set();
      }
      if (date === recent) codes.add(e.code);
    }
    if (recent === undefined) return ok();
    const identique = codes.size === 1 && codes.has(ligne.code);
    return identique ? ok() : alerte(undefined, 'code_different');
  },
};
