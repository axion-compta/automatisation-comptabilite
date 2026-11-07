// Bilan et compte de résultat à partir d'une affectation aux postes ; aucune valeur légale ici.
import { type Centimes, ajouter, centimes, pourcentage, soustraire } from '../argent/index.js';
import type { PosteAffecte, ResultatAffectation } from './postes.js';

export type CodeErreurBilan = 'fraction_invalide' | 'montant_invalide' | 'poste_resultat_invalide';

export class ErreurBilan extends Error {
  readonly code: CodeErreurBilan;
  constructor(code: CodeErreurBilan) {
    super(code);
    this.name = 'ErreurBilan';
    this.code = code;
  }
}

export interface EtatsFinanciers {
  compteResultat: { produits: Centimes; charges: Centimes; resultat: Centimes };
  bilan: { actif: Centimes; passifHorsResultat: Centimes; resultat: Centimes; passif: Centimes };
  postes: { poste: string; cote: PosteAffecte['cote']; montant: Centimes }[];
  controles: { id: 'ETAT-01' | 'ETAT-02'; ok: boolean; ecartCentimes: Centimes }[];
  variations?: { poste: string; cote: PosteAffecte['cote']; n: Centimes; n1: Centimes }[];
}

const ZERO = centimes(0);
const PLEIN = 10000;
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function total(postes: readonly PosteAffecte[], cote: PosteAffecte['cote']): Centimes {
  return postes.filter((p) => p.cote === cote).reduce((s, p) => ajouter(s, p.montant), ZERO);
}

function controle(id: 'ETAT-01' | 'ETAT-02', a: Centimes, b: Centimes): EtatsFinanciers['controles'][number] {
  const ecartCentimes = soustraire(a, b);
  return { id, ok: ecartCentimes === 0, ecartCentimes };
}

export function etatsFinanciers(
  affectation: ResultatAffectation,
  options: { posteResultat: string; precedent?: EtatsFinanciers },
): EtatsFinanciers {
  const { posteResultat, precedent } = options;
  const existant = affectation.postes.filter((p) => p.poste === posteResultat);
  if (posteResultat === '' || existant.some((p) => p.cote !== 'passif')) throw new ErreurBilan('poste_resultat_invalide');
  const produits = total(affectation.postes, 'produits');
  const charges = total(affectation.postes, 'charges');
  const resultat = soustraire(produits, charges);
  const passifHorsResultat = total(affectation.postes, 'passif');
  const actif = total(affectation.postes, 'actif');
  const postes: EtatsFinanciers['postes'] = affectation.postes
    .filter((p) => p.poste !== posteResultat)
    .map((p) => ({ poste: p.poste, cote: p.cote, montant: p.montant }));
  postes.push({ poste: posteResultat, cote: 'passif', montant: ajouter(total(existant, 'passif'), resultat) });
  postes.sort((a, b) => comparer(a.poste, b.poste) || comparer(a.cote, b.cote));
  const etats: EtatsFinanciers = {
    compteResultat: { produits, charges, resultat },
    bilan: { actif, passifHorsResultat, resultat, passif: ajouter(passifHorsResultat, resultat) },
    postes,
    controles: [],
  };
  etats.controles = [
    controle('ETAT-01', etats.bilan.actif, etats.bilan.passif),
    controle('ETAT-02', etats.bilan.resultat, etats.compteResultat.resultat),
  ];
  if (precedent !== undefined) {
    const cle = (p: { poste: string; cote: string }) => `${p.cote}|${p.poste}`;
    const avant = new Map(precedent.postes.map((p) => [cle(p), p.montant]));
    const apres = new Map(postes.map((p) => [cle(p), p.montant]));
    const tous = [...postes, ...precedent.postes.filter((p) => !apres.has(cle(p)))];
    etats.variations = tous
      .map((p) => ({ poste: p.poste, cote: p.cote, n: apres.get(cle(p)) ?? ZERO, n1: avant.get(cle(p)) ?? ZERO }))
      .sort((a, b) => comparer(a.poste, b.poste) || comparer(a.cote, b.cote));
  }
  return etats;
}

/** Vrai si les capitaux propres sont strictement sous la fraction (en points de base) du capital. */
export function capitauxPropresSousSeuil(
  montants: { capitauxPropres: Centimes; capital: Centimes },
  fractionPointsDeBase: number,
): boolean {
  const { capitauxPropres, capital } = montants;
  if (!Number.isSafeInteger(fractionPointsDeBase) || fractionPointsDeBase < 0 || fractionPointsDeBase > PLEIN) {
    throw new ErreurBilan('fraction_invalide');
  }
  if (!Number.isSafeInteger(capitauxPropres) || !Number.isSafeInteger(capital) || capital < 0) {
    throw new ErreurBilan('montant_invalide');
  }
  // Arrondi vers le haut : pour des entiers, « capitaux < ceil(x) » équivaut à « capitaux < x ».
  return capitauxPropres < pourcentage(capital, fractionPointsDeBase, 'superieur');
}
