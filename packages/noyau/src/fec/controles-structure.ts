// Lecture d'un fichier FEC en octets et contrôles de structure (export et FEC importé). Aucun accès disque.
import type { Centimes } from '../argent/index.js';
import { ErreurFec, type OptionsFec, lireDateFec, lireLigne, lireMontantFec } from './format.js';
import type { ChampFec, ColonneFec } from './lignes.js';
export interface EcartFec {
  regleId: string;
  /** Numéro de ligne du fichier, l'en-tête étant la ligne 1. */
  ligne: number;
  champ?: ChampFec;
  valeur?: string;
  ecartCentimes?: Centimes;
}
export interface LigneFecLue {
  numero: number;
  valeurs: Record<ChampFec, string>;
}
export interface RegleFec {
  id: string;
  libelle: string;
  gravite: 'B' | 'M';
  source: string;
  testId: string;
}
export const REGLES_STRUCTURE: readonly RegleFec[] = [
  { id: 'FEC-S01', libelle: "En-tête différent des colonnes attendues", gravite: 'B', source: 'a_sourcer', testId: 'entete-different-s01' },
  { id: 'FEC-S02', libelle: 'Nombre de colonnes différent de celui attendu', gravite: 'B', source: 'a_sourcer', testId: 'colonne-manquante-s02' },
  { id: 'FEC-S03', libelle: 'Date invalide', gravite: 'B', source: 'a_sourcer', testId: 'date-30-fevrier-s03' },
  { id: 'FEC-S04', libelle: 'Montant au mauvais format', gravite: 'B', source: 'a_sourcer', testId: 'montant-avec-point-s04' },
  { id: 'FEC-S05', libelle: 'Champ obligatoire vide', gravite: 'B', source: 'a_sourcer', testId: 'obligatoire-vide-s05' },
  { id: 'FEC-S06', libelle: 'Ligne vide', gravite: 'B', source: 'a_sourcer', testId: 'ligne-vide-s06' },
  { id: 'FEC-S07', libelle: "Marque d'ordre présente alors qu'elle n'est pas acceptée", gravite: 'B', source: 'a_sourcer', testId: 'marque-ordre-refusee-s07' },
  { id: 'FEC-S08', libelle: 'Débit et crédit tous deux non nuls', gravite: 'B', source: 'a_sourcer', testId: 'debit-et-credit-s08' },
  { id: 'FEC-S09', libelle: 'Encodage UTF-8 invalide', gravite: 'B', source: 'a_sourcer', testId: 'encodage-invalide-s09' },
];
export interface ParametresLecture {
  colonnes: readonly ColonneFec[];
  options: OptionsFec;
  finDeLigne: string;
  marqueOrdreAcceptee: boolean;
  obligatoires: readonly ChampFec[];
}
const DATES: readonly ChampFec[] = ['ecritureDate', 'pieceDate', 'validDate'];
const MARQUE = [0xef, 0xbb, 0xbf];

function commenceParMarque(contenu: Uint8Array): boolean {
  return MARQUE.every((octet, i) => contenu[i] === octet);
}

function decouper(texte: string, finDeLigne: string): string[] {
  const parties = texte.split(finDeLigne);
  if (parties.length > 1 && parties[parties.length - 1] === '') parties.pop(); // une fin de ligne finale unique
  return parties;
}

function controlerLigne(
  numero: number,
  cellules: readonly string[],
  parametres: ParametresLecture,
): { lue?: LigneFecLue; ecarts: EcartFec[] } {
  const { colonnes, obligatoires } = parametres;
  if (cellules.length !== colonnes.length) {
    return { ecarts: [{ regleId: 'FEC-S02', ligne: numero, valeur: String(cellules.length) }] };
  }
  const valeurs = {} as Record<ChampFec, string>;
  colonnes.forEach((c, i) => {
    valeurs[c.champ] = cellules[i] ?? '';
  });
  const ecarts: EcartFec[] = [];
  const present = (champ: ChampFec): boolean => colonnes.some((c) => c.champ === champ);
  for (const champ of obligatoires) {
    if (present(champ) && (valeurs[champ] === '' || valeurs[champ].trim() === '')) {
      ecarts.push({ regleId: 'FEC-S05', ligne: numero, champ });
    }
  }
  for (const champ of [...DATES, 'dateLet' as const]) {
    if (!present(champ)) continue;
    const valeur = valeurs[champ];
    if (champ === 'dateLet' && valeur === '') continue;
    if (valeur === '' && obligatoires.includes(champ)) continue; // déjà signalé en S05
    try {
      lireDateFec(valeur);
    } catch (e) {
      if (!(e instanceof ErreurFec)) throw e;
      ecarts.push({ regleId: 'FEC-S03', ligne: numero, champ, valeur });
    }
  }
  const montants: Partial<Record<'debit' | 'credit', Centimes>> = {};
  for (const champ of ['debit', 'credit'] as const) {
    if (!present(champ)) continue;
    const valeur = valeurs[champ];
    if (valeur === '' && obligatoires.includes(champ)) continue;
    try {
      montants[champ] = lireMontantFec(valeur);
    } catch (e) {
      if (!(e instanceof ErreurFec)) throw e;
      ecarts.push({ regleId: 'FEC-S04', ligne: numero, champ, valeur });
    }
  }
  if ((montants.debit ?? 0) > 0 && (montants.credit ?? 0) > 0) {
    ecarts.push({ regleId: 'FEC-S08', ligne: numero });
  }
  return ecarts.length === 0 ? { lue: { numero, valeurs }, ecarts } : { ecarts };
}

export function lireFichierFec(
  contenu: Uint8Array,
  parametres: ParametresLecture,
): { lignes: LigneFecLue[]; ecarts: EcartFec[] } {
  const ecarts: EcartFec[] = [];
  const lignes: LigneFecLue[] = [];
  let octets = contenu;
  if (commenceParMarque(contenu)) {
    if (!parametres.marqueOrdreAcceptee) ecarts.push({ regleId: 'FEC-S07', ligne: 1 });
    octets = contenu.subarray(MARQUE.length);
  }
  let texte: string;
  try {
    texte = new TextDecoder('utf-8', { fatal: true }).decode(octets);
  } catch {
    return { lignes, ecarts: [...ecarts, { regleId: 'FEC-S09', ligne: 1 }] };
  }
  if (texte === '') return { lignes, ecarts: [...ecarts, { regleId: 'FEC-S01', ligne: 1 }] };
  const options: OptionsFec = { ...parametres.options, finDeLigne: parametres.finDeLigne };
  const attendu = parametres.colonnes.map((c) => c.entete);
  decouper(texte, parametres.finDeLigne).forEach((brut, index) => {
    const numero = index + 1;
    if (brut === '') {
      ecarts.push({ regleId: numero === 1 ? 'FEC-S01' : 'FEC-S06', ligne: numero });
      return;
    }
    let cellules: string[];
    try {
      cellules = lireLigne(brut, options);
    } catch (e) {
      if (!(e instanceof ErreurFec)) throw e;
      ecarts.push({ regleId: numero === 1 ? 'FEC-S01' : 'FEC-S02', ligne: numero });
      return;
    }
    if (numero === 1) {
      const identique = cellules.length === attendu.length && cellules.every((v, i) => v === attendu[i]);
      if (!identique) ecarts.push({ regleId: 'FEC-S01', ligne: 1 });
      return;
    }
    const r = controlerLigne(numero, cellules, parametres);
    ecarts.push(...r.ecarts);
    if (r.lue !== undefined) lignes.push(r.lue);
  });
  return { lignes, ecarts };
}
