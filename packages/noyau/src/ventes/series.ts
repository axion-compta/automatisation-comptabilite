// Contrôle de la suite des numéros de factures de vente, par série. Aucune attribution de numéro.
import type { Centimes } from '../argent/index.js';
import { ErreurVente, comparerDates } from './types.js';

export interface PieceSerie {
  id: string;
  numero: string;
  dateFacture: string;
  ttc: Centimes;
}
export interface AnalyseSerie {
  serie: string;
  dernierOrdreVu: number | null;
  trous: number[];
  tropDeTrous: boolean;
  doublons: { ordre: number; ids: string[] }[];
  datesQuiReculent: { avant: string; apres: string }[];
  illisibles: string[];
}

const FIN_CHIFFRES = /^([\s\S]*?)(\d+)$/;
const cmp = <T extends string | number>(a: T, b: T): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);

export function decouperNumero(numero: string): { serie: string; ordre: number | null; largeur: number } {
  const texte = numero.trim();
  const m = FIN_CHIFFRES.exec(texte);
  if (m === null) return { serie: texte, ordre: null, largeur: 0 };
  const chiffres = m[2] as string;
  const ordre = Number(chiffres);
  return { serie: m[1] as string, ordre: Number.isSafeInteger(ordre) ? ordre : null, largeur: chiffres.length };
}

interface Lue extends PieceSerie {
  ordre: number;
}

function analyserUne(serie: string, pieces: readonly (PieceSerie & { ordre: number | null })[], maxTrous: number): AnalyseSerie {
  const lues = pieces.filter((x): x is Lue => x.ordre !== null).sort((a, b) => cmp(a.ordre, b.ordre) || cmp(a.id, b.id));
  const illisibles = pieces.filter((x) => x.ordre === null).map((x) => x.id).sort(cmp);
  const ordres = [...new Set(lues.map((x) => x.ordre))];
  const trous: number[] = [];
  let tropDeTrous = false;
  for (let i = 1; i < ordres.length; i++) {
    const a = ordres[i - 1] as number;
    const manque = (ordres[i] as number) - a - 1;
    const place = maxTrous - trous.length;
    for (let k = 1; k <= Math.min(manque, place); k++) trous.push(a + k);
    if (manque > place) tropDeTrous = true;
  }
  const doublons = ordres.flatMap((ordre) => {
    const memes = lues.filter((x) => x.ordre === ordre);
    return memes.some((x) => x.ttc !== (memes[0] as Lue).ttc) ? [{ ordre, ids: memes.map((x) => x.id) }] : [];
  });
  const datesQuiReculent: { avant: string; apres: string }[] = [];
  let prec: Lue | undefined;
  for (const cur of lues) {
    if (prec !== undefined && cur.ordre === prec.ordre) continue;
    if (prec !== undefined && comparerDates(cur.dateFacture, prec.dateFacture) < 0) datesQuiReculent.push({ avant: prec.id, apres: cur.id });
    prec = cur;
  }
  return { serie, dernierOrdreVu: ordres.length === 0 ? null : (ordres[ordres.length - 1] as number), trous, tropDeTrous, doublons, datesQuiReculent, illisibles };
}

export function analyserSeries(pieces: readonly PieceSerie[], options: { maxTrous: number }): AnalyseSerie[] {
  const { maxTrous } = options;
  if (!Number.isInteger(maxTrous) || maxTrous < 1) throw new ErreurVente('entree_invalide', 'maxTrous doit être un entier au moins égal à 1.');
  const groupes = new Map<string, (PieceSerie & { ordre: number | null })[]>();
  for (const piece of pieces) {
    if (!Number.isSafeInteger(piece.ttc)) throw new ErreurVente('entree_invalide', 'Montant TTC invalide.');
    const { serie, ordre } = decouperNumero(piece.numero);
    groupes.set(serie, [...(groupes.get(serie) ?? []), { ...piece, ordre }]);
  }
  return [...groupes.keys()].sort(cmp).map((serie) => analyserUne(serie, groupes.get(serie) as never, maxTrous));
}
