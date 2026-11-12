import {
  lireDansSociete,
  REPONSE_INTROUVABLE,
  verifierSocieteDeLaRequete,
} from '../../../../packages/noyau/src/securite/societe.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import { societeDuChemin } from '../domaines/isolation-interface.js';

export type CorpsRefus = { code: 'non_authentifie' | 'societe_unique' | 'introuvable' };
export type VerdictRequete<T> =
  | { ok: true; societeId: string; objet?: T }
  | { ok: false; statut: 400 | 401 | 404; corps: CorpsRefus };

export type EntreeRequete<T extends { societeId: string }> = {
  session: Session | null;
  /** Chemin de la requête ; la société qu'il porte ne sert qu'à vérifier. */
  chemin: string;
  /** Sociétés citées par le corps de la requête. */
  societesDuCorps: readonly string[];
  /** Absent : aucun objet demandé ; null : objet demandé et inexistant. */
  objet?: T | null;
};

const refus = (statut: 400 | 401 | 404, code: CorpsRefus['code']): VerdictRequete<never> => ({
  ok: false,
  statut,
  corps: { code },
});
// Même corps pour « inexistant » et « d'une autre société », pour ne rien révéler.
const introuvable = () => refus(REPONSE_INTROUVABLE.statut, REPONSE_INTROUVABLE.code);

/** Fonction pure : la société vient de la session, `{s}` du chemin ne sert qu'à vérifier. */
export function verifierRequeteSociete<T extends { societeId: string }>(e: EntreeRequete<T>): VerdictRequete<T> {
  if (e.session === null) return refus(401, 'non_authentifie');
  const duChemin = societeDuChemin(e.chemin);
  // Société du chemin absente ou étrangère à la personne : 404, comme un objet inexistant.
  if (duChemin === null || !e.session.societes.includes(duChemin)) return introuvable();
  const verdict = verifierSocieteDeLaRequete({
    societeSession: e.session.societeId,
    societeChemin: duChemin,
    societesDuCorps: e.societesDuCorps,
    societesDeLaPersonne: e.session.societes,
  });
  if (!verdict.ok) {
    return verdict.raison === 'non_authentifie' ? refus(401, 'non_authentifie') : refus(400, 'societe_unique');
  }
  if (e.objet === undefined) return { ok: true, societeId: verdict.societeId };
  const lu = lireDansSociete(e.objet ?? undefined, verdict.societeId);
  if (lu === REPONSE_INTROUVABLE) return introuvable();
  return { ok: true, societeId: verdict.societeId, objet: lu as T };
}
