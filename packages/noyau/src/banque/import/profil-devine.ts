// Profil d'un fichier inconnu deviné par l'IA : proposition seulement, confirmée par une personne (V3-AGT-007, V3-BAN-003).
// L'IA ne reçoit que l'en-tête et dix lignes pseudonymisées ; l'aperçu est calculé en local sur les cellules d'origine.
import { pseudonymiser } from '../libelles/pseudonymiser.js';
import { lireCsv } from './csv.js';
import { detecterSeparateur } from './detection.js';
import { appliquerProfil, verifierProfil, type LigneBrute, type ProfilImport, type ReleveImporte } from './profil.js';

export const LIGNES_APERCU = 10;

export type ProposeurProfil = (entree: { entete: string[]; lignes: string[][] }) => Promise<string>;
export type Proposition =
  | { etat: 'propose'; profil: ProfilImport; apercu: ReleveImporte }
  | { etat: 'a_choisir'; motif: 'reponse_illisible' | 'profil_invalide' | 'indisponible' | 'fichier_vide' };
export type Acteur = { type: 'personne' | 'ia'; id: string };

const CHAMPS = ['colonnes', 'signe', 'format', 'formatDate', 'optionsDate', 'deviseParDefaut', 'ligneEntete'];
const COLONNES = ['date', 'dateValeur', 'libelle', 'reference', 'soldeCourant', 'devise'];
const FORMATS_DATE = ['JJ/MM/AAAA', 'MM/JJ/AAAA', 'JJ/MM/AA', 'JJ.MM.AAAA', 'JJ-MM-AAAA', 'AAAA-MM-JJ', 'AAAAMMJJ', 'AAAAMMJJHHMMSS', 'serie'];
const TYPES_SIGNE = ['signe', 'debit_credit', 'sens_dc', 'suffixe_moins'];
const CHAMPS_SIGNE: Record<string, string[]> = {
  signe: ['colonne'], suffixe_moins: ['colonne'], debit_credit: ['debit', 'credit'], sens_dc: ['montant', 'sens', 'debit', 'credit'],
};
const objet = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const dans = (o: Record<string, unknown>, permis: string[]): boolean => Object.keys(o).every((k) => permis.includes(k));

function signeValide(s: Record<string, unknown>): boolean {
  const champs = Object.hasOwn(CHAMPS_SIGNE, String(s.type)) ? CHAMPS_SIGNE[String(s.type)]! : undefined;
  return champs !== undefined && dans(s, ['type', ...champs]) && champs.every((k) => typeof s[k] === 'string');
}
const formatValide = (f: Record<string, unknown>): boolean =>
  dans(f, ['decimal', 'milliers']) && [',', '.'].includes(String(f.decimal)) && typeof f.decimal === 'string' &&
  typeof f.milliers === 'string' && ['', ' ', '.', ',', "'"].includes(f.milliers);
const optionsDateValides = (o: unknown): boolean =>
  o === undefined || (objet(o) && dans(o, ['siecle', 'origineSerie']) && (o.siecle === undefined || Number.isInteger(o.siecle)) &&
    (o.origineSerie === undefined || typeof o.origineSerie === 'string'));

/** Forme exigée avant verifierProfil : aucun champ en trop, aucune correction silencieuse. */
function formeValide(p: unknown): p is ProfilImport {
  if (!objet(p) || !dans(p, CHAMPS)) return false;
  const { colonnes: c, signe: s, format: f } = p;
  return (
    objet(c) && dans(c, COLONNES) && Array.isArray(c.libelle) && objet(s) && TYPES_SIGNE.includes(String(s.type)) && signeValide(s) &&
    objet(f) && formatValide(f) && optionsDateValides(p.optionsDate) && FORMATS_DATE.includes(String(p.formatDate)) && typeof p.deviseParDefaut === 'string' && p.deviseParDefaut !== '' && typeof p.ligneEntete === 'number'
  );
}

export async function deviner(
  lignes: readonly LigneBrute[],
  options: { ligneEntete: number; personnes: readonly string[]; proposer: ProposeurProfil },
): Promise<Proposition> {
  const vide = { etat: 'a_choisir', motif: 'fichier_vide' } as const;
  const entete = lignes[options.ligneEntete]?.cellules;
  const donnees = lignes.slice(options.ligneEntete + 1, options.ligneEntete + 1 + LIGNES_APERCU);
  if (entete === undefined || donnees.length === 0) return vide;

  const rangees = [entete, ...donnees.map((l) => l.cellules)];
  const { textes } = pseudonymiser(rangees.flat(), options.personnes);
  let pos = 0;
  const [teteVue, ...corpsVu] = rangees.map((r) => textes.slice(pos, (pos += r.length)));
  let brut: string;
  try {
    brut = await options.proposer({ entete: teteVue!, lignes: corpsVu });
  } catch {
    return { etat: 'a_choisir', motif: 'indisponible' };
  }
  let profil: unknown;
  try {
    profil = JSON.parse(brut);
  } catch {
    return { etat: 'a_choisir', motif: 'reponse_illisible' };
  }
  const invalide = { etat: 'a_choisir', motif: 'profil_invalide' } as const;
  try {
    if (!formeValide(profil) || profil.ligneEntete !== options.ligneEntete) return invalide;
    verifierProfil(profil, entete.length);
    return { etat: 'propose', profil, apercu: appliquerProfil(donnees, profil) };
  } catch {
    return invalide;
  }
}

export function confirmer(p: Proposition, acteur: Acteur): { etat: 'confirme'; profil: ProfilImport; par: Acteur } {
  if (acteur.type === 'ia' || acteur.id === '') throw new Error('confirmation_reservee_a_une_personne');
  if (p.etat !== 'propose') throw new Error('rien_a_confirmer');
  return { etat: 'confirme', profil: p.profil, par: acteur };
}

const canon = (v: unknown): string =>
  JSON.stringify(v, (_c, x: unknown) => (objet(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

/** Banc T02-7 : un fichier est juste si le profil proposé égale le profil de référence. */
export async function mesurer(
  fichiers: readonly { texte?: string; profil?: ProfilImport }[],
  proposer: ProposeurProfil,
): Promise<{ justes: number; total: number }> {
  let justes = 0;
  let total = 0;
  for (const f of fichiers) {
    const sep = f.texte === undefined || f.profil === undefined ? null : detecterSeparateur(f.texte);
    if (f.texte === undefined || f.profil === undefined || sep === null) continue;
    const csv = lireCsv(f.texte, sep, f.profil.ligneEntete);
    const lignes: LigneBrute[] = [{ rang: 0, cellules: csv.entete }, ...csv.lignes];
    const r = await deviner(lignes, { ligneEntete: 0, personnes: [], proposer });
    total += 1;
    if (r.etat === 'propose' && canon(r.profil) === canon({ ...f.profil, ligneEntete: 0 })) justes += 1;
  }
  return { justes, total };
}
