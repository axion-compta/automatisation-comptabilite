// Paramètres du banc du profil 2 (spec 09 §05 : valeurs du tableau de 03, statut `valide` pour le banc seulement).
// Unités : montants en centimes. Relevé du 06/11/2026 (fiches L09-T26 et L09-T27).
export type ParametreTest2 = {
  cle: string;
  valeur: unknown;
  source_url: string;
  date_releve: '2026-11-06';
  statut: 'valide' | 'a_verifier';
};

const BOFIP = 'https://bofip.impots.gouv.fr/';
const LEGI = 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049216681';
const FRANCHISE = 'https://entreprendre.service-public.gouv.fr/vosdroits/F21746';
const p = (cle: string, valeur: unknown, source_url: string, statut: ParametreTest2['statut'] = 'valide'): ParametreTest2 => ({
  cle,
  valeur,
  source_url,
  date_releve: '2026-11-06',
  statut,
});

export const PARAMETRES_TEST_2: readonly ParametreTest2[] = [
  p('tva.option_debits.effet', { regle: 'premier_jour_mois_suivant' }, BOFIP),
  p('micro_comptable.seuils', { bilan: 45000000, ca: 90000000, effectif: 10, criteres: 2 }, LEGI),
  p('tva.franchise.prorata_creation', { joursAnnee: 365, finIncluse: true }, FRANCHISE),
  p('tva.franchise.seuil.services', { base: 3750000, majore: 4125000 }, FRANCHISE),
];

/** Même règle de prorata, mais au statut `a_verifier` (P25, dernier cas). */
export const PRORATA_A_VERIFIER: ParametreTest2 = p('tva.franchise.prorata_creation', { joursAnnee: 365, finIncluse: true }, FRANCHISE, 'a_verifier');

export function param2<T>(cle: string): T {
  const ligne = PARAMETRES_TEST_2.find((l) => l.cle === cle);
  if (ligne === undefined || ligne.statut !== 'valide') throw new Error('parametre_de_test_absent: ' + cle);
  return ligne.valeur as T;
}
