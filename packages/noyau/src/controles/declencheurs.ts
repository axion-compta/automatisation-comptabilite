// Choix des objets et des règles par déclencheur. Aucun texte affiché : seulement des codes.
import type { Declencheur, RegleControle } from './moteur.js';

export interface ObjetRef { type: string; id: string; date?: string /* AAAA-MM-JJ */ }

export interface Contexte {
  declencheur: Declencheur;
  objetArrive?: ObjetRef;
  objetsTouches?: readonly ObjetRef[];
  tousLesObjets: readonly ObjetRef[];
  periode?: { debut: string; fin: string };
}

export type CodeErreurDeclencheur = 'objet_arrive_absent' | 'periode_absente' | 'periode_invalide' | 'date_invalide' | 'horodatage_invalide' | 'duree_invalide';

export class ErreurDeclencheur extends Error {
  override name = 'ErreurDeclencheur';
  readonly code: CodeErreurDeclencheur;
  constructor(code: CodeErreurDeclencheur) {
    super(code);
    this.code = code;
  }
}

const FORMAT_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const FORMAT_HORODATAGE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$/;
const MS_PAR_MINUTE = 60 * 1000;

/** Vrai si l'instant existe et retombe sur le même jour (refuse un 30 février). */
function memeJour(ms: number, texte: string): boolean {
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === texte.slice(0, 10);
}

function dateValide(d: string): boolean {
  return FORMAT_DATE.test(d) && memeJour(Date.parse(d + 'T00:00:00Z'), d);
}

function triee(objets: readonly ObjetRef[]): ObjetRef[] {
  const uniques = new Map<string, ObjetRef>();
  for (const o of objets) {
    const cle = JSON.stringify([o.type, o.id]);
    if (!uniques.has(cle)) uniques.set(cle, o);
  }
  const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return [...uniques.values()].sort((a, b) => compare(a.type, b.type) || compare(a.id, b.id));
}

function dansPeriode(objets: readonly ObjetRef[], periode: Contexte['periode']): ObjetRef[] {
  if (periode === undefined) throw new ErreurDeclencheur('periode_absente');
  if (!dateValide(periode.debut) || !dateValide(periode.fin) || periode.debut > periode.fin) throw new ErreurDeclencheur('periode_invalide');
  const { debut, fin } = periode;
  return objets.filter((o) => {
    if (o.date === undefined) return false;
    if (!dateValide(o.date)) throw new ErreurDeclencheur('date_invalide');
    return o.date >= debut && o.date <= fin;
  });
}

/** Objets à contrôler : liste sans doublon, triée par type puis id. */
export function objetsAControler(ctx: Contexte): ObjetRef[] {
  switch (ctx.declencheur) {
    case 'arrivee':
      if (ctx.objetArrive === undefined) throw new ErreurDeclencheur('objet_arrive_absent');
      return triee([ctx.objetArrive]);
    case 'continu':
      return triee(ctx.objetsTouches ?? []);
    case 'a_la_demande':
    case 'avant_tva':
      return triee(dansPeriode(ctx.tousLesObjets, ctx.periode));
    case 'nocturne':
    case 'avant_export':
    case 'avant_cloture':
      return triee(ctx.tousLesObjets);
  }
}

/** Avant TVA : règles actives qui bloquent la TVA ; sinon même filtre que le moteur. */
export function reglesAJouer<T>(regles: readonly RegleControle<T>[], declencheur: Declencheur): RegleControle<T>[] {
  return regles.filter((r) => {
    if (!r.actif) return false;
    if (declencheur === 'avant_tva') return r.bloque.includes('tva');
    return declencheur === 'avant_export' || r.declencheurs.includes(declencheur);
  });
}

/** Aucun résultat déjà calculé n'est réutilisé avant export ni avant clôture. */
export function peutReutiliser(declencheur: Declencheur): boolean {
  return declencheur !== 'avant_export' && declencheur !== 'avant_cloture';
}

function horodatageMs(h: string): number {
  const ms = FORMAT_HORODATAGE.test(h) ? Date.parse(h) : Number.NaN;
  if (!memeJour(ms, h)) throw new ErreurDeclencheur('horodatage_invalide');
  return ms;
}

/** Vrai si le passage nocturne a duré plus que la durée maximale (en argument). */
export function nocturneEnRetard(debut: string, fin: string | undefined, dureeMaxMinutes: number, maintenant: string): boolean {
  if (!Number.isSafeInteger(dureeMaxMinutes) || dureeMaxMinutes < 0) throw new ErreurDeclencheur('duree_invalide');
  const d = horodatageMs(debut);
  const f = horodatageMs(fin ?? maintenant);
  if (f < d) throw new ErreurDeclencheur('horodatage_invalide');
  return f - d > dureeMaxMinutes * MS_PAR_MINUTE;
}
