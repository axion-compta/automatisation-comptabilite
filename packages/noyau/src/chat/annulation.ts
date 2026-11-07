// Annulation du chat : fonctions pures, horloge en argument (ISO). Annuler = rendre l'« avant » gardé.
import { ErreurChat } from './types.js';

export type ModeAnnulation = 'toast' | 'historique' | 'contre_passation';
export type EntreeMode = {
  readonly appliqueLe: string;
  readonly maintenant: string;
  readonly objetValideOuEnvoye: boolean;
  readonly toastMs: number;
  readonly historiqueMs: number;
};

const invalide = () => new ErreurChat('parametre_invalide');
const duree = (n: number): number => {
  if (!Number.isInteger(n) || n < 0) throw invalide();
  return n;
};
const instant = (iso: string): number => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw invalide();
  return t;
};

export function modeAnnulation(e: EntreeMode): ModeAnnulation {
  const toast = duree(e.toastMs);
  const historique = duree(e.historiqueMs);
  if (toast > historique) throw invalide();
  const ecoule = instant(e.maintenant) - instant(e.appliqueLe);
  if (ecoule < 0) throw invalide();
  if (e.objetValideOuEnvoye) return 'contre_passation';
  if (ecoule < toast) return 'toast';
  return ecoule < historique ? 'historique' : 'contre_passation';
}

function ecrire(v: unknown, vus: readonly object[]): string {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw invalide();
    return JSON.stringify(v);
  }
  if (typeof v !== 'object' || vus.includes(v)) throw invalide();
  const pile = [...vus, v];
  if (Array.isArray(v)) return `[${v.map((x) => ecrire(x, pile)).join(',')}]`;
  const proto = Object.getPrototypeOf(v) as unknown;
  if (proto !== Object.prototype && proto !== null) throw invalide();
  const cles = Object.keys(v).sort();
  return `{${cles.map((k) => `${JSON.stringify(k)}:${ecrire((v as Record<string, unknown>)[k], pile)}`).join(',')}}`;
}

export function empreinteCanonique(valeur: unknown): string {
  return ecrire(valeur, []);
}

export function annuler(etatActuel: unknown, apres: unknown, avant: unknown): unknown {
  if (empreinteCanonique(etatActuel) !== empreinteCanonique(apres)) throw new ErreurChat('annulation_expiree');
  return JSON.parse(empreinteCanonique(avant)) as unknown;
}
