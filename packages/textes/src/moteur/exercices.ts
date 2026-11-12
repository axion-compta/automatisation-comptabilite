// Textes de l'année comptable (vouvoiement). Aucune dépendance au noyau.
const ANNEE = /^\d{4}$/;

export const PHRASE_DATES_MODIFIABLES = "Vous pouvez changer ces dates tant qu'aucune écriture n'est validée.";
export const PHRASE_DATES_VERROUILLEES = 'Une écriture est validée : ces dates ne peuvent plus changer.';

/** « Du 1er janvier 2026 au 31 décembre 2026 » : dates proposées par défaut. */
export function phraseDatesParDefaut(annee: number): string {
  const a = String(annee);
  if (!ANNEE.test(a)) throw new Error('Année invalide : ' + a);
  return 'Du 1er janvier ' + a + ' au 31 décembre ' + a;
}
