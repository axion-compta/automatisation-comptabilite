// Choix du taux de change : parité fixe, puis taux BCE, puis taux saisi (à vérifier). Aucun délai en dur.
import { fraction } from '../argent/index.js';
import { ajouterJours, comparerDates, estDateValide, jourDeSemaine } from '../dates/civiles.js';

export type CodeErreurChange =
  | 'date_invalide'
  | 'parametre_invalide'
  | 'taux_invalide'
  | 'devise_invalide'
  | 'source_obligatoire'
  | 'saisie_anonyme'
  | 'regle_invalide';

export class ErreurChange extends Error {
  readonly code: CodeErreurChange;
  readonly statutHttp?: number;
  constructor(code: CodeErreurChange, statutHttp?: number) {
    super(code);
    this.name = 'ErreurChange';
    this.code = code;
    if (statutHttp !== undefined) this.statutHttp = statutHttp;
  }
}

export type TauxBce = { devise: string; date: string; tauxE8: number };
export type TauxSaisi = TauxBce & {
  sourceTexte: string;
  saisiPar: string;
  statut: 'a_verifier' | 'ok';
};
export type Parite = {
  devise: string;
  tauxE8: number;
  effetDebut: string;
  effetFin: string | null;
  source: string;
  statut: 'a_verifier' | 'ok';
};
export type SourcesTaux = { bce: TauxBce[]; saisis: TauxSaisi[]; parites: Parite[] };
export type TauxResolu =
  | { ok: false; code: 'taux_manquant' }
  | {
      ok: true;
      tauxE8: number;
      origine: 'parite_fixe' | 'bce' | 'saisi';
      dateDuTaux: string;
      aVerifier: boolean;
    };
function tauxValide(t: unknown): t is number {
  return typeof t === 'number' && Number.isSafeInteger(t) && t > 0;
}
function exigerDate(d: string): void {
  if (!estDateValide(d)) throw new ErreurChange('date_invalide');
}
function succes(tauxE8: number, origine: 'parite_fixe' | 'bce' | 'saisi', dateDuTaux: string, aVerifier: boolean): TauxResolu {
  if (!tauxValide(tauxE8)) throw new ErreurChange('taux_invalide');
  return { ok: true, tauxE8, origine, dateDuTaux, aVerifier };
}

export function resoudreTaux(
  demande: { devise: string; date: string },
  sources: SourcesTaux,
  joursMax: number,
): TauxResolu {
  exigerDate(demande.date);
  if (!Number.isSafeInteger(joursMax) || joursMax < 0) throw new ErreurChange('parametre_invalide');
  const { devise, date } = demande;
  const parite = sources.parites.find(
    (p) =>
      p.devise === devise &&
      comparerDates(p.effetDebut, date) <= 0 &&
      (p.effetFin === null || comparerDates(date, p.effetFin) < 0),
  );
  if (parite !== undefined) return succes(parite.tauxE8, 'parite_fixe', date, parite.statut !== 'ok');
  const plancher = ajouterJours(date, -joursMax);
  let bce: TauxBce | undefined;
  for (const t of sources.bce) {
    if (t.devise !== devise || comparerDates(t.date, date) > 0 || comparerDates(t.date, plancher) < 0) continue;
    if (bce === undefined || comparerDates(t.date, bce.date) > 0) bce = t;
  }
  if (bce !== undefined) return succes(bce.tauxE8, 'bce', bce.date, false);
  const saisi = sources.saisis.find((s) => s.devise === devise && s.date === date);
  if (saisi !== undefined) return succes(saisi.tauxE8, 'saisi', date, saisi.statut !== 'ok');
  return { ok: false, code: 'taux_manquant' };
}
function vide(texte: unknown): boolean {
  return typeof texte !== 'string' || texte.trim() === '';
}

export function saisirTaux(entree: {
  devise: string;
  date: string;
  tauxE8: number;
  sourceTexte: string;
  saisiPar: string;
}): TauxSaisi {
  if (vide(entree.devise)) throw new ErreurChange('devise_invalide');
  exigerDate(entree.date);
  if (!tauxValide(entree.tauxE8)) throw new ErreurChange('taux_invalide');
  if (vide(entree.sourceTexte)) throw new ErreurChange('source_obligatoire', 422);
  if (vide(entree.saisiPar)) throw new ErreurChange('saisie_anonyme');
  return { ...entree, statut: 'a_verifier' };
}

