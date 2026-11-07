// Paliers sans prix et demande de palier supérieur avec accord journalisé.
import { ErreurAbonnement, verifierHorodatage, type EvenementJournal } from './types.js';

export type Palier = {
  code: string; nomAffiche: string; piecesParMois: number; societesMax: number; fonctions: readonly string[];
};

const CLES = ['code', 'nomAffiche', 'piecesParMois', 'societesMax', 'fonctions'];
const MOTS_INTERDITS = new Set(['essentiel', 'pro', 'etendu']);

const texteNonVide = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const entierPositif = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 1;

function motInterdit(texte: string): boolean {
  const mots = texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/);
  return mots.some((m) => MOTS_INTERDITS.has(m));
}

function validerUn(brut: unknown): Palier {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) throw new ErreurAbonnement('palier_invalide');
  const o = brut as Record<string, unknown>;
  if (Object.keys(o).some((k) => !CLES.includes(k))) throw new ErreurAbonnement('champ_inconnu');
  const { code, nomAffiche, piecesParMois, societesMax, fonctions } = o;
  if (
    !texteNonVide(code) || !texteNonVide(nomAffiche) || !entierPositif(piecesParMois) || !entierPositif(societesMax) ||
    !Array.isArray(fonctions) || !fonctions.every(texteNonVide)
  ) {
    throw new ErreurAbonnement('palier_invalide');
  }
  if (motInterdit(code) || motInterdit(nomAffiche)) throw new ErreurAbonnement('nom_de_palier_interdit');
  return { code, nomAffiche, piecesParMois, societesMax, fonctions: [...(fonctions as string[])] };
}

export function validerPaliers(liste: readonly unknown[]): Palier[] {
  if (!Array.isArray(liste) || liste.length === 0) throw new ErreurAbonnement('palier_invalide');
  const paliers = liste.map(validerUn);
  if (new Set(paliers.map((p) => p.code)).size !== paliers.length) throw new ErreurAbonnement('palier_invalide');
  return paliers;
}

export function palierSuperieur(paliers: readonly Palier[], codeActuel: string): Palier | null {
  const actuel = paliers.find((p) => p.code === codeActuel);
  if (actuel === undefined) throw new ErreurAbonnement('palier_inconnu');
  const plus = paliers.filter((p) => p.piecesParMois > actuel.piecesParMois);
  return plus.reduce<Palier | null>((m, p) => (m === null || p.piecesParMois < m.piecesParMois ? p : m), null);
}

export type EntreeDemande = {
  accord: boolean; codeActuel: string; codeDemande: string; paliers: readonly Palier[]; auteur: string;
  horodatage: string;
};
export type Demande = { codeActuel: string; codeDemande: string; auteur: string; horodatage: string };

export function demanderPalier(e: EntreeDemande): { demande: Demande; evenement: EvenementJournal; palierEnVigueur: string } {
  if (e.accord !== true) throw new ErreurAbonnement('accord_manquant');
  if (!texteNonVide(e.auteur)) throw new ErreurAbonnement('auteur_manquant');
  verifierHorodatage(e.horodatage);
  const paliers = validerPaliers(e.paliers);
  const actuel = paliers.find((p) => p.code === e.codeActuel);
  const demande = paliers.find((p) => p.code === e.codeDemande);
  if (actuel === undefined || demande === undefined) throw new ErreurAbonnement('palier_inconnu');
  if (actuel.code === demande.code) throw new ErreurAbonnement('palier_identique');
  if (demande.piecesParMois <= actuel.piecesParMois) throw new ErreurAbonnement('palier_non_superieur');
  const { codeActuel, codeDemande, auteur, horodatage } = e;
  return {
    demande: { codeActuel, codeDemande, auteur, horodatage },
    evenement: { type: 'abonnement.palier_demande', horodatage, donnees: { codeActuel, codeDemande, auteur } },
    palierEnVigueur: codeActuel,
  };
}
