// Préparation du FEC d'un exercice. Pur : ni horloge ni stockage ; le résultat du contrôle de la chaîne arrive en argument.
// Ordre des refus : SIREN absent, puis chaîne rompue. Même jeu, mêmes octets, même nom, même empreinte.
import type { Ecriture } from '../ecritures/modele.js';
import { empreinteSha256 } from '../documents/empreinte.js';
import { controlerDatesExercice, controlerEquilibre, REGLES_EQUILIBRE } from './controles-equilibre.js';
import { lireFichierFec, REGLES_STRUCTURE } from './controles-structure.js';
import { fichierFec, type OptionsFichierFec } from './fichier.js';
import type { OptionsFec } from './format.js';
import { type ChampFec, type ColonneFec, type ContexteFec, lignesFec, nomFichierFec } from './lignes.js';
import { type RapportFec, rapportFec } from './rapport.js';

const OBLIGATOIRES: readonly ChampFec[] = ['journalCode', 'ecritureNum', 'ecritureDate', 'compteNum', 'pieceRef', 'pieceDate', 'ecritureLib', 'validDate'];
const LIMITE_ECARTS_PAR_REGLE = 20;

export interface ProfilFec {
  /** Neuf chiffres ; absent, vide ou mal formé : refus `siren_absent`. */
  siren: string | null;
  contexte: ContexteFec;
  colonnes: readonly ColonneFec[];
  options: OptionsFec;
  fichier: OptionsFichierFec;
  versionLogiciel: string;
  versionPaquet: string;
}

export interface EntreePreparationFec {
  /** Dates ISO incluses ; la clôture donne le nom du fichier. */
  exercice: { debut: string; fin: string };
  ecritures: readonly Ecriture[];
  profil: ProfilFec;
  /** Résultat déjà calculé du contrôle de la chaîne du journal. */
  chaine: { ok: boolean };
}

export type ResultatPreparationFec =
  | { ok: false; code: 'siren_absent' | 'chaine_rompue' }
  | { ok: true; nomFichier: string; octets: Uint8Array; sha256: string; rapport: RapportFec };

export function preparerFecExercice(entree: EntreePreparationFec): ResultatPreparationFec {
  const { exercice, ecritures, profil, chaine } = entree;
  const siren = profil.siren;
  if (siren === null || !/^[0-9]{9}$/.test(siren)) return { ok: false, code: 'siren_absent' };
  if (chaine.ok !== true) return { ok: false, code: 'chaine_rompue' };
  const nomFichier = nomFichierFec({ siren, dateCloture: exercice.fin, travail: false });
  const brut = lignesFec(ecritures, profil.contexte, profil.colonnes, profil.options);
  // lignesFec termine chaque ligne par la fin de ligne, fichierFec l'ajoute lui-même : on la retire ici.
  const sans = (ligne: string): string => ligne.slice(0, ligne.length - profil.options.finDeLigne.length);
  const octets = fichierFec({ ...brut, entete: sans(brut.entete), lignes: brut.lignes.map(sans) }, profil.fichier);
  const lu = lireFichierFec(octets, {
    colonnes: profil.colonnes,
    options: profil.options,
    finDeLigne: profil.fichier.finDeLigne,
    marqueOrdreAcceptee: profil.fichier.marqueOrdreOctets,
    obligatoires: OBLIGATOIRES,
  });
  const ecarts = [...lu.ecarts, ...controlerEquilibre(lu.lignes), ...controlerDatesExercice(lu.lignes, exercice)];
  const rapport = rapportFec(
    {
      octets,
      ecarts,
      reglesVerifiees: REGLES_STRUCTURE.length + REGLES_EQUILIBRE.length,
      reglesNonExecutees: [],
      totalDebit: brut.totalDebit,
      totalCredit: brut.totalCredit,
      nombreLignes: brut.lignes.length,
      versionLogiciel: profil.versionLogiciel,
      versionPaquet: profil.versionPaquet,
    },
    LIMITE_ECARTS_PAR_REGLE,
  );
  return { ok: true, nomFichier, octets, sha256: empreinteSha256(octets), rapport };
}
