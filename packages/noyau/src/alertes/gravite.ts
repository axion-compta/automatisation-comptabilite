// Gravité des alertes (AL-R3, AL-R5) : escalade par le catalogue seulement, codes sans texte.
// Seuils et nombre de cartes passés en arguments : rien de légal écrit ici.
import { comparerDates, joursEntre } from '../interface/dates.js';
import { ETATS_ALERTE_ACTIFS, graviteMax, rangGravite, type GraviteAlerte } from '../interface/types.js';
import type { Alerte } from './moteur.js';

export type Escalade =
  | { type: 'avant_echeance'; jours: number; vers: GraviteAlerte }[]
  | { type: 'age'; jours: number; vers: GraviteAlerte }[];

export type NatureRegle = 'echeance_legale' | 'argent' | 'blocage' | 'autre';

export class ErreurGravite extends Error {
  override name = 'ErreurGravite';
  readonly code = 'escalade_invalide';
  constructor() {
    super('escalade_invalide');
  }
}

const entierPositif = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

export function graviteCourante(
  base: GraviteAlerte,
  escalade: Escalade,
  ctx: { jour: string; echeanceLe?: string; ouverteLe: string },
  nature: NatureRegle,
): GraviteAlerte {
  const paliers: readonly { type: string; jours: number; vers: GraviteAlerte }[] = escalade;
  if (paliers.some((p) => !entierPositif(p.jours))) throw new ErreurGravite();
  const echeance = ctx.echeanceLe;
  const depassee = echeance !== undefined && comparerDates(echeance, ctx.jour) < 0;
  let g = base;
  for (const p of paliers) {
    let atteint = false;
    if (p.type === 'age') atteint = joursEntre(ctx.ouverteLe, ctx.jour) >= p.jours;
    else if (echeance !== undefined) atteint = depassee || joursEntre(ctx.jour, echeance) <= p.jours;
    if (atteint) g = graviteMax(g, p.vers);
  }
  if (depassee) for (const p of paliers) if (p.type === 'avant_echeance') g = graviteMax(g, p.vers);
  return nature === 'autre' && g === 'urgent' ? 'a_faire' : g;
}

const estActive = (a: Alerte): boolean => ETATS_ALERTE_ACTIFS.includes(a.etat);
const estUrgente = (a: Alerte): boolean => a.gravite === 'urgent' || a.gravite === 'bloquant';

export function alertesDuJour(alertes: readonly Alerte[], n: number): { cartes: Alerte[]; urgentesTotal: number } {
  if (!entierPositif(n)) throw new ErreurGravite();
  const urgentes = alertes.filter((a) => estActive(a) && estUrgente(a));
  const tri = [...urgentes].sort((x, y) => {
    const g = rangGravite(y.gravite) - rangGravite(x.gravite);
    if (g !== 0) return g;
    if (x.echeanceLe !== y.echeanceLe) {
      if (x.echeanceLe === undefined) return 1;
      if (y.echeanceLe === undefined) return -1;
      return comparerDates(x.echeanceLe, y.echeanceLe);
    }
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  return { cartes: tri.slice(0, n), urgentesTotal: urgentes.length };
}

export function compteursParEntree(
  alertes: readonly Alerte[],
  entreeDe: (regle: string) => string,
): Record<string, { ouvertes: number; urgentes: number; pointExclamation: boolean }> {
  const r: Record<string, { ouvertes: number; urgentes: number; pointExclamation: boolean }> = {};
  for (const a of alertes) {
    if (!estActive(a)) continue;
    const e = entreeDe(a.regle);
    const c = (r[e] ??= { ouvertes: 0, urgentes: 0, pointExclamation: false });
    c.ouvertes += 1;
    if (estUrgente(a)) {
      c.urgentes += 1;
      c.pointExclamation = true;
    }
  }
  return r;
}
