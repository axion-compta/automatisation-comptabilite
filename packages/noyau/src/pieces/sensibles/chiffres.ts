// Détection et masquage de NIR, cartes de paiement et IBAN, par le code, avant tout appel d'IA.
// Faux positifs acceptés : un numéro de facture de 16 chiffres qui passe Luhn sera masqué, la sécurité prime.
import { ErreurPiece } from '../types.js';

export interface Detection { motif: 'nir' | 'carte_paiement' | 'iban'; debut: number; fin: number; }

const SEP = '[ \\u00A0\\u202F.-]';
const S = SEP + '?';
const RE_IBAN = new RegExp(`(?<![A-Za-z0-9])(?=([A-Z]{2}\\d{2}(?:${S}[A-Za-z0-9]){11,30}))`, 'g');
const RE_CHIFFRES = new RegExp(`\\d(?:${S}\\d)*`, 'g');
const RE_NIR = new RegExp(`(?<!\\d)[12](?:${S}\\d){4}${S}(?:\\d${S}\\d|2${S}[AB])(?:${S}\\d){8}(?!\\d)`, 'g');
const ALNUM = /[A-Za-z0-9]/;

export function cleLuhnValide(chiffres: string): boolean {
  if (!/^\d+$/.test(chiffres)) return false;
  let total = 0;
  for (let i = 0; i < chiffres.length; i++) {
    const d = Number(chiffres[chiffres.length - 1 - i]);
    const v = i % 2 === 1 ? d * 2 : d;
    total += v > 9 ? v - 9 : v;
  }
  return total % 10 === 0;
}

export function cleNirValide(nir15: string): boolean {
  if (!/^[12]\d{4}(?:\d{2}|2[AB])\d{6}\d{2}$/.test(nir15)) return false;
  const n = Number(nir15.slice(0, 13).replace('2A', '19').replace('2B', '18'));
  return Number(nir15.slice(13)) === 97 - (n % 97);
}

export function ibanValide(iban: string): boolean {
  const s = iban.replace(new RegExp(SEP, 'g'), '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  let reste = 0;
  for (const c of s.slice(4) + s.slice(0, 4)) {
    reste = /\d/.test(c) ? (reste * 10 + Number(c)) % 97 : (reste * 100 + c.charCodeAt(0) - 55) % 97;
  }
  return reste === 1;
}

/** Positions (dans le texte) des caractères alphanumériques d'un morceau commençant à `base`. */
const positions = (morceau: string, base: number, filtre: RegExp): number[] =>
  [...morceau].flatMap((c, i) => (filtre.test(c) ? [base + i] : []));

export function detecterChiffres(texte: string): Detection[] {
  const ibans: Detection[] = [];
  for (const m of texte.matchAll(RE_IBAN)) {
    const pos = positions(m[1]!, m.index, ALNUM);
    for (let len = Math.min(34, pos.length); len >= 15; len--) {
      const debut = pos[0]!;
      const fin = pos[len - 1]! + 1;
      if (ibanValide(texte.slice(debut, fin))) { ibans.push({ motif: 'iban', debut, fin }); break; }
    }
  }
  const cartes: Detection[] = [];
  for (const m of texte.matchAll(RE_CHIFFRES)) {
    const pos = positions(m[0], m.index, /\d/);
    for (let len = 19; len >= 13; len--) {
      for (let a = 0; a + len <= pos.length; a++) {
        const chiffres = pos.slice(a, a + len).map((p) => texte[p]).join('');
        if (cleLuhnValide(chiffres)) cartes.push({ motif: 'carte_paiement', debut: pos[a]!, fin: pos[a + len - 1]! + 1 });
      }
    }
  }
  const nirs: Detection[] = [];
  for (const m of texte.matchAll(RE_NIR)) {
    if (cleNirValide(m[0].replace(new RegExp(SEP, 'g'), ''))) nirs.push({ motif: 'nir', debut: m.index, fin: m.index + m[0].length });
  }
  // Une fenêtre « carte » contenue dans un NIR valide est le NIR lui-même : le NIR l'emporte.
  const cartesDistinctes = cartes.filter((c) => !nirs.some((n) => c.debut >= n.debut && c.fin <= n.fin));
  const retenues: Detection[] = [];
  for (const c of [...ibans, ...cartesDistinctes, ...nirs]) {
    if (retenues.every((r) => c.fin <= r.debut || c.debut >= r.fin)) retenues.push(c);
  }
  return retenues.sort((a, b) => a.debut - b.debut);
}

export function masquer(texte: string, detections: readonly Detection[]): string {
  let sortie = '';
  let curseur = 0;
  for (const d of detections) {
    if (!Number.isInteger(d.debut) || !Number.isInteger(d.fin) || d.debut < curseur || d.fin <= d.debut || d.fin > texte.length) {
      throw new ErreurPiece('detection_invalide', 'détection hors du texte ou non triée');
    }
    const morceau = texte.slice(d.debut, d.fin);
    let remplace: string;
    if (d.motif === 'carte_paiement') remplace = '**** ' + morceau.replace(/\D/g, '').slice(-4);
    else if (d.motif === 'iban') remplace = '*'.repeat(morceau.length - 4) + morceau.slice(-4);
    else remplace = morceau.replace(/[0-9A-Za-z]/g, '*');
    sortie += texte.slice(curseur, d.debut) + remplace;
    curseur = d.fin;
  }
  return sortie + texte.slice(curseur);
}
