// Confiance interne par champ, calculée par le code (jamais reprise du modèle). Valeurs du réglage : arguments.
import { ErreurPiece, estChampCritique, type Accord, type MotConfiance, type SourceChamp } from '../types.js';

const ECHELLE_MAX = 100;

export interface BaremeConfiance { xml: number; accordTextePdf: number; accordOcr: number; aSeul: number; visionSeule: number; echec: number; }
export interface SeuilsConfiance { sur: number; douteux: number; }
export interface EntreeConfiance { source: SourceChamp; accord: Accord; citationRetrouvee: boolean; controlesPasses: boolean; }
export interface ChampMot { nom: string; mot: MotConfiance; }

const entierDeEchelle = (v: number): boolean => Number.isInteger(v) && v >= 0 && v <= ECHELLE_MAX;
const refuser = (): never => { throw new ErreurPiece('reglage_invalide', 'Réglage de confiance invalide.'); };

function verifierBareme(bareme: BaremeConfiance): void {
  if (!Object.values(bareme).every(entierDeEchelle)) refuser();
}

function verifierSeuils(seuils: SeuilsConfiance): void {
  if (!entierDeEchelle(seuils.sur) || !entierDeEchelle(seuils.douteux) || seuils.douteux >= seuils.sur) refuser();
}

/** Situation de lecture d'un champ, parmi les 6 clés du barème. */
export function situation(e: EntreeConfiance): keyof BaremeConfiance {
  if (e.accord === 'desaccord' || (e.accord !== 'seul_b' && !e.citationRetrouvee) || !e.controlesPasses) return 'echec';
  if (e.source === 'xml') return 'xml';
  // Accord d'une source vision : la fiche ne distingue pas ce cas, il suit la note de l'accord texte (hors OCR).
  if (e.accord === 'accord') return e.source === 'ocr' ? 'accordOcr' : 'accordTextePdf';
  return e.source === 'vision' ? 'visionSeule' : 'aSeul';
}

export function confianceInterne(entree: EntreeConfiance, bareme: BaremeConfiance): number {
  verifierBareme(bareme);
  return bareme[situation(entree)];
}

export function motDeConfiance(valeur: number, seuils: SeuilsConfiance): MotConfiance {
  verifierSeuils(seuils);
  if (!entierDeEchelle(valeur)) return 'douteux';
  if (valeur >= seuils.sur) return 'sur';
  return valeur >= seuils.douteux ? 'a_verifier' : 'douteux';
}

const RANG: Readonly<Record<MotConfiance, number>> = { douteux: 0, a_verifier: 1, sur: 2 };

const critiques = (champs: readonly ChampMot[]): ChampMot[] => champs.filter((c) => estChampCritique(c.nom));

/** Mot du champ critique le plus faible ; aucun champ critique : douteux. */
export function confiancePiece(champs: readonly ChampMot[]): MotConfiance {
  const c = critiques(champs);
  if (c.length === 0) return 'douteux';
  return c.reduce<MotConfiance>((pire, x) => (RANG[x.mot] < RANG[pire] ? x.mot : pire), 'sur');
}

/** Vrai seulement si au moins un champ critique est présent et que tous sont sûrs. */
export function classementAutomatiquePermis(champs: readonly ChampMot[]): boolean {
  const c = critiques(champs);
  return c.length > 0 && c.every((x) => x.mot === 'sur');
}
