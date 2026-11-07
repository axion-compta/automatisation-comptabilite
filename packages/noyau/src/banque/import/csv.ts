// Découpe d'un CSV en cellules (guillemets, séparateur, retours à la ligne). Les dates et montants sont lus ailleurs.
// Le contenu d'une ligne n'apparaît jamais dans un message d'exception : il va seulement dans `rejets`.

export type SeparateurCsv = ';' | ',' | '\t';

export interface LigneCsv {
  /** Numéro de ligne dans le fichier, relatif à l'en-tête (1 = première ligne après l'en-tête). */
  rang: number;
  cellules: string[];
}

export interface RejetCsv {
  rang: number;
  brut: string;
  motif: 'guillemet_non_ferme' | 'nombre_de_colonnes';
}

export interface ResultatCsv {
  entete: string[];
  lignes: LigneCsv[];
  rejets: RejetCsv[];
}

export class ErreurCsv extends Error {
  override name = 'ErreurCsv';
  readonly code: 'entete_invalide' | 'separateur_invalide';
  constructor(code: 'entete_invalide' | 'separateur_invalide') {
    super(code);
    this.code = code;
  }
}

interface Enregistrement {
  debut: number;
  cellules: string[];
  brut: string;
  ouvert: boolean;
}

function decouper(texte: string, separateur: string): Enregistrement[] {
  const sortie: Enregistrement[] = [];
  let cellules: string[] = [];
  let cellule = '';
  let entre = false;
  let debutChamp = true;
  let ligne = 0;
  let debutLigne = 0;
  let debutBrut = 0;
  const clore = (fin: number): void => {
    cellules.push(cellule);
    sortie.push({ debut: debutLigne, cellules, brut: texte.slice(debutBrut, fin), ouvert: false });
    cellules = [];
    cellule = '';
    debutChamp = true;
  };
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charAt(i);
    const retour = c === '\n' || c === '\r';
    if (entre) {
      if (c !== '"') {
        cellule += c;
        if (c === '\n' || (c === '\r' && texte.charAt(i + 1) !== '\n')) ligne += 1;
      }
      else if (texte.charAt(i + 1) === '"') {
        cellule += c;
        i += 1;
      } else entre = false;
    } else if (c === '"' && debutChamp) {
      entre = true;
      debutChamp = false;
    } else if (c === separateur) {
      cellules.push(cellule);
      cellule = '';
      debutChamp = true;
    } else if (retour) {
      clore(i);
      if (c === '\r' && texte.charAt(i + 1) === '\n') i += 1;
      ligne += 1;
      debutLigne = ligne;
      debutBrut = i + 1;
    } else {
      cellule += c;
      debutChamp = false;
    }
  }
  if (entre) sortie.push({ debut: debutLigne, cellules: [], brut: texte.slice(debutBrut), ouvert: true });
  else if (texte.length > debutBrut) clore(texte.length);
  return sortie;
}

export function lireCsv(texte: string, separateur: SeparateurCsv, ligneEntete = 0): ResultatCsv {
  if (![';', ',', '\t'].includes(separateur)) throw new ErreurCsv('separateur_invalide');
  const lus = decouper(texte, separateur).filter((e) => e.ouvert || e.brut.trim() !== '');
  if (!Number.isSafeInteger(ligneEntete) || ligneEntete < 0) throw new ErreurCsv('entete_invalide');
  if (lus.length === 0 && ligneEntete === 0) return { entete: [], lignes: [], rejets: [] };
  const entete = lus[ligneEntete];
  if (entete === undefined || entete.ouvert) throw new ErreurCsv('entete_invalide');
  const resultat: ResultatCsv = { entete: entete.cellules, lignes: [], rejets: [] };
  for (const e of lus.slice(ligneEntete + 1)) {
    const rang = e.debut - entete.debut;
    if (e.ouvert) resultat.rejets.push({ rang, brut: e.brut, motif: 'guillemet_non_ferme' });
    else if (e.cellules.length !== entete.cellules.length) resultat.rejets.push({ rang, brut: e.brut, motif: 'nombre_de_colonnes' });
    else resultat.lignes.push({ rang, cellules: e.cellules });
  }
  return resultat;
}

const FORME_DATE = /\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}|^\d{8}/;

/** Dernière ligne sans date dont une cellule commence par « total » : retirée des lignes et rendue à part. */
export function ligneDeTotal(lignes: LigneCsv[]): { lignes: LigneCsv[]; total: LigneCsv | null } {
  const derniere = lignes[lignes.length - 1];
  const cellules = derniere?.cellules.map((c) => c.trim()) ?? [];
  if (derniere === undefined || cellules.some((c) => FORME_DATE.test(c))) return { lignes, total: null };
  if (!cellules.some((c) => c.toLowerCase().startsWith('total'))) return { lignes, total: null };
  return { lignes: lignes.slice(0, -1), total: derniere };
}
