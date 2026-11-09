import { donneesDuScenario, lireScenario } from '../../../donnees-fictives/src/abonnement.js';
import { contenuBanniere, etatDuModule } from '../../../noyau/src/abonnement/etats.js';
import { reprendre } from '../../../noyau/src/abonnement/pieces.js';
import type { EtatAcces } from '../../../noyau/src/abonnement/types.js';
import type { Acces } from './acces.js';

export type OptionsServiceAcces = { horloge: () => string; scenario?: string | null };
const ETATS_QUI_TRAITENT: readonly EtatAcces[] = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE'];
const LONGUEUR_JOUR = 10;

/** Service pur de l'accès : l'état vient du scénario fictif tant que la console n'est pas branchée. */
export function creerServiceAcces(options: OptionsServiceAcces) {
  return {
    lire(): Acces {
      const scenario = lireScenario(options.scenario ?? null);
      const aujourdhui = options.horloge().slice(0, LONGUEUR_JOUR);
      const donnees = donneesDuScenario(scenario, aujourdhui);
      const etat = etatDuModule(donnees.etatVoulu, aujourdhui);
      const b = contenuBanniere(etat, donnees.etatVoulu, false);
      const avecReprise = scenario.reprise === 'oui' && ETATS_QUI_TRAITENT.includes(etat);
      return {
        etat,
        banniere: b === null ? null : { cause: b.cause, consequence: b.consequence, prochaine_etape_le: b.prochaineEtapeLe, lien: b.lien },
        reprise: avecReprise ? { pieces_traitees: reprendre(donnees.fileReprise, new Set()).resume.piecesTraitees } : null,
      };
    },
  };
}
