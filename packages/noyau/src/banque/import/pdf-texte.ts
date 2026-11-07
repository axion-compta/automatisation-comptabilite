// Relevé PDF texte (déjà extrait côté serveur) lu par les règles d'un profil : fonction pure, sans entrée-sortie.
// Chaque règle est la source d'une expression à groupes nommés, bornée en longueur, avec les seuls drapeaux `u` et `i`.
import type { Centimes } from '../../argent/index.js';
import type { LigneLue, ReleveLu } from '../types.js';
import { ErreurDate, lireDate } from './dates.js';
import type { FormatDate } from './dates.js';
import { ErreurMontant, lireMontant, montantSigne } from './montants.js';
import type { FormatMontant } from './montants.js';

export const LONGUEUR_MAX_SOURCE = 300;
const DRAPEAUX = 'iu';
const MOTIF_DANGEREUX = /\([^()]*[+*][^()]*\)[+*{]/;

export class ErreurReglesPdf extends Error {
  override name = 'ErreurReglesPdf';
  readonly code = 'regles_invalides';
  constructor() {
    super('regles_invalides');
  }
}

export type ReglesPdf = {
  ligne: string; soldeOuverture: string; soldeCloture: string; entetePeriode: string;
  formatDate: FormatDate; format: FormatMontant; devise: string;
};
export type PagePdf = { numero: number; lignes: string[] };

const groupe = (source: string, nom: string): boolean => source.includes(`(?<${nom}>`);
const compiler = (source: string, obligatoires: string[][]): RegExp => {
  if (typeof source !== 'string' || source.length > LONGUEUR_MAX_SOURCE || MOTIF_DANGEREUX.test(source)) throw new ErreurReglesPdf();
  if (!obligatoires.some((ensemble) => ensemble.every((nom) => groupe(source, nom)))) throw new ErreurReglesPdf();
  try {
    return new RegExp(source, DRAPEAUX);
  } catch {
    throw new ErreurReglesPdf();
  }
};

type Compilees = { ligne: RegExp; ouverture: RegExp; cloture: RegExp; entete: RegExp };
const compilerTout = (r: ReglesPdf): Compilees => ({
  ligne: compiler(r.ligne, [['date', 'libelle', 'montant'], ['date', 'libelle', 'debit', 'credit']]),
  ouverture: compiler(r.soldeOuverture, [['solde']]),
  cloture: compiler(r.soldeCloture, [['solde']]),
  entete: compiler(r.entetePeriode, [['du', 'au']]),
});

export function verifierRegles(r: ReglesPdf): void {
  compilerTout(r);
}

export function lirePdfTexte(pages: readonly PagePdf[], regles: ReglesPdf): ReleveLu[] {
  const re = compilerTout(regles);
  const releves: ReleveLu[] = [];
  let courant: ReleveLu | undefined;
  let derniere: LigneLue | undefined;
  let rang = 0;
  const ouvrir = (): ReleveLu => {
    courant ??= { devise: regles.devise, lignes: [], rejets: [] };
    if (!releves.includes(courant)) releves.push(courant);
    return courant;
  };
  const solde = (t: string | undefined): Centimes | undefined => {
    try {
      return t === undefined ? undefined : lireMontant(t, regles.format);
    } catch (e) {
      if (e instanceof ErreurMontant) return undefined;
      throw e;
    }
  };
  const dateOuRien = (t: string | undefined): string | undefined => {
    try {
      return t === undefined ? undefined : lireDate(t, regles.formatDate);
    } catch (e) {
      if (e instanceof ErreurDate) return undefined;
      throw e;
    }
  };

  for (const p of [...pages].sort((a, b) => a.numero - b.numero)) {
    p.lignes.forEach((texte, i) => {
      rang += 1;
      if (texte.trim() === '') return;
      const entete = re.entete.exec(texte)?.groups;
      if (entete) {
        courant = { devise: regles.devise, lignes: [], rejets: [] };
        const debut = dateOuRien(entete.du);
        const fin = dateOuRien(entete.au);
        if (debut !== undefined) courant.periodeDebut = debut;
        if (fin !== undefined) courant.periodeFin = fin;
        ouvrir();
        derniere = undefined;
        return;
      }
      const ouv = re.ouverture.exec(texte)?.groups;
      const clo = re.cloture.exec(texte)?.groups;
      if (ouv || clo) {
        const s = solde((ouv ?? clo)?.solde);
        const r = ouvrir();
        if (s !== undefined) r[ouv ? 'soldeOuverture' : 'soldeCloture'] = s;
        derniere = undefined;
        return;
      }
      const g = re.ligne.exec(texte)?.groups;
      if (!g) {
        if (derniere && texte.trim() !== '') derniere.libelleBrut = `${derniere.libelleBrut} ${texte.trim()}`;
        return;
      }
      const r = ouvrir();
      try {
        const montant = montantSigne({ montant: g.montant, debit: g.debit, credit: g.credit }, groupe(regles.ligne, 'montant') ? { type: 'signe', colonne: 'montant' } : { type: 'debit_credit', debit: 'debit', credit: 'credit' }, regles.format);
        derniere = { rang, dateOperation: lireDate(g.date ?? '', regles.formatDate), montant, devise: regles.devise, libelleBrut: (g.libelle ?? '').trim(), etatTechnique: 'completee' };
        r.lignes.push(derniere);
      } catch (e) {
        if (!(e instanceof ErreurDate || e instanceof ErreurMontant)) throw e;
        r.rejets.push({ rang, motif: `${e.code}:p${p.numero}:l${i + 1}` });
        derniere = undefined;
      }
    });
  }
  return releves;
}
