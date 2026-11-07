// État de la veille : balayage trop ancien, fiche en retard, mode dégradé (V3-DEC-003).
// Seuils = ARGUMENTS, aucun texte affiché (codes seuls). Dates AAAA-MM-JJ comparées comme chaînes ; calcul via le Calendrier injecté.
// Limite : le 29 février est accepté toute année.
export interface Calendrier {
  ajouterJours(date: string, n: number): string;
}
export interface PeriodeRapprochee {
  debutMoisJour: string;
  finMoisJour: string;
}
export type EtatVeille = 'ok' | 'alerte';
export type CodeErreurEtatVeille = 'nombre_invalide' | 'ordre_inverse' | 'date_invalide' | 'periode_invalide';
export class ErreurEtatVeille extends Error {
  readonly code: CodeErreurEtatVeille;
  constructor(code: CodeErreurEtatVeille) {
    super(code);
    this.name = 'ErreurEtatVeille';
    this.code = code;
  }
}
const LONGUEURS_MOIS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MOIS_JOUR = /^(\d{2})-(\d{2})$/;
const DATE = /^\d{4}-(\d{2})-(\d{2})$/;
function moisJourValide(r: RegExpExecArray): boolean {
  const longueur = LONGUEURS_MOIS[Number(r[1]) - 1];
  return longueur !== undefined && Number(r[2]) >= 1 && Number(r[2]) <= longueur;
}
function verifierDate(date: unknown): string {
  const r = typeof date === 'string' ? DATE.exec(date) : null;
  if (!r || !moisJourValide(r)) throw new ErreurEtatVeille('date_invalide');
  return date as string;
}
function verifierMoisJour(v: unknown): string {
  const r = typeof v === 'string' ? MOIS_JOUR.exec(v) : null;
  if (!r || !moisJourValide(r)) throw new ErreurEtatVeille('periode_invalide');
  return v as string;
}
function verifierNombre(n: unknown): number {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) throw new ErreurEtatVeille('nombre_invalide');
  return n;
}
/** Vrai si le mois-jour de `date` est dans la période (bornes comprises) ; une période qui passe le 31 décembre est gérée. */
export function enPeriodeRapprochee(date: string, periode: PeriodeRapprochee): boolean {
  const d = verifierDate(date);
  const debut = verifierMoisJour(periode?.debutMoisJour);
  const fin = verifierMoisJour(periode?.finMoisJour);
  const mj = d.slice(5);
  return debut <= fin ? mj >= debut && mj <= fin : mj >= debut || mj <= fin;
}
/** Alerte si le dernier balayage est plus ancien que la limite (égalité exacte = ok) ; aucun balayage = alerte. */
export function etatVeille(
  p: {
    dernierBalayage: string | null;
    maintenant: string;
    maxJoursNormal: number;
    maxJoursRapproche: number;
    periode: PeriodeRapprochee;
  },
  cal: Calendrier,
): EtatVeille {
  const normal = verifierNombre(p.maxJoursNormal);
  const rapproche = verifierNombre(p.maxJoursRapproche);
  const maintenant = verifierDate(p.maintenant);
  const rapprochee = enPeriodeRapprochee(maintenant, p.periode);
  if (p.dernierBalayage === null) return 'alerte';
  const dernier = verifierDate(p.dernierBalayage);
  if (maintenant < dernier) throw new ErreurEtatVeille('ordre_inverse');
  return cal.ajouterJours(dernier, rapprochee ? rapproche : normal) < maintenant ? 'alerte' : 'ok';
}
/** Vrai si la fiche n'a pas été créée dans le délai (ou, sans fiche, si le délai est déjà dépassé). */
export function ficheEnRetard(
  p: { detecteeLe: string; ficheCreeeLe: string | null; maintenant: string; maxJours: number },
  cal: Calendrier,
): boolean {
  const max = verifierNombre(p.maxJours);
  const detectee = verifierDate(p.detecteeLe);
  const creee = p.ficheCreeeLe === null ? null : verifierDate(p.ficheCreeeLe);
  const maintenant = verifierDate(p.maintenant);
  if (maintenant < detectee || (creee !== null && (creee < detectee || creee > maintenant))) {
    throw new ErreurEtatVeille('ordre_inverse');
  }
  return cal.ajouterJours(detectee, max) < (creee ?? maintenant);
}
/** Veille en alerte ou paramètre périmé : aucun dépôt automatisé, bandeau posé. */
export function modeDegrade(p: { etat: EtatVeille; parametresPerimes: number }): {
  depotAutomatiqueAutorise: boolean;
  bandeau: 'regles_possiblement_perimees' | null;
} {
  const perimes = verifierNombre(p.parametresPerimes);
  const autorise = p.etat === 'ok' && perimes === 0;
  return { depotAutomatiqueAutorise: autorise, bandeau: autorise ? null : 'regles_possiblement_perimees' };
}
