// Mode de travail : trois valeurs fermées, portées par la société et, en surcharge, par l'exercice.

export const MODES_TRAVAIL = ['autonome', 'saisie_seule', 'expert_complet'] as const;

export type ModeTravail = (typeof MODES_TRAVAIL)[number];

export class ErreurModeTravail extends Error {
  readonly code = 'mode_inconnu';
  constructor() {
    super('Mode de travail inconnu.');
    this.name = 'ErreurModeTravail';
  }
}

export function lireModeTravail(valeur: unknown): ModeTravail {
  const trouve = MODES_TRAVAIL.find((m) => m === valeur);
  if (trouve === undefined) throw new ErreurModeTravail();
  return trouve;
}

export function modeDeLExercice(
  societe: { modeTravail: ModeTravail },
  exercice?: { modeTravail?: ModeTravail },
): ModeTravail {
  return exercice?.modeTravail ?? societe.modeTravail;
}
