import { ajouter, centimes, type Centimes } from '../../../noyau/src/argent/index.js';
import { ecrireCsv } from '../../../noyau/src/exports/csv.js';
import { decisionVolume, nomDeFeuille, nomDeFichier, type FormatExport } from '../../../noyau/src/exports/fichier.js';
import { ecrireXlsx, partiesXlsx } from '../../../noyau/src/exports/xlsx.js';
import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { catalogueExportable, type ListeExportable } from '../exports/catalogue.js';
import { contrat } from '../routes.js';
import { EXERCICE_FICTIF } from './calendrier-service.js';
import { creerServiceAlertes } from './alertes-service.js';
import { creerServicePlan } from './plan-service.js';
import { creerServiceTiers } from './tiers-service.js';
import type { DemandeExport } from './exports.js';

/** HYPOTHÈSE (point S2) : réglages de volume, à confirmer. Au-delà de `direct`, une tâche ; au-delà de `maximum`, refus. */
export const LIMITES_EXPORT = { direct: 10_000, maximum: 100_000 } as const;
const TAILLE_PAGE = 100;
const SOCIETE_CODE = 'societe-fictive';
const ETIQUETTE_TOTAL = 'total_lignes_filtrees';
export const TYPES_CONTENU: Record<FormatExport, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type Ligne = Record<string, unknown>;
export type PageSource = { body: Ligne[]; total: number };
/** Une source = la fonction de liste du service existant, avec les filtres admis par sa route. */
export interface SourceExport {
  code: string;
  filtres: readonly string[];
  lister(filtres: Record<string, string | number>, decalage: number, limite: number): PageSource | undefined;
}
export type CodeErreurExport = 'liste_non_exportable' | 'filtre_invalide' | 'export_trop_gros' | 'export_en_tache_a_venir';
export class ErreurExport extends Error {
  constructor(readonly code: CodeErreurExport) { super(code); }
}
export type FichierExporte = { nom: string; typeContenu: string; octets: Uint8Array; parties?: Record<string, string> };
export type ReponseExporter = { body: { nom: string; typeContenu: string; octetsBase64: string; nbLignes: number; empreinte: string } };
export type Empreinte = (octets: Uint8Array) => Promise<string>;

const hexa = (buf: ArrayBuffer): string => Array.from(new Uint8Array(buf), (o) => o.toString(16).padStart(2, '0')).join('');
/** Empreinte SHA-256 commune (navigateur et Node) ; le serveur injecte `node:crypto`. */
export const empreinteSha256: Empreinte = async (octets) => hexa(await globalThis.crypto.subtle.digest('SHA-256', octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer));

