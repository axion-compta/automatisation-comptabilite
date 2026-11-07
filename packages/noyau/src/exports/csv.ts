// Exports : écriture CSV (EX-R2, EX-R4, EX-R6). UTF-8 avec BOM, « ; », CRLF.
import { centimes, formater } from '../argent/index.js';
import type { Centimes } from '../argent/index.js';
import { cellule } from './neutraliser.js';
import type { TypeColonne } from './neutraliser.js';

export class ErreurCsv extends Error {
  readonly code: 'colonne_total_inconnue' | 'montant_invalide';
  constructor(code: 'colonne_total_inconnue' | 'montant_invalide') {
    super(code);
    this.name = 'ErreurCsv';
    this.code = code;
  }
}

export interface ColonneCsv {
  code: string;
  type: TypeColonne;
  entete: string;
}

export interface TotalCsv {
  etiquette: string;
  colonne: string;
  valeurCentimes: Centimes;
}

const BOM = String.fromCodePoint(0xfeff);
const SEPARATEUR = ';';
const FIN_DE_LIGNE = '\r\n';
const GUILLEMET = '"';

/** Texte : neutralisation d'abord, puis guillemets doublés, puis entouré de guillemets. */
function entourer(neutralise: string): string {
  return GUILLEMET + neutralise.split(GUILLEMET).join(GUILLEMET + GUILLEMET) + GUILLEMET;
}

const texteCsv = (v: string): string => entourer(cellule(v, 'texte').valeur);

function valeurCsv(valeur: unknown, type: TypeColonne): string {
  const c = cellule(valeur, type);
  const absent = valeur === null || valeur === undefined || valeur === '';
  // Colonne numérique : seul un entier sûr est écrit ; absent = cellule vide ; le reste est refusé.
  if (c.genre === 'texte' && (type === 'centimes' || type === 'entier') && !absent) throw new ErreurCsv('montant_invalide');
  if (c.genre === 'texte') return entourer(c.valeur);
  if (c.genre === 'date') return c.valeur.slice(8, 10) + '/' + c.valeur.slice(5, 7) + '/' + c.valeur.slice(0, 4);
  return type === 'centimes' ? formater(centimes(Number(c.valeur))) : c.valeur;
}

export function ecrireCsv(entree: {
  colonnes: ColonneCsv[];
  lignes: Record<string, unknown>[];
  total?: TotalCsv;
  filtresRappeles?: string[];
}): string {
  const { colonnes, lignes, total, filtresRappeles } = entree;
  if (total !== undefined && !colonnes.some((c) => c.code === total.colonne)) {
    throw new ErreurCsv('colonne_total_inconnue');
  }
  const sortie: string[] = [];
  for (const f of filtresRappeles ?? []) sortie.push(texteCsv(f));
  sortie.push(colonnes.map((c) => texteCsv(c.entete)).join(SEPARATEUR));
  for (const l of lignes) sortie.push(colonnes.map((c) => valeurCsv(l[c.code], c.type)).join(SEPARATEUR));
  if (total !== undefined) {
    if (!Number.isSafeInteger(total.valeurCentimes)) throw new ErreurCsv('montant_invalide');
    const libelle = colonnes.find((c) => c.code !== total.colonne)?.code;
    const cellules = colonnes.map((c) =>
      c.code === total.colonne ? formater(total.valeurCentimes) : c.code === libelle ? texteCsv(total.etiquette) : '',
    );
    if (libelle === undefined) cellules.unshift(texteCsv(total.etiquette));
    sortie.push(cellules.join(SEPARATEUR));
  }
  return BOM + sortie.map((s) => s + FIN_DE_LIGNE).join('');
}
