// Pièce d'identité (MRZ, mots-clés), santé/paie et secrets : décide si la pièce est sensible (jamais envoyée à un modèle).
import { MOTIFS_MASQUAGE, type MotifMasquage, type MotifSensible, ErreurPiece } from '../types.js';
import { MOTIFS_SENSIBLES } from './motifs.js';

const POIDS = [7, 3, 1] as const;

export function chiffreControleMrz(chaine: string): number {
  let total = 0;
  [...chaine].forEach((c, i) => {
    let v: number;
    if (c >= '0' && c <= '9') v = Number(c);
    else if (c >= 'A' && c <= 'Z') v = c.charCodeAt(0) - 55;
    else if (c === '<') v = 0;
    else throw new ErreurPiece('mrz_invalide', 'caractère MRZ invalide');
    total += v * POIDS[i % 3]!;
  });
  return total % 10;
}

const controleJuste = (numero: string, controle: string): boolean =>
  /^\d$/.test(controle) && /[^<]/.test(numero) && chiffreControleMrz(numero) === Number(controle);

export function contientMrz(texte: string): boolean {
  return texte.split(/\r?\n/).some((ligne) => {
    const l = ligne.replace(/\s+/g, '');
    if (!/^[A-Z0-9<]+$/.test(l)) return false;
    if (l.length === 30) return controleJuste(l.slice(5, 14), l[14]!);
    if (l.length === 36 || l.length === 44) return controleJuste(l.slice(0, 9), l[9]!);
    return false;
  });
}

const normaliser = (t: string): string =>
  t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

/** Mots-clés de la liste présents dans le texte (sans casse ni accents, mot entier). */
export function motsTrouves(texte: string, liste: readonly string[]): string[] {
  const t = normaliser(texte);
  return liste.filter((mot) => {
    const m = normaliser(mot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${m}(?![a-z0-9])`).test(t);
  });
}

export interface DecisionSensibilite {
  sensible: boolean; motifs: MotifSensible[]; masquages: MotifMasquage[]; appelIaPermis: boolean; versionMotifs: number;
}

export function deciderSensibilite(entree: { texte: string; detectionsChiffrees: readonly { motif: string }[] }): DecisionSensibilite {
  const { texte, detectionsChiffrees } = entree;
  const motifs: MotifSensible[] = [];
  if (contientMrz(texte) || motsTrouves(texte, MOTIFS_SENSIBLES.pieceIdentite).length > 0) motifs.push('piece_identite');
  if (motsTrouves(texte, MOTIFS_SENSIBLES.santePaie).length > 0) motifs.push('sante_paie');
  if (detectionsChiffrees.some((d) => d.motif === 'nir')) motifs.push('nir');
  const vus = new Set<string>(detectionsChiffrees.map((d) => d.motif));
  if (motsTrouves(texte, MOTIFS_SENSIBLES.secrets).length > 0) vus.add('secret');
  const masquages = MOTIFS_MASQUAGE.filter((m) => vus.has(m));
  return { sensible: motifs.length > 0, motifs, masquages, appelIaPermis: motifs.length === 0, versionMotifs: MOTIFS_SENSIBLES.version };
}
