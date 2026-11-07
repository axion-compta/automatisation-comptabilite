// Adaptateur du port ModeleTexte vers la passerelle d'IA. Adresse, jeton et routes viennent de la configuration.
// Le contenu des pièces et le jeton ne sont jamais écrits dans les journaux.
import { ErreurPiece } from '../../../../../packages/noyau/src/pieces/types.js';
import type { EntreeModele, ModeleTexte } from '../lecteur-a.js';

export type FetchPasserelle = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<Response>;

export interface ConfigPasserelle {
  adresse: string;
  jeton: string;
  routePrincipale: string;
  routeSecours: string;
  routesAutorisees: readonly string[];
  delaiMs: number;
  microCentimesParCaractere: number;
}

export interface DependancesPasserelle {
  fetch: FetchPasserelle;
  journal: (ligne: string) => void;
}

function entierPositifOuNul(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}

export function creerModelePasserelle(config: ConfigPasserelle, deps: DependancesPasserelle): ModeleTexte {
  for (const route of [config.routePrincipale, config.routeSecours]) {
    if (!config.routesAutorisees.includes(route)) {
      throw new ErreurPiece('route_hors_liste', 'Route absente de la liste fermée des routes autorisées.');
    }
  }
  if (!Number.isFinite(config.delaiMs) || config.delaiMs <= 0) {
    throw new ErreurPiece('delai_invalide', 'Le délai maximal doit être un nombre positif.');
  }

  async function appeler(route: string, entree: EntreeModele): Promise<{ sortie: string; coutMicroCentimes: number }> {
    const arret = new AbortController();
    const minuteur = setTimeout(() => arret.abort(), config.delaiMs);
    try {
      const rep = await deps.fetch(config.adresse + '/' + route, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + config.jeton, 'content-type': 'application/json' },
        body: JSON.stringify({ invite: entree.invite, texte: entree.texte, version_invite: entree.versionInvite }),
        signal: arret.signal,
      });
      if (!rep.ok) throw new Error('statut ' + String(rep.status));
      const corps = (await rep.json()) as { sortie?: unknown; consommation?: { micro_centimes?: unknown } };
      const cout = corps.consommation?.micro_centimes;
      if (typeof corps.sortie !== 'string' || !entierPositifOuNul(cout)) throw new Error('réponse invalide');
      return { sortie: corps.sortie, coutMicroCentimes: cout };
    } finally {
      clearTimeout(minuteur);
    }
  }

  return {
    estimer: (texte) => texte.length * config.microCentimesParCaractere,
    async completer(entree) {
      for (const [rang, route] of [config.routePrincipale, config.routeSecours].entries()) {
        try {
          return await appeler(route, entree);
        } catch (e) {
          deps.journal('passerelle: échec rang ' + String(rang + 1) + ' (' + (e instanceof Error ? e.name : 'inconnu') + ')');
        }
      }
      throw new ErreurPiece('ia_indisponible', 'Aucune route de la passerelle ne répond.');
    },
  };
}
