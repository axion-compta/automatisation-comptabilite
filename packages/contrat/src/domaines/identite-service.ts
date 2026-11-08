import { sirenValide } from '../../../donnees-fictives/src/generateur.js';
import { genererProfils } from '../../../donnees-fictives/src/profil.js';
import type { ReponseSiren, ReponseVerificationTva } from './identite.js';
import type { z } from 'zod';

type CorpsSiren = z.infer<typeof ReponseSiren>['body'];
type CorpsTva = z.infer<typeof ReponseVerificationTva>['body'];
export type OptionsIdentite = { sirenePanne?: boolean; dateReponse?: string; surAppelVies?: (numero: string) => void };

export class SirenInvalide extends Error {}

const DATE_REPONSE_FICTIVE = '2026-01-15';
const LONGUEUR_SIREN = 9;

/** Service pur sur genererProfils().identites : aucun appel réseau, aucun cache. */
export function creerServiceIdentite(options: OptionsIdentite = {}) {
  const identites = genererProfils().identites;
  const parSiren = (siren: string) => identites.find((i) => i.siren === siren);
  return {
    lireSiren(siren: string): CorpsSiren {
      if (!sirenValide(siren)) throw new SirenInvalide(siren);
      if (options.sirenePanne === true) return { etat: 'saisie_manuelle' };
      const i = parSiren(siren);
      if (i === undefined) return { etat: 'introuvable' };
      return { etat: 'trouve', denomination: i.denomination, forme: i.forme, dateReponse: options.dateReponse ?? DATE_REPONSE_FICTIVE };
    },
    /** `cleJuste` vient de la vérification de clé du noyau ; si elle est fausse, VIES n'est pas appelé. */
    verifierTva(numero: string, cleJuste: boolean): CorpsTva {
      if (!cleJuste) return { cle: 'fausse', vies: 'non_verifie' };
      options.surAppelVies?.(numero);
      const i = identites.find((x) => x.viesNumero === numero) ?? parSiren(numero.slice(-LONGUEUR_SIREN));
      const vies = i?.vies === 'valide' ? 'verifie' : i?.vies === 'invalide' ? 'invalide' : 'non_verifie';
      return { cle: 'juste', vies };
    },
  };
}
