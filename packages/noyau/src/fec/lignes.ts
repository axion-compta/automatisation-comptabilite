// Lignes du FEC depuis les écritures validées, et nom du fichier. Aucune écriture sur disque.
import { type Centimes, ajouter, centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import {
  ErreurFec,
  type OptionsFec,
  assemblerLigne,
  formaterDateFec,
  formaterMontantFec,
  nettoyerLibelle,
} from './format.js';

export type ChampFec =
  | 'journalCode'
  | 'journalLib'
  | 'ecritureNum'
  | 'ecritureDate'
  | 'compteNum'
  | 'compteLib'
  | 'compAuxNum'
  | 'compAuxLib'
  | 'pieceRef'
  | 'pieceDate'
  | 'ecritureLib'
  | 'debit'
  | 'credit'
  | 'ecritureLet'
  | 'dateLet'
  | 'validDate'
  | 'montantDevise'
  | 'idevise';

export interface ColonneFec {
  champ: ChampFec;
  entete: string;
}

export interface ContexteFec {
  /** Code du journal des à-nouveaux : ses écritures passent en premier. */
  journalANouveaux: string;
  /** Libellé de chaque compte, utilisé quand le libellé de la ligne est vide. */
  libellesComptes: Readonly<Record<string, string>>;
  /** Libellé de chaque journal (repli : le code). */
  libellesJournaux: Readonly<Record<string, string>>;
  /** Date de validation (AAAA-MM-JJ) de chaque écriture, par identifiant. */
  datesValidation: Readonly<Record<string, string>>;
}

export interface ResultatLignesFec {
  entete: string;
  lignes: string[];
  totalDebit: Centimes;
  totalCredit: Centimes;
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function dateValidation(e: Ecriture, contexte: ContexteFec): string {
  const date = contexte.datesValidation[e.id];
  if (date === undefined) throw new ErreurFec('date_invalide');
  return formaterDateFec(date); // AAAAMMJJ : refuse une date mal formée avant tout tri
}

function ordonner(valides: readonly Ecriture[], contexte: ContexteFec): Ecriture[] {
  const cle = (e: Ecriture): [number, string, string] => [
    e.journal === contexte.journalANouveaux ? 0 : 1,
    dateValidation(e, contexte),
    e.numero ?? '',
  ];
  return valides
    .map((e) => ({ e, k: cle(e) }))
    .sort((x, y) => x.k[0] - y.k[0] || comparer(x.k[1], y.k[1]) || x.k[2].localeCompare(y.k[2], 'fr', { numeric: true }))
    .map((x) => x.e);
}

export function lignesFec(
  ecritures: readonly Ecriture[],
  contexte: ContexteFec,
  colonnes: readonly ColonneFec[],
  options: OptionsFec,
): ResultatLignesFec {
  const entete = assemblerLigne(
    colonnes.map((c) => c.entete),
    options,
  );
  const lignes: string[] = [];
  let totalDebit = centimes(0);
  let totalCredit = centimes(0);
  const valides = ecritures.filter((e) => e.statut === 'valide');
  for (const e of ordonner(valides, contexte)) {
    const date = formaterDateFec(e.date);
    const validation = dateValidation(e, contexte);
    for (const l of e.lignes) {
      const libCompte = nettoyerLibelle(contexte.libellesComptes[l.compte] ?? '', l.compte, options);
      const valeurs: Record<ChampFec, string> = {
        journalCode: e.journal,
        journalLib: nettoyerLibelle(contexte.libellesJournaux[e.journal] ?? '', e.journal, options),
        ecritureNum: e.numero ?? '',
        ecritureDate: date,
        compteNum: l.compte,
        compteLib: libCompte,
        compAuxNum: l.auxiliaire ?? '',
        compAuxLib:
          l.auxiliaire === undefined
            ? ''
            : nettoyerLibelle(contexte.libellesComptes[l.auxiliaire] ?? '', l.auxiliaire, options),
        pieceRef: e.id,
        pieceDate: date,
        ecritureLib: nettoyerLibelle(l.libelle, libCompte, options),
        debit: formaterMontantFec(l.debit),
        credit: formaterMontantFec(l.credit),
        ecritureLet: '',
        dateLet: '',
        validDate: validation,
        montantDevise: '',
        idevise: '',
      };
      lignes.push(
        assemblerLigne(
          colonnes.map((c) => valeurs[c.champ]),
          options,
        ),
      );
      totalDebit = ajouter(totalDebit, l.debit);
      totalCredit = ajouter(totalCredit, l.credit);
    }
  }
  return { entete, lignes, totalDebit, totalCredit };
}

/** `123456782FEC20260331.txt`, ou `…_TRAVAIL.txt` tant que l'exercice est ouvert. */
export function nomFichierFec(parametres: {
  siren: string;
  dateCloture: string;
  travail: boolean;
}): string {
  if (!/^[0-9]{9}$/.test(parametres.siren)) throw new ErreurFec('siren_invalide');
  const date = formaterDateFec(parametres.dateCloture);
  return `${parametres.siren}FEC${date}${parametres.travail ? '_TRAVAIL' : ''}.txt`;
}
