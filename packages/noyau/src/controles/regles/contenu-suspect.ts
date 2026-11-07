// Contrôle CC-K14 : contenu suspect détecté en code (quarantaine). Règle pure, codes seulement.
// La liste de phrases est un argument versionné ; la détection par un modèle n'est pas ici.
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';

export interface MotifsSuspects {
  version: number;
  phrases: readonly string[];
}

export type RaisonSuspecte = 'phrase' | 'caractere_invisible' | 'balise' | 'texte_masque';

export interface ResultatDetection {
  suspect: boolean;
  raisons: RaisonSuspecte[];
}

export interface EntreeContenu {
  texte: string;
  motifs: MotifsSuspects;
  /** Texte marqué masqué par l'appelant (style caché, couleur du fond). */
  masque?: boolean;
}

/** Plages Unicode [début, fin] : largeur nulle, marques et contrôles bidirectionnels, BOM. */
const PLAGES_INVISIBLES: readonly (readonly [number, number])[] = [
  [0x00ad, 0x00ad],
  [0x061c, 0x061c],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x206a, 0x206f],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
  [0xe0000, 0xe007f],
];
const BALISES = ['<script', '<!--'];
const ACCENTS = /[̀-ͯ]/g;
const BLANCS = /\s+/g;

function estInvisible(code: number): boolean {
  if (code < 0xad) return false;
  return PLAGES_INVISIBLES.some(([debut, fin]) => code >= debut && code <= fin);
}

function contientInvisible(texte: string): boolean {
  for (const c of texte) {
    if (estInvisible(c.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

function sansInvisibles(texte: string): string {
  if (!contientInvisible(texte)) return texte;
  return Array.from(texte)
    .filter((c) => !estInvisible(c.codePointAt(0) ?? 0))
    .join('');
}

/** NFKC, minuscules, accents retirés, blancs réduits. */
export function normaliserTexte(s: string): string {
  return s.normalize('NFKC').toLowerCase().normalize('NFD').replace(ACCENTS, '').replace(BLANCS, ' ').trim();
}

/** Recherche de sous-chaînes seulement : aucune expression à retour arrière. */
export function detecterSuspect(texte: string, motifs: MotifsSuspects, masque = false): ResultatDetection {
  if (!Number.isSafeInteger(motifs.version) || motifs.version < 1) throw new ErreurControle('parametre_invalide');
  const raisons: RaisonSuspecte[] = [];
  const normalise = normaliserTexte(sansInvisibles(texte));
  const phrases = motifs.phrases.map(normaliserTexte).filter((p) => p !== '');
  if (phrases.some((p) => normalise.includes(p))) raisons.push('phrase');
  if (contientInvisible(texte)) raisons.push('caractere_invisible');
  if (BALISES.some((b) => normalise.includes(b))) raisons.push('balise');
  if (masque) raisons.push('texte_masque');
  return { suspect: raisons.length > 0, raisons };
}

const ECHAPPEMENTS: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Texte brut sans invisibles, coupé à `longueurMax` caractères puis échappé. */
export function extraitNeutralise(texte: string, longueurMax: number): string {
  if (!Number.isSafeInteger(longueurMax) || longueurMax < 0) throw new ErreurControle('entree_invalide');
  return Array.from(sansInvisibles(texte))
    .slice(0, longueurMax)
    .map((c) => ECHAPPEMENTS[c] ?? c)
    .join('');
}

export const regleCCK14: RegleControle<EntreeContenu> = {
  id: 'CC-K14',
  version: 1,
  gravite: 'B',
  bloque: ['validation', 'tva', 'export', 'cloture'],
  declencheurs: ['arrivee', 'a_la_demande'],
  actif: true,
  evaluer({ texte, motifs, masque }): SortieRegle {
    return detecterSuspect(texte, motifs, masque === true).suspect ? alerte(undefined, 'quarantaine') : ok();
  },
};

export interface DecisionQuarantaine {
  outilsPermis: false;
  propositionAutomatique: false;
  validationHumaine: true;
}

export function decisionQuarantaine(r: ResultatDetection): DecisionQuarantaine | null {
  return r.suspect ? { outilsPermis: false, propositionAutomatique: false, validationHumaine: true } : null;
}
