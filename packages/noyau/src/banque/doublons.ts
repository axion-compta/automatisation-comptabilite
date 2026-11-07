import { createHash } from 'node:crypto';

export class ErreurDoublons extends Error {
  constructor(readonly code: 'montant_invalide' | 'separateur_interdit') {
    super(code);
    this.name = 'ErreurDoublons';
  }
}

export interface EntreeEmpreinte {
  compteId: string;
  dateOperation: string;
  montant: number;
  devise: string;
  libelleNormalise: string;
}

const SEP = '\u001f';

export function empreinteLigne(e: EntreeEmpreinte): string {
  if (!Number.isSafeInteger(e.montant)) throw new ErreurDoublons('montant_invalide');
  const champs = [e.compteId, e.dateOperation, String(e.montant), e.devise, e.libelleNormalise];
  if (champs.some((c) => c.includes(SEP))) throw new ErreurDoublons('separateur_interdit');
  return createHash('sha256').update(champs.join(SEP)).digest('hex');
}

export function numeroterOccurrences<T extends EntreeEmpreinte & { rang: number }>(
  lignes: readonly T[],
): (T & { empreinte: string; occurrence: number })[] {
  const vues = new Map<string, number>();
  return [...lignes]
    .sort((a, b) => a.rang - b.rang)
    .map((l) => {
      const empreinte = empreinteLigne(l);
      const occurrence = (vues.get(empreinte) ?? 0) + 1;
      vues.set(empreinte, occurrence);
      return { ...l, empreinte, occurrence };
    });
}

export function lignesNouvelles<T extends { empreinte: string; occurrence: number; rang?: number }>(
  existantes: readonly { empreinte: string; occurrence: number }[],
  lues: readonly T[],
): T[] {
  const connues = new Set(existantes.map((x) => `${x.empreinte}${SEP}${x.occurrence}`));
  return [...lues]
    .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0))
    .filter((l) => !connues.has(`${l.empreinte}${SEP}${l.occurrence}`));
}

export function fichierDejaImporte(
  empreinteFichier: string,
  connus: readonly { empreinte: string; recuLe: string }[],
): { deja: true; recuLe: string } | { deja: false } {
  const trouve = connus.find((c) => c.empreinte === empreinteFichier);
  return trouve ? { deja: true, recuLe: trouve.recuLe } : { deja: false };
}
