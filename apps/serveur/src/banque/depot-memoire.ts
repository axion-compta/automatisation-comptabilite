// Implémentation en mémoire de DepotBanque : porte les règles, sans base ni appel sortant.
import { ajouterEntree, teteInitiale, type EntreeJournal, type Tete } from '../../../../packages/noyau/src/journal/chaine.js';
import { CANAUX } from '../../../../packages/noyau/src/securite/types.js';
import {
  ErreurDepot, TABLES_AJOUT_SEUL, TABLES_BANQUE, verifierValeurs,
  type CodeDepot, type Contexte, type DepotBanque, type Rangee, type TableBanque,
} from './depot.js';

/** Compteur complété de zéros : l'ordre des chaînes suit l'ordre de création. */
export function nouvelIdOrdonne(): () => string {
  let n = 0;
  return () => `B${String(++n).padStart(10, '0')}`;
}

const refuser = (c: CodeDepot): never => {
  throw new ErreurDepot(c);
};

export function creerDepotMemoire(options: { nouvelId: () => string }): DepotBanque {
  const tables = new Map<string, Map<string, Rangee>>();
  const journaux = new Map<string, { tete: Tete; entrees: EntreeJournal[] }>();

  const verifier = (ctx: Contexte, table: string): TableBanque => {
    const vide = (t: unknown) => typeof t !== 'string' || t === '';
    if (
      !ctx || vide(ctx.societeId) || vide(ctx.module) || vide(ctx.acteur?.id) ||
      !(CANAUX as readonly unknown[]).includes(ctx.canal) ||
      typeof ctx.horodatage !== 'string' || Number.isNaN(Date.parse(ctx.horodatage))
    ) return refuser('contexte_invalide');
    if (!(TABLES_BANQUE as readonly string[]).includes(table)) return refuser('table_inconnue');
    return table as TableBanque;
  };
  const noter = (ctx: Contexte, evenement: string, apres: unknown): void => {
    const j = journaux.get(ctx.societeId) ?? { tete: teteInitiale(ctx.societeId, ctx.horodatage), entrees: [] };
    const r = ajouterEntree(j.tete, {
      societeId: ctx.societeId, horodatage: ctx.horodatage, acteur: `${ctx.acteur.type}:${ctx.acteur.id}`,
      canal: ctx.canal, evenement, apres,
    });
    j.tete = r.tete;
    j.entrees.push(r.entree);
    journaux.set(ctx.societeId, j);
  };
  const trouver = (ctx: Contexte, table: TableBanque, id: string): Rangee => {
    const r = tables.get(table)?.get(id) ?? refuser('inconnu');
    if (r.societeId !== ctx.societeId) {
      noter(ctx, 'banque.acces_refuse', { id });
      return refuser('acces_refuse');
    }
    return r;
  };
  const noterEcriture = (ctx: Contexte, evenement: string, table: string, r: Rangee, valeurs: Record<string, unknown>) =>
    noter(ctx, evenement, { table, id: r.id, version: r.version, champs: Object.keys(valeurs) });

  return {
    async ajouter(ctx, table, valeurs) {
      verifier(ctx, table);
      if (table === 'journal_action') return refuser('journal_reserve');
      const faute = verifierValeurs(valeurs, ctx.module);
      if (faute) return refuser(faute);
      const r: Rangee = { ...structuredClone(valeurs), id: options.nouvelId(), societeId: ctx.societeId, version: 1 };
      noterEcriture(ctx, 'banque.ajout', table, r, valeurs);
      tables.set(table, (tables.get(table) ?? new Map()).set(r.id, r));
      return structuredClone(r);
    },
    async lire(ctx, table, id) {
      verifier(ctx, table);
      return structuredClone(trouver(ctx, table, id));
    },
    async lister(ctx, table, filtre = {}) {
      verifier(ctx, table);
      return [...(tables.get(table)?.values() ?? [])]
        .filter((r) => r.societeId === ctx.societeId && Object.entries(filtre).every(([k, v]) => r[k] === v))
        .map((r) => structuredClone(r));
    },
    async modifier(ctx, table, id, versionAttendue, changements) {
      verifier(ctx, table);
      if (table === 'journal_action') return refuser('journal_reserve');
      if (TABLES_AJOUT_SEUL.includes(table)) return refuser('ajout_seul');
      const r = trouver(ctx, table, id);
      if (table === 'lien_rapprochement' && r.etat === 'valide') return refuser('lien_valide_fige');
      if (versionAttendue !== r.version) return refuser('version_perimee');
      const faute = verifierValeurs(changements, ctx.module);
      if (faute) return refuser(faute);
      const suite: Rangee = { ...r, ...structuredClone(changements), version: r.version + 1 };
      noterEcriture(ctx, 'banque.modification', table, suite, changements);
      tables.get(table)?.set(id, suite);
      return structuredClone(suite);
    },
    async journal(ctx) {
      verifier(ctx, 'journal_action');
      return structuredClone(journaux.get(ctx.societeId)?.entrees ?? []);
    },
  };
}
