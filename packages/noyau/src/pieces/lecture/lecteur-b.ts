// Lecteur B : règles en code sur le texte extrait. Aucun appel à un modèle, aucun taux en dur.
import { lireDate, lireMontant } from './formats.js';
import type { ConventionPays } from './conventions.js';
import { analyserTva, normaliserIdentifiant, sirenValide, siretValide } from './identifiants.js';
import { MOTS_CLES_LECTURE as MOTS } from './mots-cles-lecture.js';
import { nomParTaux, type ChampLu } from '../types.js';
import type { Centimes } from '../../argent/index.js';

export interface EntreeLecteurB { texte: string; source: 'texte_pdf' | 'ocr'; convention: ConventionPays; tauxConnusPdb: number[] }
export interface SortieLecteurB { champs: ChampLu[]; ambigus: string[] }

// Même longueur que l'original : un caractère donne un caractère, sans accent, en minuscule.
const simple = (t: string): string => Array.from(t, (c) => c.normalize('NFD')[0]?.toLowerCase() ?? c).join('');
const lettre = (c: string | undefined): boolean => c !== undefined && /[a-z0-9]/.test(c);
const MONTANT = /\d{1,3}(?:[\s.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?/g;
const POURCENT_LU = /(\d{1,2})(?:[.,](\d{1,2}))?\s*%/;

/** Première occurrence d'un mot-clé entier : position de début et de fin, ou null. */
function trouver(ligne: string, mots: readonly string[]): { debut: number; fin: number } | null {
  let meilleur: { debut: number; fin: number } | null = null;
  for (const m of mots) {
    for (let i = ligne.indexOf(m); i >= 0; i = ligne.indexOf(m, i + 1)) {
      const fin = i + m.length;
      if (!lettre(ligne[i - 1]) && !lettre(ligne[fin])) {
        if (meilleur === null || i < meilleur.debut) meilleur = { debut: i, fin };
        break;
      }
    }
  }
  return meilleur;
}

export function lireAvecRegles(e: EntreeLecteurB): SortieLecteurB {
  const candidats = new Map<string, { cle: string; champ: ChampLu }[]>();
  const ajouter = (nom: string, cle: string, valeur: string, citation: string, centimes?: Centimes): void => {
    const champ: ChampLu = { nom, valeur, source: e.source, lecteur: 'B', citation };
    if (centimes !== undefined) champ.valeurCentimes = centimes;
    const liste = candidats.get(nom) ?? [];
    if (!liste.some((c) => c.cle === cle)) liste.push({ cle, champ });
    candidats.set(nom, liste);
  };
  for (const ligne of e.texte.split(/\r?\n/)) {
    const s = simple(ligne);
    const pct = POURCENT_LU.exec(ligne);
    const reste = pct === null ? ligne : ligne.slice(0, pct.index) + ' '.repeat(pct[0].length) + ligne.slice(pct.index + pct[0].length);
    const montants = (reste.match(MONTANT) ?? []).map((brut) => ({ brut, lu: lireMontant(brut, e.convention) }));
    const dernier = montants[montants.length - 1];
    const montant = dernier !== undefined && 'centimes' in dernier.lu ? { brut: dernier.brut, c: dernier.lu.centimes } : null;
    const ttc = trouver(s, MOTS.ttc);
    const tva = trouver(s, MOTS.tva);
    const ht = trouver(s, MOTS.ht);
    if (ttc !== null && montant !== null) ajouter('ttc', 'c' + String(montant.c), montant.brut, montant.brut, montant.c);
    else if (pct !== null && montant !== null && (tva !== null || ht !== null)) {
      const pdb = Number((pct[1] ?? '') + (pct[2] ?? '').padEnd(2, '0'));
      if (e.tauxConnusPdb.includes(pdb)) {
        const estTva = tva !== null && (ht === null || tva.debut < ht.debut);
        ajouter(nomParTaux(estTva ? 'tva' : 'ht', pdb), 'c' + String(montant.c), montant.brut, montant.brut, montant.c);
      }
    }
    const num = trouver(s, MOTS.numero);
    if (num !== null) {
      const m = /^[\s:°º#.]*([A-Z0-9][A-Z0-9/-]{2,})/.exec(ligne.slice(num.fin));
      if (m?.[1] !== undefined) ajouter('numero', m[1], m[1], m[1]);
    }
    const dat = trouver(s, MOTS.date);
    if (dat !== null && !/\b(echeance|due)\b/.test(s)) {
      const m = /^[\s:]*(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}|\d{1,2}\s+\p{L}+\.?\s+\d{4})/u.exec(ligne.slice(dat.fin));
      const d = m?.[1] === undefined ? null : lireDate(m[1], e.convention);
      if (m?.[1] !== undefined && d !== null && 'date' in d) ajouter('date_piece', d.date, d.date, m[1]);
    }
  }
  for (const m of e.texte.matchAll(/\d{3}[ .]?\d{3}[ .]?\d{3}(?:[ .]?\d{5})?/g)) {
    const n = normaliserIdentifiant(m[0]);
    if ((n.length === 9 && sirenValide(n)) || (n.length > 9 && siretValide(n))) { ajouter('fournisseur_siren', n.slice(0, 9), n.slice(0, 9), m[0]); break; }
  }
  for (const m of e.texte.matchAll(/\b[A-Z]{2}[ .]?[A-Z0-9]{2}(?:[ .]?\d{3}){3}\b/g)) {
    if (analyserTva(m[0]).statut === 'valide') { const n = normaliserIdentifiant(m[0]); ajouter('fournisseur_tva', n, n, m[0]); break; }
  }
  const champs: ChampLu[] = [];
  const ambigus: string[] = [];
  for (const [nom, liste] of candidats) {
    if (liste.length > 1) ambigus.push(nom);
    else if (liste[0] !== undefined) champs.push(liste[0].champ);
  }
  return { champs, ambigus };
}
