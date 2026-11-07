// Numérotation continue des écritures : format, attribution sans trou, contrôle de suite.
import { ErreurEcriture } from './modele.js';

export interface Tentative {
  id: string;
  reussit: boolean;
}

export interface RangAttribue {
  id: string;
  rang: number;
}

export interface ResultatAttribution {
  attribues: RangAttribue[];
  compteur: number;
}

export interface ResultatSuite {
  trous: number[];
  doublons: number[];
}

function entierSur(valeur: number, minimum: number, nom: string): void {
  if (!Number.isSafeInteger(valeur) || valeur < minimum) {
    throw new RangeError(nom + ' doit être un entier sûr supérieur ou égal à ' + String(minimum) + '.');
  }
}

/** Formate `{JOURNAL}-{AAAA}-{NNNNNN}` ; la largeur est un argument. */
export function formaterNumero(
  journal: string,
  anneeCloture: number,
  rang: number,
  largeur: number,
): string {
  if (!/^[A-Z0-9]+$/.test(journal)) {
    throw new RangeError('Le journal doit être en majuscules et chiffres, non vide.');
  }
  entierSur(anneeCloture, 1000, 'L\'année de clôture');
  if (anneeCloture > 9999) {
    throw new RangeError('L\'année de clôture doit avoir 4 chiffres (1000 à 9999).');
  }
  entierSur(rang, 1, 'Le rang');
  entierSur(largeur, 1, 'La largeur');
  const chiffres = String(rang);
  if (chiffres.length > largeur) {
    throw new ErreurEcriture('rang_trop_grand', 'Le rang ne tient pas dans la largeur du numéro.');
  }
  return journal + '-' + String(anneeCloture) + '-' + chiffres.padStart(largeur, '0');
}

/** Ne consomme un rang que pour une tentative réussie ; `compteur` = dernier rang attribué. */
export function attribuer(compteur: number, tentatives: readonly Tentative[]): ResultatAttribution {
  entierSur(compteur, 0, 'Le compteur');
  const vus = new Set<string>();
  for (const t of tentatives) {
    if (vus.has(t.id)) throw new RangeError('Un identifiant de tentative est présent deux fois.');
    vus.add(t.id);
  }
  const attribues: RangAttribue[] = [];
  let courant = compteur;
  for (const t of tentatives) {
    if (!t.reussit) continue;
    entierSur(courant + 1, 1, 'Le rang suivant');
    courant += 1;
    attribues.push({ id: t.id, rang: courant });
  }
  return { attribues, compteur: courant };
}

/** Repère les trous et les doublons d'une suite censée partir de 1. */
export function verifierSuite(rangs: readonly number[]): ResultatSuite {
  for (const r of rangs) entierSur(r, 1, 'Un rang');
  const tri = [...rangs].sort((a, b) => a - b);
  const trous: number[] = [];
  const doublons: number[] = [];
  let attendu = 1;
  let precedent = 0;
  for (const r of tri) {
    if (r === precedent) {
      if (doublons[doublons.length - 1] !== r) doublons.push(r);
      continue;
    }
    for (let m = attendu; m < r; m++) trous.push(m);
    attendu = r + 1;
    precedent = r;
  }
  return { trous, doublons };
}
