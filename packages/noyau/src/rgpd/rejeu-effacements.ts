import { ErreurRgpd, type EvenementPersonne } from './types.js';

export type Effacement = { objet: string; faitLe: string; decisionId: string };

const FORME = /^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2}:[0-9]{2})Z$/;

function verifierHorodatage(h: string): void {
  const m = typeof h === 'string' ? FORME.exec(h) : null;
  const ms = m === null ? NaN : Date.parse(h);
  const ok = m !== null && Number.isFinite(ms) && new Date(ms).toISOString() === `${m[1]}T${m[2]}.000Z`;
  if (!ok) throw new ErreurRgpd('horodatage_invalide');
}

const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// Un effacement fait à la même seconde que le dump est rejoué aussi : on ne sait pas s'il est dans la photo.
export function aRejouer(effacements: readonly Effacement[], dumpPrisLe: string): Effacement[] {
  verifierHorodatage(dumpPrisLe);
  const ids = new Set<string>();
  for (const x of effacements) {
    verifierHorodatage(x.faitLe);
    if (typeof x.decisionId !== 'string' || x.decisionId === '' || typeof x.objet !== 'string' || x.objet === '') {
      throw new ErreurRgpd('objet_inconnu');
    }
    if (ids.has(x.decisionId)) throw new ErreurRgpd('doublon');
    ids.add(x.decisionId);
  }
  const tries = effacements
    .filter((x) => x.faitLe >= dumpPrisLe)
    .sort((a, b) => comparer(a.faitLe, b.faitLe) || comparer(a.decisionId, b.decisionId));
  const vus = new Set<string>();
  return tries.filter((x) => !vus.has(x.objet) && vus.add(x.objet));
}

export function remiseEnServicePermise(
  attendus: readonly string[], rejoues: readonly string[], visibles: readonly string[],
): { permise: boolean; manquants: string[]; encoreVisibles: string[] } {
  const faits = new Set(rejoues);
  const attendusSet = new Set(attendus);
  const manquants = attendus.filter((o) => !faits.has(o));
  const encoreVisibles = visibles.filter((o) => attendusSet.has(o));
  return { permise: manquants.length === 0 && encoreVisibles.length === 0, manquants, encoreVisibles };
}

export function evenementRejeu(nombre: number, le: string): EvenementPersonne {
  if (!Number.isSafeInteger(nombre) || nombre < 0) throw new ErreurRgpd('entier_invalide');
  verifierHorodatage(le);
  return { type: 'personne.effacements_rejoues', horodatage: le, demandeId: null, donnees: { nombre } };
}
