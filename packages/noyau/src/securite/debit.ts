import { ErreurSecurite } from './types.js';

export type EtatDebit = Readonly<Record<string, readonly number[]>>;
export type DemandeDebit = { cle: string; limite: number; fenetreMs: number };
export type ResultatDebit =
  | { accepte: true; etat: EtatDebit }
  | { accepte: false; reessayerApresMs: number; etat: EtatDebit };

const entierPositifOuNul = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function valider(demandes: readonly DemandeDebit[], maintenantMs: number): void {
  if (!entierPositifOuNul(maintenantMs)) throw new ErreurSecurite('argument_invalide', 'maintenantMs');
  for (const d of demandes) {
    if (typeof d.cle !== 'string' || d.cle === '') throw new ErreurSecurite('argument_invalide', 'cle');
    if (!entierPositifOuNul(d.limite)) throw new ErreurSecurite('argument_invalide', 'limite');
    if (!entierPositifOuNul(d.fenetreMs) || d.fenetreMs === 0) throw new ErreurSecurite('argument_invalide', 'fenetreMs');
  }
}

export function verifierDebits(
  etat: EtatDebit,
  demandes: readonly DemandeDebit[],
  maintenantMs: number,
): ResultatDebit {
  valider(demandes, maintenantMs);
  if (demandes.length === 0) return { accepte: true, etat };
  const suivant = new Map<string, number[]>();
  let attente = 0;
  let refus = false;
  for (const { cle, limite, fenetreMs } of demandes) {
    const anciens = etat[cle] ?? [];
    const dernier = anciens.length === 0 ? 0 : anciens[anciens.length - 1]!;
    const instant = Math.max(maintenantMs, dernier);
    const vivants = anciens.filter((t) => instant - t < fenetreMs);
    if (vivants.length >= limite) {
      refus = true;
      const sortant = vivants[vivants.length - limite];
      const reste = sortant === undefined ? fenetreMs : sortant + fenetreMs - instant;
      attente = Math.max(attente, reste);
    } else {
      suivant.set(cle, [...vivants, instant]);
    }
  }
  if (refus) return { accepte: false, reessayerApresMs: attente, etat };
  return { accepte: true, etat: { ...etat, ...Object.fromEntries(suivant) } };
}
