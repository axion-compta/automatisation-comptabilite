// Contrôles CC-K05 (lignes = pied de facture) et CC-K06 (montant dû qualifié).
// Montants en centimes, règles pures ; aucun texte affiché, tolérance en argument.
import { ajouter, soustraire, type Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle, alerte, exigerCentimes, ok, type PieceControlee } from './commun.js';

export interface Qualification {
  motif: 'acompte_verse' | 'avoir' | 'remise' | 'retenue';
  montant: Centimes;
}

const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'nocturne', 'a_la_demande'];
const CHAMPS = ['ht', 'tva', 'ttc'] as const;

function valeurAbsolue(n: Centimes): Centimes {
  return exigerCentimes(n < 0 ? -n : n);
}

/** CC-K05 : somme des lignes = totaux HT, TVA et TTC du pied, dans la tolérance. */
export const regleCCK05: RegleControle<{ piece: PieceControlee; tolerance?: Centimes }> = {
  id: 'CC-K05',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer({ piece, tolerance }): SortieRegle {
    if (tolerance === undefined) throw new ErreurControle('parametre_absent');
    if (exigerCentimes(tolerance) < 0) throw new ErreurControle('parametre_invalide');
    let plusGrand = exigerCentimes(0);
    let premier: (typeof CHAMPS)[number] | undefined;
    for (const champ of CHAMPS) {
      let somme = exigerCentimes(0);
      for (const l of piece.lignes) somme = ajouter(somme, exigerCentimes(l[champ]));
      const ecart = valeurAbsolue(soustraire(somme, exigerCentimes(piece.totaux[champ])));
      if (ecart > plusGrand) plusGrand = ecart;
      if (ecart > tolerance && premier === undefined) premier = champ;
    }
    return premier === undefined ? ok() : alerte(plusGrand, premier);
  },
};

/** CC-K06 : un montant dû différent du TTC est expliqué exactement par les qualifications. */
export const regleCCK06: RegleControle<{ piece: PieceControlee; qualifications: readonly Qualification[] }> = {
  id: 'CC-K06',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer({ piece, qualifications }): SortieRegle {
    const ttc = exigerCentimes(piece.totaux.ttc);
    let qualifie = exigerCentimes(0);
    for (const q of qualifications) {
      if (exigerCentimes(q.montant) < 0) throw new ErreurControle('entree_invalide');
      qualifie = ajouter(qualifie, q.montant);
    }
    if (piece.montantDu === undefined) return ok();
    const difference = soustraire(ttc, exigerCentimes(piece.montantDu));
    if (difference === 0) return ok();
    if (difference < 0) return alerte(valeurAbsolue(difference), 'ARITH');
    const reste = soustraire(difference, qualifie);
    return reste === 0 ? ok() : alerte(valeurAbsolue(reste), 'ARITH');
  },
};
