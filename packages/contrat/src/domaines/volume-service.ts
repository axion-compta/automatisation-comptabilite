import { donneesDuScenario, lireScenario, PALIERS_FICTIFS, PARAMETRES_ABONNEMENT_FICTIFS as PARAMETRES } from '../../../donnees-fictives/src/abonnement.js';
import { palierSuperieur } from '../../../noyau/src/abonnement/paliers.js';
import { prevoirFinDeMois } from '../../../noyau/src/abonnement/prevision.js';
import { etatQuota } from '../../../noyau/src/abonnement/quota.js';
import { seuilAtteint } from '../../../noyau/src/abonnement/seuils.js';
import type { Volume } from './volume.js';

export type OptionsServiceVolume = { horloge: () => string; scenario?: string | null };
type Entree = { codePalier: string; utilise: number; piecesParJour: ReadonlyMap<string, number>; aujourdhui: string };
const LONGUEUR_JOUR = 10;

/** Conversion en noms du contrat : aucune donnée de budget d'IA ni de coût n'entre ici. */
export function construireVolume(e: Entree): Volume {
  const palier = PALIERS_FICTIFS.find((p) => p.code === e.codePalier);
  if (palier === undefined) throw new Error('palier_inconnu');
  const compris = palier.piecesParMois;
  const quota = etatQuota({ dejaTraitees: e.utilise, compris, comportement: PARAMETRES.comportementQuota });
  const sup = palierSuperieur(PALIERS_FICTIFS, e.codePalier);
  return {
    palier: { code: palier.code, nom_affiche: palier.nomAffiche },
    compris,
    utilise: e.utilise,
    prevision_fin_de_mois: prevoirFinDeMois({ utilise: e.utilise, piecesParJour: e.piecesParJour, aujourdhui: e.aujourdhui, fenetreJours: PARAMETRES.fenetreJours }),
    seuils_bps: [...PARAMETRES.seuilsBps],
    alertes_bps: PARAMETRES.seuilsBps.filter((s) => seuilAtteint(e.utilise, compris, s)),
    depasse: quota.depasse,
    proposer_choix: quota.proposerChoix,
    comportement: PARAMETRES.comportementQuota,
    palier_superieur: sup === null ? null : { code: sup.code, nom_affiche: sup.nomAffiche, pieces_par_mois: sup.piecesParMois },
  };
}

/** Service pur du volume : les données viennent du scénario fictif tant que la console n'est pas branchée. */
export function creerServiceVolume(options: OptionsServiceVolume) {
  return {
    lire(): Volume {
      const aujourdhui = options.horloge().slice(0, LONGUEUR_JOUR);
      const d = donneesDuScenario(lireScenario(options.scenario ?? null), aujourdhui);
      return construireVolume({ codePalier: d.palierActuel, utilise: d.utilise, piecesParJour: d.piecesParJour, aujourdhui });
    },
  };
}
