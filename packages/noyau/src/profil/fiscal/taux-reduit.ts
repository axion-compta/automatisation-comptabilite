import type { Centimes } from '../../argent/index.js';
import { ErreurProfil } from '../types.js';

export type StatutTauxReduit = 'eligible' | 'non_eligible' | 'a_confirmer';
export type EntreeTauxReduit = {
  caCentimes: Centimes | null;
  dureeMois: number;
  capitalLibere: boolean | null;
  detentionPpPdb: number | null;
};
export type SeuilsTauxReduit = { caMaxCentimes: Centimes; detentionMinPdb: number };

const MOIS_PAR_AN = 12;

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function invalide(): never {
  throw new ErreurProfil('entree_invalide');
}

/** Éligibilité au taux réduit d'IS ; une donnée manquante donne `a_confirmer`, jamais `eligible`. */
export function eligibiliteTauxReduit(
  e: EntreeTauxReduit,
  s: SeuilsTauxReduit,
): { statut: StatutTauxReduit; motifs: string[] } {
  if (!entier(s.caMaxCentimes) || !entier(s.detentionMinPdb)) invalide();
  if (e.caCentimes !== null && !entier(e.caCentimes)) invalide();
  if (e.detentionPpPdb !== null && !entier(e.detentionPpPdb)) invalide();
  if (!Number.isSafeInteger(e.dureeMois) || e.dureeMois < 1) invalide();

  const non: string[] = [];
  const inconnu: string[] = [];
  if (e.caCentimes === null) inconnu.push('ca_absent');
  else if (e.dureeMois > MOIS_PAR_AN) inconnu.push('exercice_long_a_verifier');
  else if (BigInt(e.caCentimes) * BigInt(MOIS_PAR_AN) > BigInt(s.caMaxCentimes) * BigInt(e.dureeMois)) non.push('ca_au_dessus');
  if (e.capitalLibere === null) inconnu.push('capital_libere_inconnu');
  else if (!e.capitalLibere) non.push('capital_non_libere');
  if (e.detentionPpPdb === null) inconnu.push('detention_inconnue');
  else if (e.detentionPpPdb < s.detentionMinPdb) non.push('detention_insuffisante');

  if (non.length > 0) return { statut: 'non_eligible', motifs: [...non, ...inconnu] };
  if (inconnu.length > 0) return { statut: 'a_confirmer', motifs: inconnu };
  return { statut: 'eligible', motifs: [] };
}
