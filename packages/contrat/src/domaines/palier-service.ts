import { donneesDuScenario, lireScenario, PALIERS_FICTIFS } from '../../../donnees-fictives/src/abonnement.js';
import { demanderPalier, type Demande } from '../../../noyau/src/abonnement/paliers.js';
import { ErreurAbonnement, type EvenementJournal } from '../../../noyau/src/abonnement/types.js';

export const AUTEUR_FICTIF = 'personne-fictive-1';
const LONGUEUR_DATE = 10;
const ERREURS = {
  accord_manquant: 'ACCORD_MANQUANT',
  palier_inconnu: 'PALIER_INCONNU',
  palier_identique: 'PALIER_IDENTIQUE',
  palier_non_superieur: 'PALIER_NON_SUPERIEUR',
} as const;
export type ErreurPalier = (typeof ERREURS)[keyof typeof ERREURS];
export type ResultatPalier =
  | { ok: true; valeur: { demande: { code_actuel: string; code_demande: string; horodatage: string }; palier_en_vigueur: string } }
  | { ok: false; erreur: ErreurPalier };

/** Service en mémoire pur : garde les demandes et leurs événements, ne change jamais le palier en vigueur. */
export function creerServicePalier(options: { horloge: () => string; scenario: string | null }) {
  const palierEnVigueur = donneesDuScenario(lireScenario(options.scenario), options.horloge().slice(0, LONGUEUR_DATE)).palierActuel;
  const demandes: Demande[] = [];
  const evenements: EvenementJournal[] = [];
  const reponses = new Map<string, ResultatPalier>();

  return {
    demander(cle: string, corps: { code_demande: string; accord: boolean }): ResultatPalier {
      const deja = reponses.get(cle);
      if (deja !== undefined) return deja;
      let resultat: ResultatPalier;
      try {
        const r = demanderPalier({
          accord: corps.accord, codeActuel: palierEnVigueur, codeDemande: corps.code_demande, paliers: PALIERS_FICTIFS,
          auteur: AUTEUR_FICTIF, horodatage: options.horloge(),
        });
        demandes.push(r.demande);
        evenements.push(r.evenement);
        resultat = {
          ok: true,
          valeur: {
            demande: { code_actuel: r.demande.codeActuel, code_demande: r.demande.codeDemande, horodatage: r.demande.horodatage },
            palier_en_vigueur: palierEnVigueur,
          },
        };
      } catch (e) {
        const erreur = e instanceof ErreurAbonnement ? (ERREURS as Record<string, ErreurPalier>)[e.code] : undefined;
        if (erreur === undefined) throw e;
        return { ok: false, erreur };
      }
      reponses.set(cle, resultat);
      return resultat;
    },
    demandes: (): readonly Demande[] => [...demandes],
    journal: (): readonly EvenementJournal[] => [...evenements],
  };
}
