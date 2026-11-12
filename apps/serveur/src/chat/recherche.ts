// Recherche dans les conversations d'une société : interface et adaptateur d'essai (mémoire) ;
// l'index en base se branchera derrière la même interface.
import type { Message } from './depot.js';

export type Resultat = { messageId: string; conversationId: string; le: string };

export interface IndexRecherche {
  indexer(m: Message): void;
  /** Messages de la société dont le texte contient tous les mots de la requête ; requête vide : aucun résultat. */
  rechercher(societeId: string, requete: string, limite?: number): readonly Resultat[];
}

const LIMITE_DEFAUT = 50;

/** Minuscules, sans accents, pluriel simple retiré (s, x) sur les mots de plus de 3 lettres. */
export function mots(texte: string): string[] {
  const brut = texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return brut.map((m) => (m.length > 3 && /[sx]$/.test(m) ? m.slice(0, -1) : m));
}

export function creerIndexRechercheMemoire(): IndexRecherche {
  // Un index par société : une requête ne lit jamais l'index d'une autre.
  const parSociete = new Map<string, { messages: Map<string, Resultat>; termes: Map<string, Set<string>> }>();

  return {
    indexer(m) {
      let idx = parSociete.get(m.societeId);
      if (idx === undefined) {
        idx = { messages: new Map(), termes: new Map() };
        parSociete.set(m.societeId, idx);
      }
      idx.messages.set(m.id, { messageId: m.id, conversationId: m.conversationId, le: m.le });
      for (const t of new Set(mots(m.texte))) {
        const ids = idx.termes.get(t) ?? new Set<string>();
        ids.add(m.id);
        idx.termes.set(t, ids);
      }
    },
    rechercher(societeId, requete, limite = LIMITE_DEFAUT) {
      const idx = parSociete.get(societeId);
      const demandes = [...new Set(mots(requete))];
      if (idx === undefined || demandes.length === 0 || limite <= 0) return [];
      const listes = demandes.map((t) => idx.termes.get(t));
      if (listes.some((l) => l === undefined)) return [];
      const [premiere, ...autres] = (listes as Set<string>[]).sort((a, b) => a.size - b.size);
      const trouves: Resultat[] = [];
      for (const id of premiere ?? []) {
        if (!autres.every((l) => l.has(id))) continue;
        const r = idx.messages.get(id);
        if (r !== undefined) trouves.push({ ...r });
      }
      return trouves.sort((a, b) => b.le.localeCompare(a.le) || a.messageId.localeCompare(b.messageId)).slice(0, limite);
    },
  };
}
