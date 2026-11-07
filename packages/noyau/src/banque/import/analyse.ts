// Analyse d'un relevé déjà lu côté serveur : assemble les briques pures (lecture, soldes, rattachement) et rend un rapport.
// Aucune écriture, aucune ligne créée. Un profil absent n'est jamais deviné : une question est posée. Pas d'IBAN ni de libellé
// dans les erreurs.
import type { LigneLue, ReleveLu } from '../types.js';
import { ErreurCamt, lireCamt053 } from './camt.js';
import { ErreurCsv, ligneDeTotal, lireCsv } from './csv.js';
import { detecterSeparateur } from './detection.js';
import { ErreurOfx, lireOfx1, lireOfx2 } from './ofx.js';
import { ErreurReglesPdf, lirePdfTexte } from './pdf-texte.js';
import type { PagePdf, ReglesPdf } from './pdf-texte.js';
import { ErreurProfil, appliquerProfil } from './profil.js';
import type { LigneBrute, ProfilImport } from './profil.js';
import { rattacher } from './rattachement.js';
import type { CompteRattachable, Rattachement } from './rattachement.js';
import { controlerSoldes } from './soldes.js';
import type { ResultatSoldes } from './soldes.js';
import { ErreurXml, lireXml } from './xml.js';
import type { LimitesXml } from './xml.js';

export type EntreeReleve =
  | { format: 'csv'; texte: string }
  | { format: 'tableur'; lignes: string[][] }
  | { format: 'camt053' | 'ofx1' | 'ofx2'; texte: string }
  | { format: 'pdf'; pages: PagePdf[] };

export type ContexteAnalyse = {
  profil?: ProfilImport;
  reglesPdf?: ReglesPdf;
  comptes: CompteRattachable[];
  compteChoisi?: string;
  /** Haché de l'IBAN du fichier, ou fonction qui hache l'IBAN lu de chaque relevé (cas de plusieurs comptes). */
  ibanHache?: string | ((ibanBrut: string | undefined) => string | undefined);
  taillesApercu: number;
  limitesXml: LimitesXml;
};

type Question = { code: 'format_date' | 'quel_compte' | 'profil_a_choisir'; choix: string[] };
type Compteurs = { lues: number; importees: number; rejetees: number };
export type RapportImport = {
  etat: 'apercu' | 'a_confirmer' | 'refuse' | 'vide';
  releves: { releve: ReleveLu; rattachement: Rattachement; controle: ResultatSoldes }[];
  apercu: LigneLue[];
  questions: Question[];
  compteurs: Compteurs;
  motifRefus?: 'solde_pdf_faux' | 'format_inconnu' | 'xml_refuse';
};

type Lu = { releves: ReleveLu[]; compteurs: Compteurs[] };
const AUCUN: RapportImport = { etat: 'a_confirmer', releves: [], apercu: [], questions: [], compteurs: { lues: 0, importees: 0, rejetees: 0 } };
const compter = (r: ReleveLu): Compteurs => ({ lues: r.lignes.length + r.rejets.length, importees: r.lignes.length, rejetees: r.rejets.length });
const refus = (motifRefus: NonNullable<RapportImport['motifRefus']>): RapportImport => ({ ...AUCUN, etat: 'refuse', motifRefus });

function lireTableau(lignes: string[][], texteCsv: string | undefined, profil: ProfilImport): Lu {
  let brutes: LigneBrute[];
  const rejetsCsv: ReleveLu['rejets'] = [];
  if (texteCsv !== undefined) {
    const sep = detecterSeparateur(texteCsv);
    if (sep === null) throw new ErreurCsv('separateur_invalide');
    const lu = lireCsv(texteCsv, sep, profil.ligneEntete);
    brutes = lu.lignes;
    rejetsCsv.push(...lu.rejets.map((r) => ({ rang: r.rang, motif: r.motif })));
  } else brutes = lignes.slice(profil.ligneEntete + 1).map((cellules, i) => ({ rang: i + 1, cellules }));
  const { lignes: corps, total } = ligneDeTotal(brutes.map((b) => ({ rang: b.rang, cellules: [...b.cellules] })));
  const r = appliquerProfil(corps, profil, total ?? undefined);
  const releve: ReleveLu = { ...r, rejets: [...r.rejets, ...rejetsCsv] };
  return { releves: [releve], compteurs: [{ lues: r.compteurs.lues + rejetsCsv.length, importees: r.compteurs.importees, rejetees: r.compteurs.rejetees + rejetsCsv.length }] };
}

