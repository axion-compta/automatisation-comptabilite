// Régime de TVA d'une société, historisé : chaque changement est une nouvelle ligne datée.
// Aucun nom de formulaire ni date de bascule n'est écrit ici : tout vient de l'historique.

export type CodeErreurRegimeTva = 'regime_absent' | 'regime_ambigu' | 'date_anterieure' | 'periode_vide' | 'date_invalide';

export class ErreurRegimeTva extends Error {
  override name = 'ErreurRegimeTva';
  readonly code: CodeErreurRegimeTva;
  constructor(code: CodeErreurRegimeTva, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PeriodeRegime {
  effetDebut: string;
  /** Exclue ; null = période ouverte. */
  effetFin: string | null;
  regime: 'reel_normal' | 'reel_simplifie' | 'franchise' | 'non_assujetti';
  periodicite: 'mensuelle' | 'trimestrielle' | 'annuelle';
  exigibiliteServices: 'encaissements' | 'option_debits';
  formulaire: string;
}

function verifierDate(date: string): void {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) {
    const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const d = new Date(Date.UTC(annee, mois - 1, jour));
    if (d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour) return;
  }
  throw new ErreurRegimeTva('date_invalide', `Date invalide : « ${String(date)} » (attendu AAAA-MM-JJ).`);
}

function verifierPeriode(p: PeriodeRegime): void {
  verifierDate(p.effetDebut);
  if (p.effetFin !== null) {
    verifierDate(p.effetFin);
    if (p.effetFin <= p.effetDebut) {
      throw new ErreurRegimeTva('periode_vide', 'La fin de période doit être postérieure à son début.');
    }
  }
}

function parDebut(historique: readonly PeriodeRegime[]): PeriodeRegime[] {
  return [...historique].sort((a, b) => (a.effetDebut < b.effetDebut ? -1 : a.effetDebut > b.effetDebut ? 1 : 0));
}

/** Régime en vigueur à une date. Aucune ligne : regime_absent ; plusieurs : regime_ambigu. */
export function regimeAuJour(historique: readonly PeriodeRegime[], date: string): PeriodeRegime {
  verifierDate(date);
  historique.forEach(verifierPeriode);
  const actives = historique.filter((p) => p.effetDebut <= date && (p.effetFin === null || date < p.effetFin));
  const [premiere, ...reste] = actives;
  if (premiere === undefined) {
    throw new ErreurRegimeTva('regime_absent', `Aucun régime de TVA en vigueur au ${date}.`);
  }
  if (reste.length > 0) {
    throw new ErreurRegimeTva('regime_ambigu', `Plusieurs régimes de TVA en vigueur au ${date}.`);
  }
  return premiere;
}

/** Ajoute une ligne datée sans modifier la liste reçue : la ligne en vigueur est close à la date de la nouvelle. */
export function ajouterPeriodeRegime(historique: readonly PeriodeRegime[], nouvelle: PeriodeRegime): PeriodeRegime[] {
  verifierPeriode(nouvelle);
  historique.forEach(verifierPeriode);
  const triee = parDebut(historique).map((p) => ({ ...p }));
  const derniere = triee[triee.length - 1];
  if (derniere !== undefined) {
    if (nouvelle.effetDebut < derniere.effetDebut) {
      throw new ErreurRegimeTva('date_anterieure', 'La nouvelle ligne commence avant la dernière ligne connue.');
    }
    if (nouvelle.effetDebut === derniere.effetDebut) {
      throw new ErreurRegimeTva('periode_vide', 'La nouvelle ligne rendrait la précédente vide.');
    }
    if (derniere.effetFin === null || derniere.effetFin > nouvelle.effetDebut) {
      derniere.effetFin = nouvelle.effetDebut;
    }
  }
  return [...triee, { ...nouvelle }];
}

/** Vrai si le régime fait partie de ceux que le moteur sait traiter (sinon : non_calculee, regime_non_traite). */
export function estTraite(regime: PeriodeRegime, regimesTraites: readonly string[]): boolean {
  return regimesTraites.includes(regime.regime);
}
