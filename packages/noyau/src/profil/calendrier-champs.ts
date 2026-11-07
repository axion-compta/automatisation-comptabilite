import { valeurEnVigueur } from './champs.js';
import { ErreurProfil } from './types.js';
import type { ChampProfil } from './types.js';

export const CLES_CALENDRIER = ['effectif_moyen', 'vehicules', 'locaux', 'surface_locaux', 'ile_de_france', 'ca_n_moins_1', 'is_n_moins_1'] as const;
export type CleCalendrier = (typeof CLES_CALENDRIER)[number];
export type StatutCalendrier = 'connu' | 'je_ne_sais_pas' | 'absent';
export type DependanceEcheance = { echeance: string; champs: string[] };
export type EcheanceAVerifier = { echeance: string; champs: string[] };

const estCle = (c: string): c is CleCalendrier => (CLES_CALENDRIER as readonly string[]).includes(c);

function statutDe(ligne: ChampProfil | null): StatutCalendrier {
  if (ligne === null || ligne.statut === 'vide') return 'absent';
  return ligne.statut === 'je_ne_sais_pas' ? 'je_ne_sais_pas' : 'connu';
}

/** Lit chaque champ du calendrier à la date ; la valeur n'est jamais interprétée. */
export function statutsChampsCalendrier(
  historique: readonly ChampProfil[],
  societeId: string,
  date: string,
): Record<CleCalendrier, StatutCalendrier> {
  const sortie = {} as Record<CleCalendrier, StatutCalendrier>;
  for (const cle of CLES_CALENDRIER) sortie[cle] = statutDe(valeurEnVigueur(historique, societeId, cle, date));
  return sortie;
}

/** Échéances dont au moins un champ est inconnu ou absent : triées, sans doublon, avec les champs en cause. */
export function echeancesAVerifier(
  statuts: Readonly<Record<CleCalendrier, StatutCalendrier>>,
  dependances: readonly DependanceEcheance[],
): EcheanceAVerifier[] {
  const parEcheance = new Map<string, Set<string>>();
  for (const d of dependances) {
    for (const c of d.champs) if (!estCle(c)) throw new ErreurProfil('champ_calendrier_inconnu');
    const enCause = d.champs.filter((c) => estCle(c) && statuts[c] !== 'connu');
    if (enCause.length === 0) continue;
    const ensemble = parEcheance.get(d.echeance) ?? new Set<string>();
    for (const c of enCause) ensemble.add(c);
    parEcheance.set(d.echeance, ensemble);
  }
  return [...parEcheance.keys()].sort().map((echeance) => ({ echeance, champs: [...(parEcheance.get(echeance) ?? [])].sort() }));
}
