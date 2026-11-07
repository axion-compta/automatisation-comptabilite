// Cas sûr : fonction pure, sans appel à un modèle. Toutes les conditions doivent être vraies.
// Les valeurs de réglage arrivent en arguments (paramètres par société) ; rien n'est fixé ici.

export type CodeRaison =
  | 'nature_jamais_sure'
  | 'lecture_douteuse'
  | 'fournisseur_peu_valide'
  | 'anomalie_ouverte'
  | 'montant_au_seuil_ou_plus'
  | 'fournisseur_hors_union'
  | 'tva_en_doute'
  | 'compte_absent';

export class ErreurCasSur extends Error {
  override name = 'ErreurCasSur';
  readonly code: 'parametres_invalides' | 'proposition_invalide';
  constructor(code: 'parametres_invalides' | 'proposition_invalide', message: string) {
    super(message);
    this.code = code;
  }
}

export interface Proposition {
  id: string;
  nature:
    | 'piece' | 'paiement' | 'virement' | 'prelevement' | 'remboursement'
    | 'declaration' | 'cloture' | 'fin_annee' | 'suppression' | 'envoi';
  confiance: 'sur' | 'probable' | 'doute';
  champsDouteux: number;
  fournisseurId: string | null;
  compteCharge: string | null;
  montantTtcCentimes: number;
  tvaEnDoute: boolean;
}

export interface ContexteCasSur {
  /** Clé : fournisseur|compte. */
  validationsParFournisseurEtCompte: ReadonlyMap<string, number>;
  /** Identifiants de pièce ou de fournisseur. */
  anomaliesOuvertes: ReadonlySet<string>;
  fournisseurHorsUnion: ReadonlySet<string>;
}

export interface ParametresCasSur {
  montantMaxCentimes: number;
  validationsMinFournisseur: number;
}

function entierPositifOuNul(v: number): boolean {
  return Number.isSafeInteger(v) && v >= 0;
}

/** Sûre si aucune raison n'est levée ; toutes les raisons sont listées, dans un ordre fixe. */
export function estCasSur(
  p: Proposition,
  ctx: ContexteCasSur,
  params: ParametresCasSur,
): { sur: boolean; raisons: readonly CodeRaison[] } {
  if (!entierPositifOuNul(params.montantMaxCentimes) || !entierPositifOuNul(params.validationsMinFournisseur)) {
    throw new ErreurCasSur('parametres_invalides', 'Les paramètres doivent être des entiers positifs ou nuls');
  }
  if (!Number.isSafeInteger(p.montantTtcCentimes) || !entierPositifOuNul(p.champsDouteux)) {
    throw new ErreurCasSur('proposition_invalide', 'Montant entier et nombre de champs douteux positif attendus');
  }

  const raisons: CodeRaison[] = [];
  if (p.nature !== 'piece') raisons.push('nature_jamais_sure');
  if (p.confiance !== 'sur' || p.champsDouteux > 0) raisons.push('lecture_douteuse');

  if (p.fournisseurId === null) {
    raisons.push('fournisseur_peu_valide');
  } else if (p.compteCharge !== null) {
    const validations = ctx.validationsParFournisseurEtCompte.get(p.fournisseurId + '|' + p.compteCharge) ?? 0;
    if (validations < params.validationsMinFournisseur) raisons.push('fournisseur_peu_valide');
  }

  if (ctx.anomaliesOuvertes.has(p.id) || (p.fournisseurId !== null && ctx.anomaliesOuvertes.has(p.fournisseurId))) {
    raisons.push('anomalie_ouverte');
  }
  if (Math.abs(p.montantTtcCentimes) >= params.montantMaxCentimes) raisons.push('montant_au_seuil_ou_plus');
  if (p.fournisseurId !== null && ctx.fournisseurHorsUnion.has(p.fournisseurId)) raisons.push('fournisseur_hors_union');
  if (p.tvaEnDoute) raisons.push('tva_en_doute');
  if (p.compteCharge === null) raisons.push('compte_absent');

  return { sur: raisons.length === 0, raisons };
}
