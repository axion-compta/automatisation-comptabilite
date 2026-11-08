import type { ChampFictif } from '../../../donnees-fictives/src/profil.js';
import { CLES_PROFIL } from './profil-champs.js';
import type { ChampProfilV1 } from './profil.js';
import { creerServiceProfil } from './profil-service.js';

export type CodeErreurChamp = 'CLE_INCONNUE' | 'RIEN_A_CONFIRMER' | 'CLE_REUTILISEE';
export class ErreurChamp extends Error {
  constructor(readonly code: CodeErreurChamp) {
    super(code);
  }
}
/** Personne fictive fixe : la vraie personne de la session viendra de la console (L09-T49). */
export const PERSONNE_FICTIVE = 'personne-fictive-1';
const RANG_DEBUT = 5000;

/** Ajout seul : chaque écriture ajoute une ligne, rien n'est modifié ni supprimé. État propre à l'instance. */
export function creerServiceProfilChamps(societeId: string) {
  const ajouts: ChampFictif[] = [];
  const reponses = new Map<string, { empreinte: string; champ: ChampProfilV1 }>();
  const lire = (au: string | undefined, aujourdhui: string) => creerServiceProfil(societeId, { champsSupplementaires: ajouts }).lire(au, aujourdhui);

  const ecrire = (cle: string, cleIdem: string, empreinte: string, fabrique: () => ChampFictif | null, aujourdhui: string): ChampProfilV1 => {
    if (!(CLES_PROFIL as readonly string[]).includes(cle)) throw new ErreurChamp('CLE_INCONNUE');
    const vue = reponses.get(cleIdem);
    if (vue) {
      if (vue.empreinte !== empreinte) throw new ErreurChamp('CLE_REUTILISEE');
      return vue.champ;
    }
    const ligne = fabrique();
    if (!ligne) throw new ErreurChamp('RIEN_A_CONFIRMER');
    ajouts.push(ligne);
    const champ = lire(ligne.effet_debut, aujourdhui).champs.find((c) => c.cle === cle) as ChampProfilV1;
    reponses.set(cleIdem, { empreinte, champ });
    return champ;
  };

  return {
    lire,
    ajouter(cle: string, cleIdem: string, corps: { valeur: unknown; origine: 'saisie_personne' | 'document'; effetDebut?: string | undefined }, aujourdhui: string): ChampProfilV1 {
      const fabrique = (): ChampFictif => ({
        societeId, cle, valeur: corps.valeur as string, origine: corps.origine, confiance: 'a_verifier',
        source_ref: null, date_source: null, statut: 'a_confirmer', effet_debut: corps.effetDebut ?? aujourdhui,
        confirme_par: null, confirme_le: null, rang: RANG_DEBUT + ajouts.length,
      });
      return ecrire(cle, cleIdem, JSON.stringify(['ajouter', cle, corps]), fabrique, aujourdhui);
    },
    confirmer(cle: string, cleIdem: string, corps: { effetDebut: string }, aujourdhui: string): ChampProfilV1 {
      const fabrique = (): ChampFictif | null => {
        const propres = ajouts.filter((a) => a.cle === cle);
        const derniere = propres.at(-1);
        if (!derniere || derniere.statut !== 'a_confirmer') return null;
        return { ...derniere, statut: 'confirme', confiance: 'sur', effet_debut: corps.effetDebut, confirme_par: PERSONNE_FICTIVE, confirme_le: aujourdhui, rang: RANG_DEBUT + ajouts.length };
      };
      return ecrire(cle, cleIdem, JSON.stringify(['confirmer', cle, corps]), fabrique, aujourdhui);
    },
  };
}
export type ServiceProfilChamps = ReturnType<typeof creerServiceProfilChamps>;
