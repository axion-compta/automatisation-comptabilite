// Catalogue MVP des alertes (AL-R2, AL-R4) : source de la future table regle_alerte. Codes seulement, aucun texte affiché.
import type { GraviteAlerte } from '../interface/types.js';
import type { NatureRegle } from './gravite.js';
import type { Constat } from './moteur.js';
import { alr01, alr03, alr04 } from './regles/echeances.js';
import { alr02, alr05, alr06, alr07 } from './regles/pieces-tva.js';
import { alr08, alr09, alr10, alr11 } from './regles/tiers-banque.js';

export const ENTREES_MENU = ['activite', 'mois', 'banque', 'factures', 'declarations', 'documents'] as const;
export type EntreeMenu = (typeof ENTREES_MENU)[number];

export interface RegleAlerte {
  code: string;
  version: number;
  perimetre: 'MVP' | 'V1' | 'V2';
  entreeMenu: EntreeMenu;
  graviteBase: GraviteAlerte;
  nature: NatureRegle;
  actionPrincipale: string;
  actif: boolean;
  // Chaque règle a ses propres entrées : le moteur les fournit, le catalogue seulement les relie.
  evaluer: (...args: never[]) => readonly Constat[];
}

const VERSION_INITIALE = 1;

const regle = (
  code: string,
  entreeMenu: EntreeMenu,
  graviteBase: GraviteAlerte,
  nature: NatureRegle,
  actionPrincipale: string,
  evaluer: RegleAlerte['evaluer'],
): RegleAlerte =>
  Object.freeze({ code, version: VERSION_INITIALE, perimetre: 'MVP', entreeMenu, graviteBase, nature, actionPrincipale, actif: true, evaluer });

export const CATALOGUE_MVP: readonly RegleAlerte[] = Object.freeze([
  regle('ALR-01', 'declarations', 'a_faire', 'echeance_legale', 'ouvrir_declaration_tva', alr01),
  regle('ALR-02', 'banque', 'a_faire', 'autre', 'rattacher_piece', alr02),
  regle('ALR-03', 'mois', 'a_faire', 'autre', 'ouvrir_mois', alr03),
  regle('ALR-04', 'declarations', 'a_faire', 'echeance_legale', 'ouvrir_echeance', alr04),
  regle('ALR-05', 'documents', 'a_faire', 'blocage', 'relire_piece', alr05),
  regle('ALR-06', 'documents', 'bloquant', 'blocage', 'completer_piece', alr06),
  regle('ALR-07', 'declarations', 'bloquant', 'blocage', 'verifier_capitaux', alr07),
  regle('ALR-08', 'factures', 'a_faire', 'autre', 'relancer_client', alr08),
  regle('ALR-09', 'factures', 'urgent', 'argent', 'payer_facture', alr09),
  regle('ALR-10', 'banque', 'a_faire', 'argent', 'ouvrir_rapprochement', alr10),
  regle('ALR-11', 'activite', 'a_faire', 'autre', 'lire_commentaire', alr11),
]);
