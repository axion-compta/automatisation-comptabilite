import { createHash, randomUUID } from 'node:crypto';
import type { PortExperts, Perimetre } from './isolation-interface.js';

/** Garde d'un fichier d'export : un jour. */
export const GARDE_MS = 24 * 3600 * 1000;

export type Acteur = {
  personneId: string; societeId: string;
  roles: readonly string[]; permissions: readonly string[];
};
export type DemandeFichier = {
  liste: string; perimetre: Perimetre; filtres: Record<string, unknown>;
  produire: () => Promise<{ octets: Uint8Array; nbLignes: number }>;
};
export type FichierExport = {
  id: string; cle: string; societeId: string; demandeur: string; liste: string; perimetre: Perimetre;
  octets: Uint8Array; empreinte: string; nbLignes: number; expireA: number; marqueExpire: boolean;
};
/** Prise de stockage (Union européenne). La console fournira le vrai service ; ici un faux en mémoire. */
export interface PortStockage {
  ecrire(f: FichierExport): Promise<void>;
  lire(cle: string): Promise<FichierExport | null>;
  lister(): Promise<FichierExport[]>;
  marquerExpire(cle: string): Promise<void>;
}
export type EntreeJournal = {
  evenement: 'export_cree' | 'export_telecharge' | 'export_refuse' | 'export_marque_expire';
  qui: string; liste: string; empreinteFiltres: string; nbLignes: number; empreinteFichier: string; code?: number;
};
export interface PortJournal { ajouter(e: EntreeJournal): Promise<void> }
export type Dependances = {
  stockage: PortStockage; experts: PortExperts; journal: PortJournal; maintenantMs: () => number;
  identifiant?: () => string;
};
export type Reponse = { statut: number; entetes: Record<string, string>; corps: Uint8Array | { code: string; id?: string } };

const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const trier = (v: unknown): unknown => Array.isArray(v) ? v.map(trier)
  : v !== null && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, trier(x)]))
    : v;
/** Empreinte des filtres : jamais leur texte dans le journal. */
export const empreinteFiltres = (filtres: Record<string, unknown>): string => sha(JSON.stringify(trier(filtres)));
export const cleExport = (societeId: string, id: string): string => `compta/${societeId}/exports/${id}`;

const ENTETES = {
  'Cache-Control': 'no-store', 'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff',
} as const;
const erreur = (statut: number, code: string): Reponse => ({ statut, entetes: { 'Cache-Control': 'no-store' }, corps: { code } });

/** Faux stockage en mémoire pour les essais ; l'effacement réel n'existe pas encore : marquage seulement. */
export function creerStockageMemoire(): PortStockage {
  const m = new Map<string, FichierExport>();
  return {
    ecrire: async (f) => { m.set(f.cle, { ...f }); },
    lire: async (cle) => { const f = m.get(cle); return f ? { ...f } : null; },
    lister: async () => [...m.values()].map((f) => ({ ...f })),
    marquerExpire: async (cle) => { const f = m.get(cle); if (f) f.marqueExpire = true; },
  };
}

export function creerServiceExportsFichiers(d: Dependances) {
  const identifiant = d.identifiant ?? randomUUID;
  const trace = (f: FichierExport, e: EntreeJournal['evenement'], qui: string, filtres: string, code?: number) =>
    d.journal.ajouter({ evenement: e, qui, liste: f.liste, empreinteFiltres: filtres, nbLignes: f.nbLignes, empreinteFichier: f.empreinte, ...(code ? { code } : {}) });
  const filtresDe = new Map<string, string>();

  /** Vérifié à CHAQUE téléchargement : permission, accès de l'expert, périmètre qui couvre la liste. */
  async function droits(a: Acteur, f: FichierExport): Promise<number | null> {
    if (!a.permissions.includes('compta-exporter')) return 403;
    if (a.roles.includes('invite_externe')) {
      const acces = await d.experts.lire(a.personneId, a.societeId);
      if (acces === null || acces.etat !== 'actif') return 403;
      if (!acces.perimetre.includes(f.perimetre)) return 403;
    }
    return null;
  }

  return {
    /** Au-delà du direct : réponse 202 et identifiant à interroger (GET …/exports/{id}). */
    async demander(a: Acteur, q: DemandeFichier): Promise<Reponse> {
      if (!a.permissions.includes('compta-exporter')) return erreur(403, 'role_insuffisant');
      const { octets, nbLignes } = await q.produire();
      const id = identifiant();
      const f: FichierExport = {
        id, cle: cleExport(a.societeId, id), societeId: a.societeId, demandeur: a.personneId, liste: q.liste,
        perimetre: q.perimetre, octets, empreinte: sha(octets), nbLignes,
        expireA: d.maintenantMs() + GARDE_MS, marqueExpire: false,
      };
      await d.stockage.ecrire(f);
      const ef = empreinteFiltres(q.filtres);
      filtresDe.set(f.cle, ef);
      await trace(f, 'export_cree', a.personneId, ef);
      return { statut: 202, entetes: { 'Cache-Control': 'no-store' }, corps: { code: 'accepte', id } };
    },

    /** État de la tâche : seule la personne qui a demandé le fichier le voit. */
    async etat(a: Acteur, id: string): Promise<Reponse> {
      const f = await d.stockage.lire(cleExport(a.societeId, id));
      if (f === null || f.demandeur !== a.personneId) return erreur(404, 'introuvable');
      const perime = f.marqueExpire || d.maintenantMs() >= f.expireA;
      return { statut: perime ? 410 : 200, entetes: { 'Cache-Control': 'no-store' }, corps: { code: perime ? 'expire' : 'pret' } };
    },

    async telecharger(a: Acteur, id: string): Promise<Reponse> {
      const f = await d.stockage.lire(cleExport(a.societeId, id));
      if (f === null || f.societeId !== a.societeId || f.demandeur !== a.personneId) return erreur(404, 'introuvable');
      const ef = filtresDe.get(f.cle) ?? '';
      const refus = await droits(a, f);
      if (refus !== null) { await trace(f, 'export_refuse', a.personneId, ef, refus); return erreur(refus, 'acces_refuse'); }
      if (f.marqueExpire || d.maintenantMs() >= f.expireA) {
        await trace(f, 'export_refuse', a.personneId, ef, 410);
        return erreur(410, 'expire');
      }
      await trace(f, 'export_telecharge', a.personneId, ef);
      return { statut: 200, entetes: { ...ENTETES }, corps: f.octets };
    },

    /** Passé l'échéance, le fichier est marqué expiré (l'effacement réel viendra avec la console). */
    async expirer(): Promise<number> {
      let n = 0;
      for (const f of await d.stockage.lister()) {
        if (f.marqueExpire || d.maintenantMs() < f.expireA) continue;
        await d.stockage.marquerExpire(f.cle);
        await trace(f, 'export_marque_expire', f.demandeur, filtresDe.get(f.cle) ?? '');
        n += 1;
      }
      return n;
    },
  };
}
