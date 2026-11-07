import { valeurEnVigueur } from './champs.js';
import type { ChampProfil } from './types.js';

export const CLES_OBLIGATOIRES = ['denomination', 'forme', 'siren', 'exercice_debut', 'exercice_fin', 'regime_tva', 'regime_imposition', 'tenue'] as const;

export type MotifManquant = 'absent' | 'vide' | 'je_ne_sais_pas';
export type ResultatEtat = {
  etat: 'incomplet' | 'a_confirmer' | 'complet';
  manquants: string[];
  aConfirmer: string[];
  motifs: Record<string, MotifManquant>;
};

type Lecture = 'confirme' | 'a_confirmer' | MotifManquant;

function lire(h: readonly ChampProfil[], societeId: string, cle: string, date: string): Lecture {
  const ligne = valeurEnVigueur(h, societeId, cle, date);
  return ligne === null ? 'absent' : ligne.statut;
}

function enFormation(h: readonly ChampProfil[], societeId: string, date: string): boolean {
  const ligne = valeurEnVigueur(h, societeId, 'en_formation', date);
  return ligne !== null && ligne.statut === 'confirme' && ligne.valeur === true;
}

function lireObligatoire(h: readonly ChampProfil[], societeId: string, cle: string, date: string): Lecture {
  const lu = lire(h, societeId, cle, date);
  return cle === 'siren' && lu !== 'confirme' && enFormation(h, societeId, date) ? 'confirme' : lu;
}

export function etatProfil(historique: readonly ChampProfil[], societeId: string, date: string): ResultatEtat {
  const manquants: string[] = [];
  const aConfirmer: string[] = [];
  const motifs: Record<string, MotifManquant> = {};
  for (const cle of CLES_OBLIGATOIRES) {
    const lu = lireObligatoire(historique, societeId, cle, date);
    if (lu === 'a_confirmer') aConfirmer.push(cle);
    else if (lu !== 'confirme') {
      manquants.push(cle);
      motifs[cle] = lu;
    }
  }
  manquants.sort();
  aConfirmer.sort();
  const etat = manquants.length > 0 ? 'incomplet' : aConfirmer.length > 0 ? 'a_confirmer' : 'complet';
  return { etat, manquants, aConfirmer, motifs };
}

export function tvaCalculable(
  historique: readonly ChampProfil[],
  societeId: string,
  date: string,
): { calculable: boolean; motif?: 'regime_tva_a_confirmer' | 'regime_tva_absent' } {
  const lu = lire(historique, societeId, 'regime_tva', date);
  if (lu === 'confirme') return { calculable: true };
  return { calculable: false, motif: lu === 'a_confirmer' ? 'regime_tva_a_confirmer' : 'regime_tva_absent' };
}

export function fecEtDeclarationsPermis(historique: readonly ChampProfil[], societeId: string, date: string): { permis: boolean; motif?: 'siren_absent' } {
  return lire(historique, societeId, 'siren', date) === 'confirme' ? { permis: true } : { permis: false, motif: 'siren_absent' };
}
