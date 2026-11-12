// Banc de pièces fictives : erreur semée dans le texte imprimé, le lecteur A (simulé) cite ce texte et a lu la valeur juste.
import { centimes } from '../../../argent/index.js';
import type { ChampLu } from '../../types.js';

export const TYPES_ERREUR = ['ttc', 'tva', 'date', 'numero', 'siren'] as const;
export type TypeErreur = (typeof TYPES_ERREUR)[number];
export const TAUX_PDB = 2000;

export interface PieceErreur {
  id: string;
  /** Type d'erreur semée ; absent pour une pièce saine. */
  erreur?: TypeErreur;
  /** Nom du champ où l'erreur doit être signalée. */
  champ?: string;
  texte: string;
  champsA: ChampLu[];
}

const eur = (c: number): string => `${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}`;
const deux = (n: number): string => String(n).padStart(2, '0');

function sirenValide(base8: number): string {
  const b = String(base8).padStart(8, '0');
  for (let c = 0; c < 10; c++) {
    const s = b + String(c);
    const somme = [...s].reduce((t, ch, i) => { const d = Number(ch) * (i % 2 === 1 ? 2 : 1); return t + (d > 9 ? d - 9 : d); }, 0);
    if (somme % 10 === 0) return s;
  }
  throw new Error('impossible');
}
const sirenInvalide = (s: string): string => s.slice(0, 8) + String((Number(s[8]) + 1) % 10);

function champA(nom: string, valeur: string, citation: string, c?: number): ChampLu {
  const champ: ChampLu = { nom, valeur, source: 'texte_pdf', lecteur: 'A', citation };
  if (c !== undefined) champ.valeurCentimes = centimes(c);
  return champ;
}

export function fabriquerPiece(i: number, erreur?: TypeErreur): PieceErreur {
  const jour = 1 + (i % 27);
  const mois = 1 + (i % 12);
  const ht = 10000 + i * 137;
  const tva = Math.round(ht * 0.2);
  const ttc = ht + tva;
  const numero = `F-2026-${String(1000 + i)}`;
  const siren = sirenValide(100000 + i * 7919);
  const dateTexte = `${deux(jour)}/${deux(mois)}/2026`;
  const lu = { ttc, tva, date: dateTexte, numero, siren };
  // Erreur semée : la valeur imprimée diffère de ce que A a lu.
  const imprime = { ...lu };
  if (erreur === 'ttc') imprime.ttc = ttc + 100;
  if (erreur === 'tva') imprime.tva = tva + 100;
  if (erreur === 'date') imprime.date = `${deux(jour)}/${deux(mois === 12 ? 11 : mois + 1)}/2026`;
  if (erreur === 'numero') imprime.numero = `F-2026-${String(2000 + i)}`;
  if (erreur === 'siren') imprime.siren = sirenInvalide(siren);
  const texte = [
    `Facture N° ${imprime.numero}`,
    `Date de facture : ${imprime.date}`,
    `Société Exemple SIREN ${imprime.siren}`,
    `Base HT à 20,00 % : ${eur(ht)}`,
    `TVA à 20,00 % : ${eur(imprime.tva)}`,
    `Total TTC : ${eur(imprime.ttc)}`,
  ].join('\n');
  const [y, m, d] = ['2026', deux(mois), deux(jour)];
  const champsA = [
    champA('numero', numero, imprime.numero),
    champA('date_piece', `${y}-${m}-${d}`, imprime.date),
    champA('fournisseur_siren', siren, imprime.siren),
    champA(`ht@${TAUX_PDB}`, eur(ht), eur(ht), ht),
    champA(`tva@${TAUX_PDB}`, eur(tva), eur(imprime.tva), tva),
    champA('ttc', eur(ttc), eur(imprime.ttc), ttc),
  ];
  const noms = { ttc: 'ttc', tva: `tva@${TAUX_PDB}`, date: 'date_piece', numero: 'numero', siren: 'fournisseur_siren' } as const;
  const piece: PieceErreur = { id: `piece-${String(i)}${erreur === undefined ? '-saine' : ''}`, texte, champsA };
  if (erreur !== undefined) { piece.erreur = erreur; piece.champ = noms[erreur]; }
  return piece;
}

/** 100 pièces, 20 par type d'erreur. */
export const PIECES_ERREURS: PieceErreur[] = Array.from({ length: 100 }, (_, i) => fabriquerPiece(i, TYPES_ERREUR[i % TYPES_ERREUR.length]));
export const PIECES_SAINES: PieceErreur[] = Array.from({ length: 20 }, (_, i) => fabriquerPiece(i + 200));

/** 12 pièces dont les valeurs concordent mais dont la citation du lecteur A est absente du texte extrait. */
export const PIECES_CITATION_ABSENTE: PieceErreur[] = Array.from({ length: 12 }, (_, i) => {
  const p = fabriquerPiece(i + 300);
  return { ...p, champ: 'ttc', champsA: p.champsA.map((c) => (c.nom === 'ttc' ? { ...c, citation: 'montant introuvable dans le texte' } : c)) };
});
