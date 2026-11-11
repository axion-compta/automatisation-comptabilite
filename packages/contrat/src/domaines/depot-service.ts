import { evaluerLimites, type ReglageLimites } from '../../../noyau/src/pieces/entree/limites.js';
import { typeReel } from '../../../noyau/src/pieces/entree/signature.js';
import type { EtatPiece, ResultatDepot } from './depot.js';
import { ajouterPieceDeposee, type PieceDeposee } from './pieces-service.js';

export type RefusRelance = 'PIECE_INCONNUE' | 'RELANCE_IMPOSSIBLE';

async function empreinteSha256(octets: Uint8Array): Promise<string> {
  const copie = new Uint8Array(octets);
  const condense = new Uint8Array(await crypto.subtle.digest('SHA-256', copie));
  return Array.from(condense, (o) => o.toString(16).padStart(2, '0')).join('');
}

/** Dépôt en mémoire : mêmes règles pour toutes les voies d'entrée. Pièces FICTIVES seulement. */
export function creerDepotEnMemoire(pieces: PieceDeposee[], reglage: ReglageLimites, horloge: () => string = () => new Date().toISOString()) {
  const rejeux = new Map<string, ResultatDepot[]>();

  async function traiter(octets: Uint8Array, canal: string): Promise<ResultatDepot> {
    const type = typeReel(octets);
    if ('refus' in type) return { statut: 'refusee', code: type.refus, raison: type.raison };
    const limites = evaluerLimites({ tailleOctets: octets.byteLength, nbPages: 0 }, reglage);
    if ('refus' in limites) return { statut: 'refusee', code: 'trop_grand', raison: 'taille_max_depassee' };
    const empreinte = await empreinteSha256(octets);
    const connue = pieces.find((p) => p.empreinte === empreinte);
    if (connue !== undefined) return { statut: 'deja_recue', id: connue.id, recueLe: connue.recueLe };
    const id = `depot-${String(pieces.length + 1).padStart(4, '0')}`;
    ajouterPieceDeposee(pieces, { id, empreinte, etat: 'recue', recueLe: horloge(), canal });
    return { statut: 'recue', id };
  }

  return {
    /** Résultats dans l'ordre des fichiers ; même clé d'idempotence = même réponse, rien de plus n'est stocké. */
    async deposer(cle: string, fichiers: Uint8Array[], canal: string): Promise<ResultatDepot[]> {
      const deja = rejeux.get(cle);
      if (deja !== undefined) return deja;
      const resultats: ResultatDepot[] = [];
      for (const octets of fichiers) resultats.push(await traiter(octets, canal));
      rejeux.set(cle, resultats);
      return resultats;
    },
    etat(id: string): EtatPiece | undefined {
      const p = pieces.find((x) => x.id === id);
      if (p === undefined) return undefined;
      return p.motif === undefined ? { etat: p.etat } : { etat: p.etat, motif: p.motif };
    },
    /** Relance autorisée seulement depuis `en_erreur` : la pièce repart en `recue`. */
    relancer(id: string): EtatPiece | RefusRelance {
      const p = pieces.find((x) => x.id === id);
      if (p === undefined) return 'PIECE_INCONNUE';
      if (p.etat !== 'en_erreur') return 'RELANCE_IMPOSSIBLE';
      p.etat = 'recue';
      delete p.motif;
      return { etat: 'recue' };
    },
  };
}