export function validationAutorisee(taux: Extract<TauxResolu, { ok: true }>): boolean {
  return taux.aVerifier === false;
}

// Règle du taux de la BCE, lue d'un paramètre daté (heure de publication en UTC, arrondi, jour sans cotation).
export type ModeArrondi = 'demi_loin_de_zero' | 'demi_pair';
export type RegleChange = {
  heurePublicationUtc: string;
  arrondi: ModeArrondi;
  jourSansCotation: 'veille_ouvree';
};
const MODES_ARGENT = { demi_loin_de_zero: 'demi-superieur', demi_pair: 'demi-pair' } as const;
const MODES: readonly string[] = Object.keys(MODES_ARGENT);
const UNITE_E8 = 10 ** 8; // échelle des huit décimales
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

function exigerRegle(regle: RegleChange): void {
  if (
    typeof regle !== 'object' ||
    regle === null ||
    typeof regle.heurePublicationUtc !== 'string' ||
    !HEURE.test(regle.heurePublicationUtc) ||
    !MODES.includes(regle.arrondi) ||
    regle.jourSansCotation !== 'veille_ouvree'
  ) {
    throw new ErreurChange('regle_invalide');
  }
}
const estOuvre = (date: string): boolean => jourDeSemaine(date) <= 5;
function veilleOuvree(date: string): string {
  let d = ajouterJours(date, -1);
  while (!estOuvre(d)) d = ajouterJours(d, -1);
  return d;
}

/**
 * Date du taux de la BCE à appliquer : le jour coté de l'opération s'il est déjà publié à l'instant de consultation
 * (UTC, AAAA-MM-JJTHH:MMZ), sinon le dernier jour publié. Limite : seuls samedi et dimanche sont sans cotation ;
 * les jours fériés de fermeture TARGET sont repris par `resoudreTaux` (délai en jours, taux manquant).
 */
export function dateDuTauxApplicable(dateOperation: string, instantConsultation: string, regle: RegleChange): string {
  exigerDate(dateOperation);
  exigerRegle(regle);
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})Z$/.exec(instantConsultation);
  if (m === null || !estDateValide(m[1]!) || !HEURE.test(m[2]!)) throw new ErreurChange('date_invalide');
  const jourCote = estOuvre(dateOperation) ? dateOperation : veilleOuvree(dateOperation);
  const jourInstant = estOuvre(m[1]!) ? m[1]! : veilleOuvree(m[1]!);
  const publie = m[2]! < regle.heurePublicationUtc && jourInstant === m[1]! ? veilleOuvree(jourInstant) : jourInstant;
  return publie < jourCote ? publie : jourCote;
}

/** Montant en centimes de devise x taux (8 décimales) → centimes d'euro, arrondi selon la règle. */
export function convertirAuCentime(montantDevise: number, tauxE8: number, regle: RegleChange): number {
  if (!Number.isSafeInteger(montantDevise)) throw new ErreurChange('parametre_invalide');
  if (!tauxValide(tauxE8)) throw new ErreurChange('taux_invalide');
  exigerRegle(regle);
  return fraction(BigInt(montantDevise), tauxE8, UNITE_E8, MODES_ARGENT[regle.arrondi]);
}

type LigneRegle = { cle: string; pays: string; effet_debut: string; effet_fin: string | null; statut: string; valeur: string };

/** Règle en vigueur à `date` dans une liste de lignes datées (clé `change.bce.regle`, fin exclue, lignes retirées ignorées). */
export function regleChangeAuJour(lignes: readonly LigneRegle[], pays: string, date: string): RegleChange {
  exigerDate(date);
  const trouvees = lignes.filter(
    (l) =>
      l.cle === 'change.bce.regle' &&
      l.pays === pays &&
      l.statut !== 'retire' &&
      l.effet_debut <= date &&
      (l.effet_fin === null || date < l.effet_fin),
  );
  if (trouvees.length !== 1) throw new ErreurChange('regle_invalide');
  let regle: RegleChange;
  try {
    regle = JSON.parse(trouvees[0]!.valeur) as RegleChange;
  } catch {
    throw new ErreurChange('regle_invalide');
  }
  exigerRegle(regle);
  return regle;
}