export function versBase64(octets: Uint8Array): string {
  let s = '';
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Sources par `operationId` ; chaque appel passe les MÊMES arguments que la route de liste. */
export function sourcesParDefaut(): Record<string, SourceExport> {
  const plan = creerServicePlan();
  const tiers = creerServiceTiers();
  const alertes = creerServiceAlertes();
  const exo = (f: Record<string, string | number>): string => String(f['exercice'] ?? EXERCICE_FICTIF);
  return {
    listerExercices: { code: 'exercices', filtres: [], lister: (_f, d, l) => { const p = plan.exercices(); return { body: p.body.slice(d, d + l), total: p.total }; } },
    listerPlan: { code: 'plan', filtres: ['exercice', 'classe', 'q'], lister: (f, d, l) => plan.plan(exo(f), { classe: f['classe'] as number | undefined, q: f['q'] as string | undefined, decalage: d, limite: l }) },
    listerTiers: { code: 'tiers', filtres: ['type', 'q'], lister: (f, d, l) => tiers.lister({ type: f['type'] as 'client' | undefined, q: f['q'] as string | undefined, decalage: d, limite: l }) },
    listerAlertes: { code: 'alertes', filtres: ['exercice', 'etat', 'entree'], lister: (f, d, l) => (alertes.exerciceConnu(exo(f)) ? alertes.lister({ etat: f['etat'] as 'ouverte' | undefined, entree: f['entree'] as string | undefined, decalage: d, limite: l }) : undefined) },
  };
}

/** Valide les valeurs de filtre avec le schéma d'entrée de la route de liste (mêmes bornes que l'écran). */
function filtresValides(operationId: string, source: SourceExport, filtres: Record<string, string | number>): Record<string, string | number> {
  if (Object.keys(filtres).some((k) => !source.filtres.includes(k))) throw new ErreurExport('filtre_invalide');
  const { exercice, ...query } = filtres;
  const procedure = Object.values(contrat).flatMap((d) => Object.entries(d as object)).find(([nom]) => nom === operationId)?.[1] as { '~orpc': { inputSchema: { safeParse(v: unknown): { success: boolean; data?: { params: Record<string, string>; query?: Record<string, string | number> } } } } };
  const entree = { params: { exercice: String(exercice ?? EXERCICE_FICTIF) }, query };
  const lu = procedure['~orpc'].inputSchema.safeParse(entree);
  if (!lu.success || !lu.data) throw new ErreurExport('filtre_invalide');
  // Valeurs issues du schéma (converties, comme la route de liste), jamais les valeurs brutes.
  const converti: Record<string, string | number> = { ...lu.data.query, ...lu.data.params };
  return Object.fromEntries(Object.entries(converti).filter(([k, v]) => source.filtres.includes(k) && v !== undefined));
}

/** Fichier CSV ou XLSX d'une liste : total par `ajouter`, nom par `nomDeFichier`, aucun envoi. */
export function exporterListe(liste: ListeExportable, format: FormatExport, lignes: Ligne[], options: { code: string; jour: string }): FichierExporte & { total?: Centimes } {
  const colonnes = liste.colonnes.map((c) => ({ code: c.code, type: c.type, entete: c.code }));
  const nom = nomDeFichier(options.code, SOCIETE_CODE, options.jour, format);
  const col = liste.colonneTotal;
  const total = col === undefined ? undefined : { etiquette: ETIQUETTE_TOTAL, colonne: col, valeurCentimes: lignes.reduce((s, l) => ajouter(s, centimes(Number(l[col]))), centimes(0)) };
  const entree = { colonnes, lignes, ...(total ? { total } : {}) };
  const typeContenu = TYPES_CONTENU[format];
  if (format === 'csv') return { nom, typeContenu, octets: new TextEncoder().encode(ecrireCsv(entree)), ...(total ? { total: total.valeurCentimes } : {}) };
  const xlsx = { ...entree, nomFeuille: nomDeFeuille(options.code) };
  return { nom, typeContenu, octets: ecrireXlsx(xlsx), parties: partiesXlsx(xlsx), ...(total ? { total: total.valeurCentimes } : {}) };
}

export type OptionsServiceExports = { sources?: Record<string, SourceExport>; jour?: () => string; empreinte?: Empreinte };

/** Service en mémoire : la requête est celle de la liste ; le fichier reste dans la réponse, jamais envoyé ailleurs. */
export function creerServiceExports(options: OptionsServiceExports = {}) {
  const sources = options.sources ?? sourcesParDefaut();
  const jour = options.jour ?? ((): string => genererInterface().profils.pleine.jourDeReference);
  const empreinte = options.empreinte ?? empreinteSha256;
  const rejeux = new Map<string, ReponseExporter>();
  const catalogue = catalogueExportable(contrat);

  return {
    async exporter(cle: string, demande: DemandeExport): Promise<ReponseExporter> {
      const signature = `${cle}|${JSON.stringify(demande)}`;
      const deja = rejeux.get(signature);
      if (deja) return structuredClone(deja);
      const source = sources[demande.liste];
      const liste = catalogue.find((l) => l.code === demande.liste);
      if (!source || !liste) throw new ErreurExport('liste_non_exportable');
      if (demande.tri !== undefined) throw new ErreurExport('filtre_invalide');
      const filtres = filtresValides(demande.liste, source, demande.filtres ?? {});
      const lignes: Ligne[] = [];
      for (let total = Infinity; lignes.length < total; ) {
        const page = source.lister(filtres, lignes.length, TAILLE_PAGE);
        if (!page) throw new ErreurExport('filtre_invalide');
        total = page.total;
        if (lignes.length === 0) {
          const decision = decisionVolume(total, LIMITES_EXPORT);
          if (decision === 'trop_gros') throw new ErreurExport('export_trop_gros');
          if (decision === 'tache') throw new ErreurExport('export_en_tache_a_venir');
        }
        if (page.body.length === 0) break;
        lignes.push(...page.body);
      }
      const f = exporterListe(liste, demande.format, lignes, { code: source.code, jour: jour() });
      const reponse = { body: { nom: f.nom, typeContenu: f.typeContenu, octetsBase64: versBase64(f.octets), nbLignes: lignes.length, empreinte: await empreinte(f.octets) } };
      rejeux.set(signature, structuredClone(reponse));
      return reponse;
    },
  };
}
export type ServiceExportsComplet = ReturnType<typeof creerServiceExports>;
