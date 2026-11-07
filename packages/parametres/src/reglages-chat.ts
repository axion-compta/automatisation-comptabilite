// Réglages du chat (lot 05) : SEUL endroit qui déclare ces nombres (D31). Paramètres datés, sourcés, a_verifier.
// Valeurs de produit PROVISOIRES : la spec 05 n'est pas lisible depuis ce dépôt public, elles restent à confirmer.
// Plafonds de coût et tarifs : aucune valeur ici, ils seront mesurés au banc (Q8).
import { ErreurParametre, parametreAuJour, type ParametreLegal } from './au-jour.js';

const DATE_SPEC = '2026-11-05';
const SOURCE = 'spec 05, valeur provisoire à confirmer';
const SOURCE_ANNULATION = 'spec 05, fichier 04 §6, valeur provisoire à confirmer';

const VALEURS: [cle: string, valeur: number, source?: string][] = [
  ['chat.volume_annonce', 3],
  ['chat.volume_recapitulatif', 10],
  ['chat.volume_max_proposition', 50],
  ['chat.volume_renvoi_ecran', 200],
  ['chat.propositions_par_minute', 10],
  ['chat.objets_par_heure', 200],
  ['chat.annulation_toast_ms', 10_000, SOURCE_ANNULATION],
  ['chat.annulation_historique_ms', 900_000, SOURCE_ANNULATION],
  ['chat.proposition_duree_ms', 1_800_000],
  ['chat.flux_conservation_ms', 300_000],
  ['chat.message_longueur_max', 4000],
  ['chat.preferences_max', 20],
  ['ia.delai_secours_ms', 8000],
  ['ia.appels_par_evenement', 3],
  ['chat.plan_etapes_max', 10],
];

export const REGLAGES_CHAT: ParametreLegal[] = VALEURS.map(([cle, valeur, source]) => ({
  cle,
  pays: 'FR',
  valeur: String(valeur),
  effet_debut: DATE_SPEC,
  effet_fin: null,
  statut: 'a_verifier',
  source: source ?? SOURCE,
  date_releve: DATE_SPEC,
}));

/** Clés sans valeur : plafonds de coût et tarifs, à mesurer au banc (Q8). */
export const PARAMETRES_A_MESURER: readonly string[] = [
  'ia.plafond_tour',
  'ia.plafond_piece',
  'ia.plafond_minute_voix',
  'ia.tarif_entree',
  'ia.tarif_sortie',
  'ia.tarif_voix',
];

/** Entier positif en vigueur à `date` (AAAA-MM-JJ). Clé à mesurer, inconnue, hors date ou non entière : parametre_absent. */
export function reglageEntier(cle: string, date: string, liste: readonly ParametreLegal[] = REGLAGES_CHAT): number {
  if (PARAMETRES_A_MESURER.includes(cle)) throw new ErreurParametre('parametre_absent', cle);
  const { valeur } = parametreAuJour(liste, cle, 'FR', date);
  const n = /^\d+$/.test(valeur) ? Number(valeur) : Number.NaN;
  if (!Number.isSafeInteger(n) || n <= 0) throw new ErreurParametre('parametre_absent', `${cle} « ${valeur} »`);
  return n;
}
