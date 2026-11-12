// Saisie manuelle rapide : une écriture en brouillon et des propositions (compte, TVA), sans rien valider.
// Fonctions pures. Mêmes lignes que la voie du chat : charge HT, TVA déductible, contrepartie TTC.
import { ajouter, centimes, fraction, pourcentage, soustraire, type Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';
import { ErreurEcriture, type Ecriture, type LigneEcriture } from './modele.js';

export type CodeErreurSaisie = 'montant_invalide' | 'date_invalide' | 'libelle_vide' | 'compte_manquant' | 'compte_inconnu' | 'taux_inconnu';

export class ErreurSaisie extends Error {
  override name = 'ErreurSaisie';
  constructor(readonly code: CodeErreurSaisie) {
    super(code);
  }
}

export type EntreeSaisie = {
  readonly id: string;
  readonly date: string;
  readonly libelle: string;
  readonly montantTtc: Centimes;
  /** Compte de charge ; à défaut, celui que l'historique des libellés propose. */
  readonly compte?: string | undefined;
  readonly tauxTvaPdb: number;
  /** HT saisi en plus du TTC : la TVA recalculée dessus doit retomber sur le TTC. */
  readonly montantHt?: Centimes;
};
export type PlanSaisie = {
  readonly journal: string;
  readonly contrepartie: string;
  readonly comptes: readonly string[];
  readonly historique: readonly { readonly libelle: string; readonly compte: string }[];
};
export type TauxTva = readonly { readonly pointsDeBase: number; readonly compteTva: string }[];
export type ResultatSaisie = {
  readonly ecriture: Ecriture;
  readonly propositions: {
    readonly compte?: string | undefined;
    readonly tva: { readonly pointsDeBase: number; readonly compteTva: string; readonly montant: Centimes };
  };
};

const cle = (libelle: string): string => libelle.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Compte le plus fréquent pour ce libellé ; une égalité ne propose rien. */
function compteDepuisHistorique(libelle: string, historique: PlanSaisie['historique']): string | undefined {
  const nombres = new Map<string, number>();
  for (const h of historique) if (cle(h.libelle) === cle(libelle)) nombres.set(h.compte, (nombres.get(h.compte) ?? 0) + 1);
  const tri = [...nombres.entries()].sort((a, b) => b[1] - a[1]);
  const [premier, second] = tri;
  if (premier === undefined || (second !== undefined && second[1] === premier[1])) return undefined;
  return premier[0];
}

export function saisieRapide(entree: EntreeSaisie, plan: PlanSaisie, taux: TauxTva): ResultatSaisie {
  const ttc = entree.montantTtc;
  if (!Number.isSafeInteger(ttc) || ttc <= 0) throw new ErreurSaisie('montant_invalide');
  if (entree.montantHt !== undefined && (!Number.isSafeInteger(entree.montantHt) || entree.montantHt < 0)) throw new ErreurSaisie('montant_invalide');
  if (!estDateValide(entree.date)) throw new ErreurSaisie('date_invalide');
  if (entree.libelle.trim() === '') throw new ErreurSaisie('libelle_vide');
  const t = taux.find((x) => x.pointsDeBase === entree.tauxTvaPdb);
  if (t === undefined) throw new ErreurSaisie('taux_inconnu');
  const proposeCompte = compteDepuisHistorique(entree.libelle, plan.historique);
  const compte = entree.compte ?? proposeCompte;
  if (compte === undefined) throw new ErreurSaisie('compte_manquant');
  if (!plan.comptes.includes(compte)) throw new ErreurSaisie('compte_inconnu');
  // TVA extraite du TTC (ou calculée sur le HT saisi), arrondie au centime.
  const ht = entree.montantHt ?? fraction(ttc, 10000, 10000 + t.pointsDeBase, 'demi-superieur');
  const tva = entree.montantHt === undefined ? soustraire(ttc, ht) : pourcentage(ht, t.pointsDeBase, 'demi-superieur');
  if (ajouter(ht, tva) !== ttc) throw new ErreurEcriture('desequilibre', 'HT et TVA ne retombent pas sur le TTC.');
  const ligne = (c: string, debit: Centimes, credit: Centimes): LigneEcriture => ({ compte: c, libelle: entree.libelle, debit, credit });
  const zero = centimes(0);
  const lignes: LigneEcriture[] = [
    ligne(compte, ht, zero),
    ...(tva > 0 ? [ligne(t.compteTva, tva, zero)] : []),
    ligne(plan.contrepartie, zero, ttc),
  ];
  const ecriture: Ecriture = { id: entree.id, journal: plan.journal, date: entree.date, statut: 'brouillon', lignes };
  return {
    ecriture,
    propositions: {
      ...(proposeCompte === undefined ? {} : { compte: proposeCompte }),
      tva: { pointsDeBase: t.pointsDeBase, compteTva: t.compteTva, montant: tva },
    },
  };
}
