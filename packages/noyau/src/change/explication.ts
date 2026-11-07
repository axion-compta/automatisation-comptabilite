// Explication d'un écart de change : lecture seule, fonction pure, aucune écriture créée.
// Le premier niveau ne contient aucun numéro de compte ; le compte n'apparaît qu'au second niveau.

export type CodeErreurExplication = 'source_absente' | 'entree_invalide';

export class ErreurExplication extends Error {
  override name = 'ErreurExplication';
  readonly code: CodeErreurExplication;
  constructor(code: CodeErreurExplication, message: string) {
    super(message);
    this.code = code;
  }
}

export type SensEcart = 'gain' | 'perte' | 'aucun';

export interface TauxSource {
  tauxE8: number;
  source: string;
  date: string;
}

export interface EcartChange {
  /** Centimes, signé : positif = perte. */
  montant: number;
  devise: string;
}

export interface ExplicationEcart {
  sens: SensEcart;
  montant: number;
  devise: string;
  taux: readonly [TauxSource, TauxSource];
}

export interface ComptesChange {
  perte: string;
  gain: string;
}

function texteNonVide(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

function verifierTaux(t: TauxSource): TauxSource {
  if (!Number.isSafeInteger(t.tauxE8) || t.tauxE8 <= 0) {
    throw new ErreurExplication('entree_invalide', 'Taux invalide : ' + String(t.tauxE8));
  }
  if (!texteNonVide(t.source) || !texteNonVide(t.date)) {
    throw new ErreurExplication('source_absente', 'Pas d\'explication sans source ni date.');
  }
  return { tauxE8: t.tauxE8, source: t.source, date: t.date };
}

export function expliquerEcart(ecart: EcartChange, tauxPiece: TauxSource, tauxPaiement: TauxSource): ExplicationEcart {
  if (!Number.isSafeInteger(ecart.montant)) {
    throw new ErreurExplication('entree_invalide', 'Montant invalide : ' + String(ecart.montant));
  }
  const piece = verifierTaux(tauxPiece);
  const paiement = verifierTaux(tauxPaiement);
  const sens: SensEcart = ecart.montant > 0 ? 'perte' : ecart.montant < 0 ? 'gain' : 'aucun';
  return { sens, montant: Math.abs(ecart.montant), devise: ecart.devise, taux: [piece, paiement] };
}

/** Second niveau : le compte concerné, aucun si l'écart est nul. */
export function detailSecondNiveau(explication: ExplicationEcart, comptes: ComptesChange): { compte?: string } {
  if (explication.sens === 'aucun') return {};
  const compte = explication.sens === 'perte' ? comptes.perte : comptes.gain;
  if (!texteNonVide(compte)) {
    throw new ErreurExplication('entree_invalide', 'Compte absent.');
  }
  return { compte };
}
