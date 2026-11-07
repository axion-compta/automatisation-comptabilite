// Outils du banc FEC : colonnes, options et production d'octets par le code du noyau.
import type { Ecriture } from '../../../ecritures/modele.js';
import { fichierFec } from '../../fichier.js';
import type { OptionsFec } from '../../format.js';
import { type ColonneFec, type ContexteFec, lignesFec } from '../../lignes.js';

const noms = [
  ['journalCode', 'JournalCode'],
  ['journalLib', 'JournalLib'],
  ['ecritureNum', 'EcritureNum'],
  ['ecritureDate', 'EcritureDate'],
  ['compteNum', 'CompteNum'],
  ['compteLib', 'CompteLib'],
  ['compAuxNum', 'CompAuxNum'],
  ['compAuxLib', 'CompAuxLib'],
  ['pieceRef', 'PieceRef'],
  ['pieceDate', 'PieceDate'],
  ['ecritureLib', 'EcritureLib'],
  ['debit', 'Debit'],
  ['credit', 'Credit'],
  ['ecritureLet', 'EcritureLet'],
  ['dateLet', 'DateLet'],
  ['validDate', 'ValidDate'],
  ['montantDevise', 'Montantdevise'],
  ['idevise', 'Idevise'],
] as const;

// Les 18 colonnes dans l'ordre de la spec 03 §06 ; ordre à reconfirmer.
export const COLONNES_BANC: readonly ColonneFec[] = noms.map(([champ, entete]) => ({ champ, entete }));

export const OPTIONS_BANC: OptionsFec = {
  separateur: String.fromCharCode(9),
  finDeLigne: String.fromCharCode(13, 10),
  longueurMaxLibelle: 200,
};

export interface JeuBanc {
  ecritures: readonly Ecriture[];
  contexte: ContexteFec;
}

export function produire(jeu: JeuBanc): Uint8Array {
  const brut = lignesFec(jeu.ecritures, jeu.contexte, COLONNES_BANC, OPTIONS_BANC);
  // lignesFec termine chaque ligne par la fin de ligne, fichierFec l'ajoute lui-même : on la retire ici.
  const sans = (ligne: string): string => ligne.slice(0, ligne.length - OPTIONS_BANC.finDeLigne.length);
  const resultat = { ...brut, entete: sans(brut.entete), lignes: brut.lignes.map(sans) };
  return fichierFec(resultat, { finDeLigne: OPTIONS_BANC.finDeLigne, marqueOrdreOctets: false, finDeLigneFinale: false });
}
