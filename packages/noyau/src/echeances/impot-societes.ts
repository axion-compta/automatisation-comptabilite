// Échéances de l'impôt sur les sociétés : la table et la règle sont des arguments, aucune valeur légale ici.
import { ajouterMois, estDateValide, finDeMois } from '../dates/civiles.js';

export type CodeErreurEcheancesIs =
  | 'date_invalide'
  | 'parametre_invalide'
  | 'table_incoherente'
  | 'fenetre_absente'
  | 'table_ambigue'
  | 'jour_inexistant';

export class ErreurEcheancesIs extends Error {
  readonly code: CodeErreurEcheancesIs;
  constructor(code: CodeErreurEcheancesIs) {
    super(code);
    this.name = 'ErreurEcheancesIs';
    this.code = code;
  }
}

export type FenetreAcomptes = { debut: string; fin: string; echeances: string[] };
export type TableAcomptes = { fenetres: FenetreAcomptes[]; statut: string };
export type RegleSolde = {
  moisApres: number;
  jour: number;
  exceptions: { cloture: string; echeance: string; decalageAnnees: number }[];
  statut: string;
};

const ANNEE_BISSEXTILE = 2024;

function mmjjValide(texte: string): boolean {
  return typeof texte === 'string' && estDateValide(`${String(ANNEE_BISSEXTILE)}-${texte}`);
}

function exigerCloture(cloture: string): { annee: number; mmjj: string } {
  if (!estDateValide(cloture)) throw new ErreurEcheancesIs('date_invalide');
  return { annee: Number(cloture.slice(0, 4)), mmjj: cloture.slice(5) };
}

function contient(f: FenetreAcomptes, mmjj: string): boolean {
  return f.debut <= f.fin ? mmjj >= f.debut && mmjj <= f.fin : mmjj >= f.debut || mmjj <= f.fin;
}

function fenetreCoherente(f: FenetreAcomptes): boolean {
  return mmjjValide(f.debut) && mmjjValide(f.fin) && Array.isArray(f.echeances) && f.echeances.length > 0 && f.echeances.every(mmjjValide);
}

export function acomptesIs(
  dateCloture: string,
  table: TableAcomptes,
): { dates: string[]; aVerifier: boolean } {
  const { annee, mmjj } = exigerCloture(dateCloture);
  if (!table.fenetres.every(fenetreCoherente)) throw new ErreurEcheancesIs('table_incoherente');
  const trouvees = table.fenetres.filter((f) => contient(f, mmjj));
  const fenetre = trouvees[0];
  if (fenetre === undefined) throw new ErreurEcheancesIs('fenetre_absente');
  if (trouvees.length > 1) throw new ErreurEcheancesIs('table_ambigue');
  const dates = fenetre.echeances.map((e) => {
    const sameYear = `${String(annee)}-${e}`;
    const d = sameYear > dateCloture ? `${String(annee - 1)}-${e}` : sameYear;
    if (!estDateValide(d)) throw new ErreurEcheancesIs('table_incoherente');
    return d;
  });
  const triees = [...dates].sort();
  const ordreTable = triees.every((d, i) => d.slice(5) === fenetre.echeances[i]);
  if (!ordreTable || triees.some((d, i) => i > 0 && d === triees[i - 1])) {
    throw new ErreurEcheancesIs('table_incoherente');
  }
  return { dates: triees, aVerifier: table.statut !== 'valide' };
}

function entierNonNegatif(n: number): boolean {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
}

export function soldeIs(
  dateCloture: string,
  regle: RegleSolde,
): { date: string; aVerifier: boolean } {
  const { annee, mmjj } = exigerCloture(dateCloture);
  const aVerifier = regle.statut !== 'valide';
  const exception = regle.exceptions.find((x) => x.cloture === mmjj);
  if (exception !== undefined) {
    if (!Number.isSafeInteger(exception.decalageAnnees)) {
      throw new ErreurEcheancesIs('parametre_invalide');
    }
    const date = `${String(annee + exception.decalageAnnees)}-${exception.echeance}`;
    if (!estDateValide(date)) throw new ErreurEcheancesIs('jour_inexistant');
    return { date, aVerifier };
  }
  if (!entierNonNegatif(regle.moisApres) || !Number.isSafeInteger(regle.jour) || regle.jour < 1 || regle.jour > 31) {
    throw new ErreurEcheancesIs('parametre_invalide');
  }
  const arrivee = ajouterMois(dateCloture, regle.moisApres);
  if (regle.jour > Number(finDeMois(arrivee).slice(8))) {
    throw new ErreurEcheancesIs('jour_inexistant');
  }
  return { date: `${arrivee.slice(0, 8)}${String(regle.jour).padStart(2, '0')}`, aVerifier };
}
