// Index de recherche en base (spec 15, RE-R1 a RE-R5). Interface, dépôt SQL paramétré et dépôt en mémoire.
// Aucune base réelle ici : le dépôt SQL parle à un port ; le texte cherché n'est jamais journalisé.
import { BORNES_Q, TYPES_RECHERCHE } from '../../../../packages/contrat/src/domaines/recherche.js';
import { correspondMot, lireRequete, normaliser } from '../../../../packages/noyau/src/recherche/requete.js';
import type { Planificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';

export type TypeIndex = (typeof TYPES_RECHERCHE)[number];
export type EntreeBase = {
  type: TypeIndex; objetId: string; titre: string; texte: string; lien: string; date: string;
  exerciceId: string | null; montantsCentimes: number[]; siren: string | null;
};
export type Cle = { type: TypeIndex; objetId: string };
export type Coherence = { manquants: Cle[]; orphelins: Cle[] };
export type Filtre = { typesAutorises: readonly TypeIndex[]; types?: readonly TypeIndex[]; limite?: number };

export interface DepotRecherche {
  indexer(societeId: string, e: EntreeBase): Promise<void>;
  /** Retire la ligne avant de rendre la main : une pièce devenue sensible n'est plus trouvée. */
  retirer(societeId: string, c: Cle): Promise<void>;
  chercher(societeId: string, q: string, f: Filtre): Promise<EntreeBase[]>;
  cles(societeId: string): Promise<Cle[]>;
}
export interface PortSql { executer(sql: string, params: readonly unknown[]): Promise<Record<string, unknown>[]> }

export const SQL = {
  indexer: `INSERT INTO a_compta.index_recherche (societe_id, type, objet_id, titre, texte, lien, date_objet, exercice_id, montants_centimes, siren)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (societe_id, type, objet_id) DO UPDATE SET titre = $4, texte = $5, lien = $6, date_objet = $7,
      exercice_id = $8, montants_centimes = $9, siren = $10, maj_le = now()`,
  retirer: 'DELETE FROM a_compta.index_recherche WHERE societe_id = $1 AND type = $2 AND objet_id = $3',
  cles: 'SELECT type, objet_id FROM a_compta.index_recherche WHERE societe_id = $1',
  chercher: `SELECT type, objet_id, titre, texte, lien, date_objet::text AS date_objet, exercice_id, montants_centimes, siren
    FROM a_compta.index_recherche
    WHERE societe_id = $1 AND type = ANY($2::text[])
      AND (vecteur @@ to_tsquery('french', a_compta.sans_accent($3)) OR $4::bigint = ANY(montants_centimes) OR siren = $5)
    ORDER BY ts_rank(vecteur, to_tsquery('french', a_compta.sans_accent($3))) DESC, objet_id LIMIT $6`,
} as const;

/** Mots réduits à des lettres et chiffres, liés par ET, dernier mot en préfixe : jamais de syntaxe libre vers la base. */
export function gabaritRequete(mots: readonly string[]): string {
  const propres = mots.map((m) => m.replace(/[^\p{L}\p{N}]/gu, '')).filter((m) => m !== '');
  return propres.map((m, i) => (i === propres.length - 1 ? `${m}:*` : m)).join(' & ');
}

const lire = (q: string) => { const r = lireRequete(q, BORNES_Q); return { r, ts: gabaritRequete(r.mots) }; };
const typesEffectifs = (f: Filtre): TypeIndex[] => f.typesAutorises.filter((t) => f.types === undefined || f.types.length === 0 || f.types.includes(t));

export function creerDepotSql(port: PortSql): DepotRecherche {
  return {
    async indexer(s, e) {
      await port.executer(SQL.indexer, [s, e.type, e.objetId, e.titre, e.texte, e.lien, e.date, e.exerciceId, e.montantsCentimes, e.siren]);
    },
    async retirer(s, c) { await port.executer(SQL.retirer, [s, c.type, c.objetId]); },
    async cles(s) { return (await port.executer(SQL.cles, [s])).map((l) => ({ type: l.type as TypeIndex, objetId: String(l.objet_id) })); },
    async chercher(s, q, f) {
      const { r, ts } = lire(q);
      const lignes = await port.executer(SQL.chercher, [s, typesEffectifs(f), ts, r.montantCentimes ?? null, r.siren ?? null, f.limite ?? 10]);
      return lignes.map((l) => ({
        type: l.type as TypeIndex, objetId: String(l.objet_id), titre: String(l.titre), texte: String(l.texte), lien: String(l.lien),
        date: String(l.date_objet), exerciceId: (l.exercice_id as string | null) ?? null,
        montantsCentimes: (l.montants_centimes as number[]).map(Number), siren: (l.siren as string | null) ?? null,
      }));
    },
  };
}

/** Dépôt en mémoire derrière la même interface (faux serveur, tests). */
export function creerDepotMemoire(): DepotRecherche {
  const lignes = new Map<string, Map<string, EntreeBase>>();
  const cle = (c: Cle): string => JSON.stringify([c.type, c.objetId]);
  const de = (s: string): Map<string, EntreeBase> => lignes.get(s) ?? lignes.set(s, new Map()).get(s) as Map<string, EntreeBase>;
  return {
    async indexer(s, e) { de(s).set(cle(e), structuredClone(e)); },
    async retirer(s, c) { de(s).delete(cle(c)); },
    async cles(s) { return [...de(s).values()].map(({ type, objetId }) => ({ type, objetId })); },
    async chercher(s, q, f) {
      const { r } = lire(q);
      const permis = new Set(typesEffectifs(f));
      const dernier = r.mots.length - 1;
      const notes: [number, EntreeBase][] = [];
      for (const e of de(s).values()) {
        if (!permis.has(e.type)) continue;
        const titre = normaliser(e.titre);
        const texte = normaliser(e.texte);
        const note = r.mots.reduce((n, m, k) => n + (correspondMot(titre, m, k === dernier) ? 2 : 0), 0);
        // Comme en base : tous les mots (ET), ou montant exact, ou SIREN.
        const tous = r.mots.every((m, k) => correspondMot(`${titre} ${texte}`, m, k === dernier));
        const exact = (r.montantCentimes !== undefined && e.montantsCentimes.includes(r.montantCentimes)) || (r.siren !== undefined && e.siren === r.siren);
        if (tous || exact) notes.push([note + (exact ? 3 : 0), structuredClone(e)]);
      }
      return notes.sort((a, b) => b[0] - a[0] || a[1].objetId.localeCompare(b[1].objetId)).slice(0, f.limite ?? 10).map((n) => n[1]);
    },
  };
}

/** Reconstruction idempotente : même source, même index, sans doublon ni reste. */
export async function reconstruire(depot: DepotRecherche, societeId: string, source: readonly EntreeBase[]): Promise<void> {
  const voulues = new Set(source.map((e) => JSON.stringify([e.type, e.objetId])));
  for (const c of await depot.cles(societeId)) if (!voulues.has(JSON.stringify([c.type, c.objetId]))) await depot.retirer(societeId, c);
  for (const e of source) await depot.indexer(societeId, e);
}

export async function controlerCoherence(depot: DepotRecherche, societeId: string, source: readonly EntreeBase[]): Promise<Coherence> {
  const ids = (l: readonly Cle[]): Map<string, Cle> => new Map(l.map((c) => [JSON.stringify([c.type, c.objetId]), { type: c.type, objetId: c.objetId }]));
  const voulues = ids(source);
  const presentes = ids(await depot.cles(societeId));
  return {
    manquants: [...voulues].filter(([k]) => !presentes.has(k)).map(([, c]) => c),
    orphelins: [...presentes].filter(([k]) => !voulues.has(k)).map(([, c]) => c),
  };
}

/** Contrôle quotidien (UTC) ; seul le nombre d'écarts est transmis, jamais de texte. */
export function inscrireControleQuotidien(
  planificateur: Planificateur, depot: DepotRecherche,
  charger: () => Promise<ReadonlyMap<string, readonly EntreeBase[]>>, signaler: (societeId: string, ecarts: number) => void,
): void {
  planificateur.inscrire({
    nom: 'controle-coherence-recherche', rythme: { chaque: 'jour', heure: 3, minute: 0 },
    async executer() {
      for (const [societeId, source] of await charger()) {
        const c = await controlerCoherence(depot, societeId, source);
        if (c.manquants.length + c.orphelins.length > 0) signaler(societeId, c.manquants.length + c.orphelins.length);
      }
    },
  });
}
