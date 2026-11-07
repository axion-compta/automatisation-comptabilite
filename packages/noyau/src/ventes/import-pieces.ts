// Import des ventes : montants et dates lus sans flottant, chaque ligne importée ou rejetée avec sa raison.
import { type Centimes, centimes } from '../argent/index.js';
import { aCreer, cleDedoublonnage } from './dedoublonnage.js';
import type { PieceVente } from './types.js';
import { estDateIso } from './types.js';

export type SeparateurDecimal = ',' | '.';
export type FormatDate = 'JJ/MM/AAAA' | 'AAAA-MM-JJ';
export type RaisonRejet = 'numero_absent' | 'date_invalide' | 'montant_invalide' | 'totaux_incoherents';
export interface OptionsImport {
  sirenSociete: string;
  separateurDecimal: SeparateurDecimal;
  formatDate: FormatDate;
}
export type PieceImportee = PieceVente & { ligneSource: number };
export interface RejetPiece {
  ligne: number;
  raison: RaisonRejet;
}

const BASE = 10;
const DECIMALES_MAX = 2;
const CODE_ZERO = '0'.charCodeAt(0);
const CODE_NEUF = '9'.charCodeAt(0);
const ESPACES = new Set([' ', String.fromCharCode(160), String.fromCharCode(8239)]);
const FORME_FR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Lecture caractère par caractère : jamais de nombre à virgule. `null` si le texte n'est pas un montant. */
export function montantVersCentimes(texte: string, options: { separateurDecimal: SeparateurDecimal }): Centimes | null {
  if (typeof texte !== 'string') return null;
  let i = 0;
  const negatif = texte.startsWith('-');
  if (negatif) i++;
  let entier = 0;
  let decimales = 0;
  let chiffresEntiers = 0;
  let apresSeparateur = false;
  let valeur = 0;
  for (; i < texte.length; i++) {
    const c = texte.charAt(i);
    const code = c.charCodeAt(0);
    if (code >= CODE_ZERO && code <= CODE_NEUF) {
      if (apresSeparateur) {
        decimales++;
        if (decimales > DECIMALES_MAX) return null;
        valeur = valeur * BASE + (code - CODE_ZERO);
      } else {
        chiffresEntiers++;
        entier = entier * BASE + (code - CODE_ZERO);
        valeur = entier;
      }
    } else if (c === options.separateurDecimal) {
      if (apresSeparateur || chiffresEntiers === 0) return null;
      apresSeparateur = true;
    // Règle : les espaces ne sont admis qu’avant le séparateur ; après (y compris en fin de cellule), le montant est refusé.
    } else if (!ESPACES.has(c) || apresSeparateur) return null;
  }
  if (chiffresEntiers === 0 || (apresSeparateur && decimales === 0)) return null;
  for (let k = decimales; k < DECIMALES_MAX; k++) valeur *= BASE;
  if (!Number.isSafeInteger(valeur)) return null;
  return centimes(negatif ? -valeur : valeur);
}

export function dateVersIso(texte: string, format: FormatDate): string | null {
  if (typeof texte !== 'string') return null;
  let iso = texte;
  if (format === 'JJ/MM/AAAA') {
    const m = FORME_FR.exec(texte);
    if (m === null) return null;
    iso = `${m[3] ?? ''}-${m[2] ?? ''}-${m[1] ?? ''}`;
  }
  return estDateIso(iso) ? iso : null;
}

function texteDe(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur : '';
}

export function lignesVersPieces(
  objets: readonly Record<string, string>[],
  options: OptionsImport,
): { pieces: PieceImportee[]; rejets: RejetPiece[] } {
  const pieces: PieceImportee[] = [];
  const rejets: RejetPiece[] = [];
  objets.forEach((o, index) => {
    const ligne = index + 1;
    const rejeter = (raison: RaisonRejet): void => {
      rejets.push({ ligne, raison });
    };
    const numero = texteDe(o['numero']);
    if (numero.trim() === '') return rejeter('numero_absent');
    const dateFacture = dateVersIso(texteDe(o['date']), options.formatDate);
    if (dateFacture === null) return rejeter('date_invalide');
    const ht = montantVersCentimes(texteDe(o['ht']), options);
    const tva = montantVersCentimes(texteDe(o['tva']), options);
    const ttc = montantVersCentimes(texteDe(o['ttc']), options);
    if (ht === null || tva === null || ttc === null) return rejeter('montant_invalide');
    if (ht + tva !== ttc) return rejeter('totaux_incoherents');
    const cle = cleDedoublonnage({ sirenVendeur: options.sirenSociete, numero, dateFacture, ttc });
    pieces.push({
      id: cle ?? `${options.sirenSociete}:${numero}:ligne-${String(ligne)}`,
      type: 'facture',
      origine: 'import_fichier',
      numero,
      dateFacture,
      htCentimes: ht,
      tvaCentimes: tva,
      ttcCentimes: ttc,
      statut: 'lue',
      ...(cle === null ? {} : { cle }),
      ligneSource: ligne,
    });
  });
  return { pieces, rejets };
}

export function importer(
  clesExistantes: ReadonlySet<string>,
  objets: readonly Record<string, string>[],
  options: OptionsImport,
): { creees: PieceImportee[]; rejets: RejetPiece[]; dejaPresentes: number } {
  const { pieces, rejets } = lignesVersPieces(objets, options);
  const creees = aCreer(
    clesExistantes,
    pieces.map((p) => ({ ...p, cle: p.cle ?? null })),
  ).map(({ cle, ...reste }) => ({ ...reste, ...(cle === null ? {} : { cle }) }));
  return { creees, rejets, dejaPresentes: pieces.length - creees.length };
}
