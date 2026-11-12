// Date limite de conservation : la plus longue durée applicable gagne ; gel et doute bloquent toute purge.
// Aucune durée en dur : les règles sont fournies par l'appelant (valeurs sourcées ailleurs).
import { ErreurDate, ajouterAnnees, comparerDates, estDateValide } from '../dates/civiles.js';

export class ErreurConservation extends Error {
  override name = 'ErreurConservation';
  readonly code: 'date_invalide' | 'pays_invalide';
  constructor(code: 'date_invalide' | 'pays_invalide') {
    super(code);
    this.code = code;
  }
}

export type CategorieConservation =
  | 'pieces' | 'ecritures_livres' | 'fec_declarations' | 'etats_pv'
  | 'journal_actions' | 'sauvegardes' | 'conversations' | 'signalements'
  | 'releves_bancaires' | 'rapprochements';
/** Catégories comptables : une purge demandée depuis la console n'y touche pas pendant la conservation. */
export const CATEGORIES_COMPTABLES: readonly CategorieConservation[] = [
  'pieces', 'ecritures_livres', 'fec_declarations', 'etats_pv', 'releves_bancaires', 'rapprochements',
];
export const estCategorieComptable = (c: CategorieConservation): boolean => CATEGORIES_COMPTABLES.includes(c);

export type PointDepart = 'cloture_exercice' | 'date_document' | 'fin_contrat';
export interface RegleConservation {
  pays: string;
  categorie: CategorieConservation;
  dureeAnnees: number | null;
  pointDepart: PointDepart;
  statut: 'non_verifie' | 'a_verifier' | 'valide';
  source: string;
}
export type ResultatConservation =
  | { etat: 'date'; date: string; regle: RegleConservation }
  | { etat: 'a_confirmer'; raison: 'aucune_regle' | 'duree_vide' | 'non_verifie' | 'date_depart_absente' };
export interface Gel {
  pose_le: string;
  leve_le?: string;
}

function exigerPays(pays: string): void {
  if (typeof pays !== 'string' || !/^[A-Z]{2}$/.test(pays)) throw new ErreurConservation('pays_invalide');
}
function exigerDate(date: string): void {
  if (!estDateValide(date)) throw new ErreurConservation('date_invalide');
}
const aConfirmer = (raison: 'aucune_regle' | 'duree_vide' | 'non_verifie' | 'date_depart_absente'): ResultatConservation => ({
  etat: 'a_confirmer',
  raison,
});

export function conserverJusquAu(
  regles: readonly RegleConservation[],
  demande: { pays: string[]; categorie: CategorieConservation; dates: Partial<Record<PointDepart, string>> },
): ResultatConservation {
  demande.pays.forEach(exigerPays);
  regles.forEach((r) => {
    exigerPays(r.pays);
  });
  const retenues = regles.filter((r) => demande.pays.includes(r.pays) && r.categorie === demande.categorie);
  if (retenues.length === 0) return aConfirmer('aucune_regle');
  const dureeOk = (r: RegleConservation): boolean =>
    typeof r.dureeAnnees === 'number' && Number.isSafeInteger(r.dureeAnnees) && r.dureeAnnees >= 0;
  if (!retenues.every(dureeOk)) return aConfirmer('duree_vide');
  if (retenues.some((r) => r.statut !== 'valide')) return aConfirmer('non_verifie');
  let meilleure: { date: string; regle: RegleConservation } | undefined;
  for (const regle of retenues) {
    const depart = demande.dates[regle.pointDepart];
    if (depart === undefined || !estDateValide(depart)) return aConfirmer('date_depart_absente');
    let date: string;
    try {
      date = ajouterAnnees(depart, regle.dureeAnnees ?? 0);
    } catch (e) {
      if (e instanceof ErreurDate) return aConfirmer('duree_vide');
      throw e;
    }
    if (meilleure === undefined || comparerDates(date, meilleure.date) > 0) meilleure = { date, regle };
  }
  return meilleure === undefined ? aConfirmer('aucune_regle') : { etat: 'date', ...meilleure };
}

export function purgePossible(
  resultat: ResultatConservation,
  contexte: { gels: readonly Gel[]; aujourdhui: string },
): { ok: true } | { ok: false; code: 'gel_actif' | 'a_confirmer' | 'trop_tot' } {
  exigerDate(contexte.aujourdhui);
  for (const gel of contexte.gels) {
    exigerDate(gel.pose_le);
    if (gel.leve_le !== undefined) exigerDate(gel.leve_le);
    if (gel.leve_le === undefined) return { ok: false, code: 'gel_actif' };
    const pose = comparerDates(gel.pose_le, contexte.aujourdhui) <= 0;
    if (pose && comparerDates(gel.leve_le, contexte.aujourdhui) > 0) return { ok: false, code: 'gel_actif' };
  }
  if (resultat.etat === 'a_confirmer') return { ok: false, code: 'a_confirmer' };
  return comparerDates(resultat.date, contexte.aujourdhui) < 0 ? { ok: true } : { ok: false, code: 'trop_tot' };
}

const DERIVEES: readonly CategorieConservation[] = ['releves_bancaires', 'rapprochements'];

/** Relevés et rapprochements prennent la durée et le point de départ des pièces, par pays. Une règle explicite est conservée telle quelle. */
export function etendreReglesBancaires(regles: readonly RegleConservation[]): RegleConservation[] {
  const derivees: RegleConservation[] = [];
  for (const categorie of DERIVEES) {
    for (const r of regles) {
      if (r.categorie === 'pieces' && !regles.some((x) => x.categorie === categorie && x.pays === r.pays)) derivees.push({ ...r, categorie });
    }
  }
  return [...regles, ...derivees];
}
