// Devises : taux du jour (dernier publié) et écart de change proposé, jamais écrit.
import { centimes, convertir, type Arrondi, type Centimes } from '../argent/index.js';

export class ErreurDevise extends Error {
  override name = 'ErreurDevise';
  constructor(readonly code: 'taux_absent' | 'taux_ambigu' | 'date_invalide' | 'montant_invalide' | 'frais_incoherents') {
    super(code);
  }
}

export type LigneTaux = { date: string; devise: string; taux: bigint; source: string };
export type TauxUtilise = { taux: bigint; dateTaux: string; source: string };
export type Comptes = { gain: string; perte: string; frais: string };
export type EntreeChange = {
  sens: 'achat' | 'vente';
  montantOrigine: Centimes;
  devise: string;
  datePiece: string;
  eurBanque: Centimes;
  fraisEur: Centimes;
};
export type ResultatChange = {
  etat: 'propose';
  eurPiece: Centimes;
  frais: Centimes;
  ecart: Centimes;
  nature: 'gain' | 'perte' | 'aucun';
  comptePropose?: string;
  tauxUtilise: TauxUtilise;
};

function dateValide(d: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return false;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return t.toISOString().slice(0, 10) === d;
}
const montantOk = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

export function tauxAuJour(table: readonly LigneTaux[], devise: string, date: string): TauxUtilise {
  if (!dateValide(date)) throw new ErreurDevise('date_invalide');
  const lignes = table.filter((l) => l.devise === devise && l.date <= date);
  if (lignes.length === 0) throw new ErreurDevise('taux_absent');
  const recent = lignes.reduce((max, l) => (l.date > max ? l.date : max), '');
  const retenues = lignes.filter((l) => l.date === recent);
  const [unique] = retenues;
  if (retenues.length !== 1 || !unique) throw new ErreurDevise('taux_ambigu');
  return { taux: unique.taux, dateTaux: unique.date, source: unique.source };
}

export function ecartDeChange(
  e: EntreeChange,
  table: readonly LigneTaux[],
  comptes: Comptes,
  arrondi: Arrondi,
): ResultatChange {
  const tauxUtilise = tauxAuJour(table, e.devise, e.datePiece);
  if (![e.montantOrigine, e.eurBanque, e.fraisEur].every(montantOk)) throw new ErreurDevise('montant_invalide');
  const achat = e.sens === 'achat';
  if (achat && e.fraisEur > e.eurBanque) throw new ErreurDevise('frais_incoherents');
  const eurPiece = convertir(e.montantOrigine, tauxUtilise.taux, arrondi);
  const brut = achat ? e.eurBanque - e.fraisEur : e.eurBanque + e.fraisEur;
  const signe = achat ? brut - eurPiece : eurPiece - brut;
  const base = { etat: 'propose', eurPiece, frais: e.fraisEur, ecart: centimes(Math.abs(signe)), tauxUtilise } as const;
  if (signe === 0) return { ...base, nature: 'aucun' };
  // Achat payé plus cher = perte ; vente encaissée plus = gain.
  return signe > 0 ? { ...base, nature: 'perte', comptePropose: comptes.perte } : { ...base, nature: 'gain', comptePropose: comptes.gain };
}
