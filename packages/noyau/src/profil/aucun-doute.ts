// Règle « aucun doute » (spec 09 §02 règle 8). Les sources arrivent déjà lues ; le réglage fraicheurMois est toujours passé en argument.
// Ancienneté : une source est ancienne si sa date + fraicheurMois mois civils est <= dateDuJour (pas de division sur les jours).
// Fin de mois : le jour est ramené au dernier jour du mois d'arrivée (31/01 + 1 mois = 28/02, ou 29/02 en année bissextile).
import { ErreurProfil, ajouterJours, exigerDate } from './types.js';
import type { Confiance, Origine } from './types.js';

export type Source = { origine: Origine; valeur: string; confiance: Confiance; dateSource: string; ref: string };
export type MotifDoute = 'une_seule_source' | 'source_ancienne' | 'contradiction' | 'confiance_insuffisante' | 'aucune_source';
export type Evaluation = { decision: 'confirme_sans_question' | 'a_confirmer'; motifs: MotifDoute[]; valeurs: string[]; origines: string[] };

const MOIS_PAR_AN = 12;
const ANNEE_MAX = 9999;
const normaliser = (t: string): string => t.trim().toLowerCase();
const deuxChiffres = (n: number): string => String(n).padStart(2, '0');

function premierDuMois(annee: number, mois: number): string {
  return String(annee).padStart(4, '0') + '-' + deuxChiffres(mois + 1) + '-01';
}

function plusMois(date: string, n: number): string {
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  let annee = a;
  let mois = m - 1;
  for (let reste = n; reste > 0; reste -= 1) {
    mois += 1;
    if (mois === MOIS_PAR_AN) {
      mois = 0;
      annee += 1;
    }
    if (annee >= ANNEE_MAX) return ANNEE_MAX + '-12-31';
  }
  const suivant = mois === MOIS_PAR_AN - 1 ? premierDuMois(annee + 1, 0) : premierDuMois(annee, mois + 1);
  const dernier = Number(ajouterJours(suivant, -1).slice(8));
  return premierDuMois(annee, mois).slice(0, 8) + deuxChiffres(Math.min(j, dernier));
}

export function evaluerSources(sources: readonly Source[], opts: { dateDuJour: string; fraicheurMois: number }): Evaluation {
  const jour = exigerDate(opts.dateDuJour, 'dateDuJour');
  const f = opts.fraicheurMois;
  if (typeof f !== 'number' || !Number.isSafeInteger(f) || f <= 0) throw new ErreurProfil('fraicheur_invalide');
  for (const s of sources) {
    exigerDate(s.dateSource, 'dateSource');
    if (s.dateSource > jour) throw new ErreurProfil('date_future');
  }
  const groupes = new Map<string, string>();
  for (const s of sources) {
    const cle = normaliser(s.valeur);
    const vue = groupes.get(cle);
    if (vue === undefined || s.valeur.trim() < vue) groupes.set(cle, s.valeur.trim());
  }
  const valeurs = [...groupes.values()].sort();
  const origines = [...new Set(sources.map((s) => s.origine))].sort();
  const motifs: MotifDoute[] = [];
  if (sources.length === 0) motifs.push('aucune_source');
  else {
    if (sources.length < 2) motifs.push('une_seule_source');
    const recente = sources.reduce((a, b) => (b.dateSource > a ? b.dateSource : a), '');
    if (plusMois(recente, f) <= jour) motifs.push('source_ancienne');
    if (groupes.size > 1) motifs.push('contradiction');
    if (sources.some((s) => s.confiance !== 'sur')) motifs.push('confiance_insuffisante');
  }
  return { decision: motifs.length === 0 ? 'confirme_sans_question' : 'a_confirmer', motifs, valeurs, origines };
}
