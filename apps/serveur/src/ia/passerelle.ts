// Passerelle d'IA : liste fermée appliquée avant tout appel, cache séparé par client,
// journaux sans contenu. Une panne laisse les pièces en attente, sans écriture partielle.
import {
  routeAutorisee,
  type DemandeRoute,
  type RouteIA,
} from "../../../../packages/noyau/src/securite/routes-ia.js";

export type AppelFournisseur = (
  route: DemandeRoute,
  client: string,
  question: string,
) => Promise<string>;
export type Evenement =
  | ({ type: "ia.route_refusee" } & DemandeRoute)
  | { type: "ia.indisponible"; client: string };
export type ReponsePasserelle =
  | { issue: "ok"; texte: string }
  | { issue: "refusee" }
  | { issue: "indisponible" };

export interface DemandePasserelle {
  client: string;
  route: DemandeRoute;
  question: string;
}

export interface LotPieces {
  client: string;
  route: DemandeRoute;
  pieces: readonly string[];
  question: (piece: string) => string;
  ecrire: (piece: string, texte: string) => void;
}

export function creerPasserelle(deps: {
  liste: readonly RouteIA[];
  appel: AppelFournisseur;
  journaliser: (e: Evenement) => void;
}) {
  const cache = new Map<string, string>();

  async function demander(d: DemandePasserelle): Promise<ReponsePasserelle> {
    const verdict = routeAutorisee(deps.liste, d.route);
    if (!verdict.autorisee) {
      deps.journaliser(verdict.evenement);
      return { issue: "refusee" };
    }
    const cle = JSON.stringify([
      d.client,
      d.route.fournisseur,
      d.route.region,
      d.route.mode,
      d.question,
    ]);
    const connue = cache.get(cle);
    if (connue !== undefined) return { issue: "ok", texte: connue };
    try {
      const texte = await deps.appel(d.route, d.client, d.question);
      cache.set(cle, texte);
      return { issue: "ok", texte };
    } catch {
      deps.journaliser({ type: "ia.indisponible", client: d.client });
      return { issue: "indisponible" };
    }
  }

  async function traiterPieces(
    lot: LotPieces,
  ): Promise<{ traitees: string[]; enAttente: string[] }> {
    const traitees: string[] = [];
    const enAttente: string[] = [];
    for (const piece of lot.pieces) {
      if (enAttente.length > 0) {
        enAttente.push(piece);
        continue;
      }
      const r = await demander({
        client: lot.client,
        route: lot.route,
        question: lot.question(piece),
      });
      if (r.issue === "ok") {
        lot.ecrire(piece, r.texte);
        traitees.push(piece);
      } else {
        enAttente.push(piece);
      }
    }
    return { traitees, enAttente };
  }

  return { demander, traiterPieces };
}
