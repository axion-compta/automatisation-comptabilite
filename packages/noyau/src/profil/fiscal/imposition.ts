import { regleDeForme } from '../forme.js';
import type { LigneRegleForme } from '../forme.js';
import { ErreurProfil, IMPOTS, exigerDate } from '../types.js';
import type { Categorie, Impot, RegimeImposition } from '../types.js';

export type LigneImposition = {
  societeId: string;
  effetDebut: string;
  /** Exclue ; null = ligne ouverte. */
  effetFin: string | null;
  impot: Impot;
  categorie: Categorie;
  regime: RegimeImposition;
  motif: string;
  statut: 'propose' | 'confirme';
};
export type ImpotParDefaut = { impot: Impot | null; statut: 'a_confirmer'; motif?: string };

const FORMES_SANS_OPTION_IS = ['EI', 'EURL', 'SCI'];

function verifierLigne(l: LigneImposition): void {
  exigerDate(l.effetDebut, 'effetDebut');
  if (l.effetFin !== null) {
    exigerDate(l.effetFin, 'effetFin');
    if (l.effetFin <= l.effetDebut) throw new ErreurProfil('ordre_inverse');
  }
}

export function ajouterLigneImposition(historique: readonly LigneImposition[], nouvelle: LigneImposition): readonly LigneImposition[] {
  verifierLigne(nouvelle);
  const debut = nouvelle.effetDebut;
  const memes = historique.filter((l) => l.societeId === nouvelle.societeId);
  for (const l of memes) {
    verifierLigne(l);
    if (debut <= l.effetDebut || (l.effetFin !== null && debut < l.effetFin)) throw new ErreurProfil('chevauchement');
  }
  const ajoutee: LigneImposition = { ...nouvelle, effetFin: null };
  const fermee = historique.map((l) => (l.societeId === nouvelle.societeId && l.effetFin === null ? { ...l, effetFin: debut } : l));
  return [...fermee, nouvelle.effetFin === null ? ajoutee : nouvelle];
}

export function impositionAuJour(historique: readonly LigneImposition[], societeId: string, date: string): LigneImposition | null {
  exigerDate(date, 'date');
  for (const l of historique) {
    if (l.societeId !== societeId) continue;
    verifierLigne(l);
    if (l.effetDebut <= date && (l.effetFin === null || date < l.effetFin)) return l;
  }
  return null;
}

/** Impôt proposé selon la matrice ; jamais appliqué seul : le statut reste « a_confirmer ». */
export function impotParDefaut(matrice: readonly LigneRegleForme[], forme: string, associeUniquePersonnePhysique: boolean | null): ImpotParDefaut {
  let cle = forme;
  if (forme === 'EURL') {
    if (associeUniquePersonnePhysique === null) return { impot: null, statut: 'a_confirmer', motif: 'associe_unique_inconnu' };
    cle = associeUniquePersonnePhysique ? 'EURL_PP' : 'EURL_PM';
  }
  const impot = regleDeForme(matrice, cle, 'impot_par_defaut');
  if (impot === null) return { impot: null, statut: 'a_confirmer', motif: 'forme_sans_regle' };
  const valide = IMPOTS.find((i) => i === impot);
  return valide === undefined ? { impot: null, statut: 'a_confirmer', motif: 'valeur_matrice_invalide' } : { impot: valide, statut: 'a_confirmer' };
}

/** Option vers l'IS d'une EI, d'une EURL ou d'une SCI : champ prêt, refusée au MVP. */
export function verifierOptionMvp(forme: string, impotDemande: string, impotParDefautForme: string | null): void {
  if (FORMES_SANS_OPTION_IS.includes(forme) && impotDemande === 'IS' && impotParDefautForme !== 'IS') {
    throw new ErreurProfil('option_pas_encore_prise_en_charge', "Option vers l'IS pas encore prise en charge");
  }
}
