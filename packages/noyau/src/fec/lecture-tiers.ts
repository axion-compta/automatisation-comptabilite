// Lecture d'un FEC venu d'un tiers : détecte séparateur, fin de ligne et encodage, normalise en UTF-8 sans marque d'ordre,
// puis passe par les contrôles de structure existants (inchangés). Aucun accès disque.
import { type EcartFec, type LigneFecLue, type ParametresLecture, lireFichierFec } from './controles-structure.js';

export type EncodageFec = 'utf-8' | 'latin-9';

export interface FormatFecDetecte {
  separateur: string;
  finDeLigne: string;
  encodage: EncodageFec;
  marqueOrdre: boolean;
}

export type ResultatLectureTiers =
  | { ok: true; format: FormatFecDetecte; lignes: LigneFecLue[]; ecarts: EcartFec[] }
  | { ok: false; code: 'format_fec_inconnu' };

const REFUS: ResultatLectureTiers = { ok: false, code: 'format_fec_inconnu' };
const SEPARATEURS = ['\t', '|'] as const;
const MARQUE = [0xef, 0xbb, 0xbf];
/** Contrôles C0 hors tabulation, LF et CR ; DEL et contrôles C1. */
function estControle(code: number): boolean {
  return (code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code <= 159);
}
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
/** Latin-9 (ISO 8859-15) : seuls ces huit octets diffèrent de Latin-1. */
const LATIN9: Record<number, string> = {
  0xa4: '€', 0xa6: 'Š', 0xa8: 'š', 0xb4: 'Ž', 0xb8: 'ž', 0xbc: 'Œ', 0xbd: 'œ', 0xbe: 'Ÿ',
};

function decoderLatin9(octets: Uint8Array): string {
  return Array.from(octets, (o) => LATIN9[o] ?? String.fromCharCode(o)).join('');
}

function decoder(octets: Uint8Array): { texte: string; encodage: EncodageFec } {
  try {
    return { texte: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(octets), encodage: 'utf-8' };
  } catch {
    return { texte: decoderLatin9(octets), encodage: 'latin-9' };
  }
}

function detecterSeparateur(entete: string, parametres: ParametresLecture): string | undefined {
  const attendu = parametres.colonnes.map((c) => c.entete);
  const compatibles = SEPARATEURS.filter((s) => entete.split(s).length === attendu.length);
  if (compatibles.length === 1) return compatibles[0];
  return compatibles.find((s) => entete.split(s).every((v, i) => v === attendu[i]));
}

/** Octets d'un FEC tiers : le format est détecté, jamais supposé ; hors des formats connus, refus clair. */
export function lireFecTiers(contenu: Uint8Array, parametres: ParametresLecture): ResultatLectureTiers {
  const marqueOrdre = MARQUE.every((octet, i) => contenu[i] === octet);
  const { texte, encodage } = decoder(marqueOrdre ? contenu.subarray(MARQUE.length) : contenu);
  // Un texte vide ou un caractère de contrôle (octet nul, C0 hors tabulation et fins de ligne, DEL, C1) n'est pas un FEC :
  // un Windows-1252 se trahit par ses octets 0x80 à 0x9F. Une deuxième marque d'ordre est refusée par le contrôle des en-têtes.
  if (texte === '' || Array.from(texte).some((c) => estControle(c.codePointAt(0) ?? 0))) return REFUS;
  const premierLf = texte.indexOf(LF);
  const finDeLigne = premierLf > 0 && texte[premierLf - 1] === CR ? CR + LF : LF;
  const entete = premierLf === -1 ? texte : texte.slice(0, premierLf - (finDeLigne === CR + LF ? 1 : 0));
  const separateur = detecterSeparateur(entete, parametres);
  if (separateur === undefined) return REFUS;
  const colonnesIdentiques = entete.split(separateur).every((v, i) => v === parametres.colonnes[i]?.entete);
  if (!colonnesIdentiques) return REFUS;
  const normalise = new TextEncoder().encode(texte);
  const lecture = lireFichierFec(normalise, {
    ...parametres,
    options: { ...parametres.options, separateur },
    finDeLigne,
    marqueOrdreAcceptee: false,
  });
  return { ok: true, format: { separateur, finDeLigne, encodage, marqueOrdre }, ...lecture };
}
