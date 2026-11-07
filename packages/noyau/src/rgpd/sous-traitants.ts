import { ajouterJours, comparerDates, ErreurDate } from '../dates/civiles.js';
import { ErreurRgpd, verifierDate } from './types.js';

export type Raison = 'contrat_absent' | 'non_annonce' | 'delai_en_cours' | 'hors_ue' | 'conservation_chez_fournisseur' | 'oppositions';
export type SousTraitant = {
  ref: string; type: 'hebergeur' | 'ia' | 'email' | 'facture' | 'autre'; contratArchiveLe: string | null; annonceLe: string | null;
  traitementDansUe: boolean; conservationChezFournisseur: boolean; oppositions: { societeRef: string; le: string }[];
};

export function activationPossible(
  st: SousTraitant, reglage: { oppositionJours: number }, aujourdhui: string,
): { permise: boolean; raisons: Raison[]; permiseLe: string | null } {
  const jours = reglage.oppositionJours;
  if (!Number.isSafeInteger(jours) || jours < 0) throw new ErreurRgpd('delai_invalide');
  verifierDate(aujourdhui);
  for (const d of [st.contratArchiveLe, st.annonceLe, ...st.oppositions.map((o) => o.le)]) if (d !== null) verifierDate(d);
  const raisons: Raison[] = [];
  if (st.contratArchiveLe === null || comparerDates(st.contratArchiveLe, aujourdhui) > 0) raisons.push('contrat_absent');
  if (!st.traitementDansUe) raisons.push('hors_ue');
  if (st.type === 'ia' && st.conservationChezFournisseur) raisons.push('conservation_chez_fournisseur');
  let permiseLe: string | null = null;
  if (st.annonceLe !== null) {
    try {
      permiseLe = ajouterJours(st.annonceLe, jours);
    } catch (e) {
      if (e instanceof ErreurDate) throw new ErreurRgpd('delai_invalide');
      throw e;
    }
  }
  if (permiseLe === null || st.annonceLe === null || comparerDates(st.annonceLe, aujourdhui) > 0) raisons.push('non_annonce');
  else {
    if (comparerDates(aujourdhui, permiseLe) < 0) raisons.push('delai_en_cours');
    // Une opposition reçue au plus tard à la fin du délai bloque ; le produit ne tranche pas à la place de Will.
    if (st.oppositions.some((o) => comparerDates(o.le, permiseLe) <= 0)) raisons.push('oppositions');
  }
  raisons.sort();
  return { permise: raisons.length === 0, raisons, permiseLe };
}
