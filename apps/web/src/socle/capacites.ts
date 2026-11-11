import { ReponseCapacites } from '../../../../packages/contrat/src/domaines/capacites.js';
import { securite } from '../../../../packages/textes/src/ecrans/securite.js';
import { useLecture } from '../donnees/lecture.js';

export type CapaciteAction = { permis: true } | { permis: false; raison_texte: string };
export type EtatCapacites = { etat: 'chargement' | 'pret' | 'erreur'; capacite: (action: string) => CapaciteAction };

/** Refus par défaut : jamais de permis tant que le serveur n'a pas répondu. */
const INCONNUE: CapaciteAction = { permis: false, raison_texte: securite.capaciteInconnue };

/** Capacité de chaque action, lue une seule fois auprès du serveur ; le front n'invente aucune raison. */
export function useCapacites(): EtatCapacites {
  const lecture = useLecture('/moi/capacites', ReponseCapacites);
  const etat = lecture.etat === 'erreur' ? 'erreur' : lecture.donnees === undefined ? 'chargement' : 'pret';
  const lignes = lecture.donnees?.body ?? [];
  const capacite = (action: string): CapaciteAction => {
    if (etat !== 'pret') return INCONNUE;
    const c = lignes.find((l) => l.action === action);
    if (!c) return INCONNUE;
    if (c.permis) return { permis: true };
    return { permis: false, raison_texte: c.raison_texte ?? securite.capaciteInconnue };
  };
  return { etat, capacite };
}