function lire(entree: EntreeReleve, ctx: ContexteAnalyse): Lu | { question: Question } {
  if (entree.format === 'pdf') {
    if (ctx.reglesPdf === undefined) throw new ErreurReglesPdf();
    const releves = lirePdfTexte(entree.pages, ctx.reglesPdf);
    return { releves, compteurs: releves.map(compter) };
  }
  if (entree.format === 'csv' || entree.format === 'tableur') {
    if (ctx.profil === undefined) return { question: { code: 'profil_a_choisir', choix: [] } };
    return entree.format === 'csv' ? lireTableau([], entree.texte, ctx.profil) : lireTableau(entree.lignes, undefined, ctx.profil);
  }
  const releves = entree.format === 'ofx1' ? lireOfx1(entree.texte) : (() => {
    const racine = lireXml(entree.texte, ctx.limitesXml);
    return entree.format === 'camt053' ? lireCamt053(racine) : lireOfx2(racine);
  })();
  return { releves, compteurs: releves.map(compter) };
}

export function analyserReleve(entree: EntreeReleve, ctx: ContexteAnalyse): RapportImport {
  const taille = ctx.taillesApercu;
  if (!Number.isSafeInteger(taille) || taille < 1) throw new Error('taille_apercu_invalide');
  let lu: Lu | { question: Question };
  try {
    lu = lire(entree, ctx);
  } catch (e) {
    if (e instanceof ErreurXml) return refus('xml_refuse');
    if (e instanceof ErreurProfil) return { ...AUCUN, questions: [{ code: 'profil_a_choisir', choix: [] }] };
    if (e instanceof ErreurCamt || e instanceof ErreurOfx || e instanceof ErreurCsv || e instanceof ErreurReglesPdf) return refus('format_inconnu');
    throw e;
  }
  if ('question' in lu) return { ...AUCUN, questions: [lu.question] };

  const questions: Question[] = [];
  const releves = lu.releves.map((releve) => {
    const iban = typeof ctx.ibanHache === 'function' ? ctx.ibanHache(releve.ibanBrut) : ctx.ibanHache;
    const rattachement = rattacher(
      { ...(iban !== undefined ? { ibanHache: iban } : {}), ...(releve.soldeOuverture !== undefined ? { soldeOuverture: releve.soldeOuverture } : {}), ...(releve.periodeDebut !== undefined ? { periodeDebut: releve.periodeDebut } : {}) },
      ctx.comptes, ctx.compteChoisi, (a, b) => a === b,
    );
    if (rattachement.type === 'question') questions.push({ code: 'quel_compte', choix: rattachement.comptes });
    return { releve, rattachement, controle: controlerSoldes(releve, { refuserSiEcart: false }) };
  });
  const compteurs = lu.compteurs.reduce((s, c) => ({ lues: s.lues + c.lues, importees: s.importees + c.importees, rejetees: s.rejetees + c.rejetees }), AUCUN.compteurs);
  const rapport: RapportImport = { ...AUCUN, releves, questions, compteurs, apercu: releves.flatMap((r) => r.releve.lignes).slice(0, taille) };

  if (entree.format === 'pdf' && releves.some((r) => r.controle.controle === 'ECART')) return { ...rapport, etat: 'refuse', motifRefus: 'solde_pdf_faux' };
  const confirmer = questions.length > 0 || releves.some((r) => r.rattachement.type === 'mauvais_compte');
  const vide = releves.every((r) => r.releve.lignes.length === 0);
  return { ...rapport, etat: confirmer ? 'a_confirmer' : vide ? 'vide' : 'apercu' };
}
