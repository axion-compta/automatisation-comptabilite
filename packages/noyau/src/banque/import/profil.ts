// Profil d'import : applique colonnes, signe, dates et solde courant aux lignes d'un CSV ou d'un classeur.
// Les noms de colonne du mode de signe sont les indices en texte ("3"). Aucune correction silencieuse.
import type { Centimes } from '../../argent/index.js';
import type { LigneLue, ReleveLu } from '../types.js';
import { ErreurDate, lireDate } from './dates.js';
import type { FormatDate, OptionsDate } from './dates.js';
import { ErreurMontant, lireMontant, montantSigne } from './montants.js';
import type { FormatMontant, ModeSigne } from './montants.js';

export class ErreurProfil extends Error {
  override name = 'ErreurProfil';
  readonly code = 'profil_invalide';
  constructor() {
    super('profil_invalide');
  }
}

export type ProfilImport = {
  colonnes: { date: number; dateValeur?: number; libelle: number[]; reference?: number; soldeCourant?: number; devise?: number };
  signe: ModeSigne; format: FormatMontant; formatDate: FormatDate; optionsDate?: OptionsDate; deviseParDefaut: string; ligneEntete: number;
};
export type LigneBrute = { rang: number; cellules: readonly string[] };
export type Chainage = 'ABSENT' | 'OK' | 'IMPOSSIBLE' | 'INCOHERENT';
export type ReleveImporte = ReleveLu & {
  compteurs: { lues: number; importees: number; rejetees: number };
  chainage: Chainage; signaux: { code: 'chainage_incoherent'; rang: number }[];
  total?: { etat: 'egal' | 'different' | 'illisible'; ecart?: Centimes };
};

const entierPositif = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const colonnesDuSigne = (s: ModeSigne): string[] =>
  s.type === 'debit_credit' ? [s.debit, s.credit] : s.type === 'sens_dc' ? [s.montant, s.sens] : [s.colonne];

export function verifierProfil(p: ProfilImport, nbColonnes: number): void {
  const { colonnes: c } = p;
  const optionnelles = [c.dateValeur, c.reference, c.soldeCourant, c.devise].filter((x) => x !== undefined);
  const signe = colonnesDuSigne(p.signe).map((n) => (/^\d+$/.test(n) ? Number(n) : -1));
  const tous = [c.date, ...c.libelle, ...optionnelles, ...signe];
  const ok = entierPositif(nbColonnes) && c.libelle.length > 0 && entierPositif(p.ligneEntete) &&
    tous.every((i) => entierPositif(i) && i < nbColonnes) && new Set(tous).size === tous.length;
  if (!ok) throw new ErreurProfil();
}

const lireSoldes = (valeur: string | undefined, f: FormatMontant): Centimes | undefined => {
  if (valeur === undefined || valeur.trim() === '') return undefined;
  try { return lireMontant(valeur, f); } catch (e) { if (e instanceof ErreurMontant) return undefined; throw e; }
};

export function appliquerProfil(lignes: readonly LigneBrute[], profil: ProfilImport, total?: { cellules: readonly string[] }): ReleveImporte {
  if (lignes.length > 0) verifierProfil(profil, Math.max(...lignes.map((l) => l.cellules.length)));
  const { colonnes: c } = profil;
  const triees = [...lignes].sort((a, b) => a.rang - b.rang);
  const lues: Array<{ l: LigneLue; solde: Centimes | undefined }> = [];
  const rejets: ReleveLu['rejets'] = [];
  const signaux: ReleveImporte['signaux'] = [];
  const cellule = (l: LigneBrute, i: number | undefined): string => (i === undefined ? '' : (l.cellules[i] ?? '').trim());
  const parNom = (l: LigneBrute): Record<string, string> => Object.fromEntries(l.cellules.map((v, i) => [String(i), v]));
  const dateOu = (t: string): string => lireDate(t, profil.formatDate, profil.optionsDate);

  for (const l of triees) {
    try {
      const montant = montantSigne(parNom(l), profil.signe, profil.format);
      const dateOperation = dateOu(cellule(l, c.date));
      const vd = cellule(l, c.dateValeur);
      const ref = cellule(l, c.reference);
      const devise = cellule(l, c.devise);
      const ligne: LigneLue = {
        rang: l.rang, dateOperation, montant, devise: devise === '' ? profil.deviseParDefaut : devise,
        libelleBrut: c.libelle.map((i) => cellule(l, i)).filter((t) => t !== '').join(' '), etatTechnique: 'completee',
      };
      if (vd !== '') ligne.dateValeur = dateOu(vd);
      if (ref !== '') ligne.reference = ref;
      lues.push({ l: ligne, solde: c.soldeCourant === undefined ? undefined : lireSoldes(l.cellules[c.soldeCourant], profil.format) });
    } catch (e) {
      if (!(e instanceof ErreurDate || e instanceof ErreurMontant)) throw e;
      rejets.push({ rang: l.rang, motif: e.code });
      lues.push({ l: undefined as never, solde: undefined });
    }
  }
  const retenues = lues.filter((x) => x.l !== undefined);
  const releve: ReleveImporte = {
    devise: profil.deviseParDefaut, lignes: retenues.map((x) => x.l), rejets, signaux, chainage: 'ABSENT',
    compteurs: { lues: lignes.length, importees: lignes.length - rejets.length, rejetees: rejets.length },
  };
  if (retenues.length > 0) {
    releve.periodeDebut = retenues.map((x) => x.l.dateOperation).reduce((a, b) => (a < b ? a : b));
    releve.periodeFin = retenues.map((x) => x.l.dateOperation).reduce((a, b) => (a > b ? a : b));
  }
  if (c.soldeCourant !== undefined) {
    let precedent: Centimes | undefined;
    let trou = false;
    for (const { l, solde } of lues) {
      if (l === undefined || solde === undefined) { trou = true; precedent = undefined; continue; }
      if (precedent !== undefined && precedent + l.montant !== solde) signaux.push({ code: 'chainage_incoherent', rang: l.rang });
      precedent = solde;
    }
    releve.chainage = signaux.length > 0 ? 'INCOHERENT' : trou || lues.length === 0 ? 'IMPOSSIBLE' : 'OK';
    const premiere = lues[0];
    const derniere = lues[lues.length - 1];
    if (premiere?.l !== undefined && premiere.solde !== undefined) releve.soldeOuverture = (premiere.solde - premiere.l.montant) as Centimes;
    if (derniere?.solde !== undefined) releve.soldeCloture = derniere.solde;
  }
  if (total) {
    try {
      const lu = montantSigne(Object.fromEntries(total.cellules.map((v, i) => [String(i), v])), profil.signe, profil.format);
      const somme = retenues.reduce((s, x) => s + x.l.montant, 0);
      releve.total = lu === somme ? { etat: 'egal' } : { etat: 'different', ecart: (lu - somme) as Centimes };
    } catch (e) {
      if (!(e instanceof ErreurMontant)) throw e;
      releve.total = { etat: 'illisible' };
    }
  }
  return releve;
}
