// Lecture des paramètres légaux « au jour D » (spec 13, R10, R11, R13).
// Convention : ici la date de fin est EXCLUE (effet_debut <= date < effet_fin).
// `valeurALaDate` (index.ts) garde au contraire une fin INCLUSE ; les deux
// conventions coexistent volontairement (cette dernière reste pour L00-T13).
// Aucune valeur par défaut : pas de ligne = erreur. Aucune valeur légale ici.
import { z } from 'zod';

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');

export const StatutParametre = z.enum(['non_verifie', 'a_verifier', 'valide', 'retire']);
export type StatutParametre = z.infer<typeof StatutParametre>;

export const ParametreLegal = z.object({
  cle: z.string().min(1),
  pays: z.string().length(2),
  valeur: z.string(),
  effet_debut: dateIso,
  effet_fin: dateIso.nullable(),
  statut: StatutParametre,
  source: z.string().min(1),
  date_releve: dateIso,
});
export type ParametreLegal = z.infer<typeof ParametreLegal>;

export type CodeErreurParametre = 'parametre_absent' | 'parametre_ambigu';

export class ErreurParametre extends Error {
  readonly code: CodeErreurParametre;
  constructor(code: CodeErreurParametre, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurParametre';
    this.code = code;
  }
}

function enVigueur(p: ParametreLegal, cle: string, pays: string, date: string): boolean {
  return (
    p.statut !== 'retire' &&
    p.cle === cle &&
    p.pays === pays &&
    p.effet_debut <= date &&
    (p.effet_fin === null || date < p.effet_fin)
  );
}

/** Ligne en vigueur à `date` (fin exclue). Absente : parametre_absent ; deux lignes : parametre_ambigu. */
export function parametreAuJour(
  liste: readonly ParametreLegal[],
  cle: string,
  pays: string,
  date: string,
): ParametreLegal {
  const lignes = liste.filter((p) => enVigueur(p, cle, pays, date));
  const premiere = lignes[0];
  if (premiere === undefined) throw new ErreurParametre('parametre_absent', `${cle} ${pays} ${date}`);
  if (lignes.length > 1) throw new ErreurParametre('parametre_ambigu', `${cle} ${pays} ${date}`);
  return premiere;
}

/** Seul un paramètre `valide` sert dans un document officiel ou un contrôle bloquant. */
export function utilisablePourOfficiel(ligne: ParametreLegal): boolean {
  return ligne.statut === 'valide';
}

/** Nouvelle liste : la ligne en vigueur au début de `nouvelle` est close à cette date. La liste reçue reste intacte. */
export function ajouterVersion(
  liste: readonly ParametreLegal[],
  nouvelle: ParametreLegal,
): ParametreLegal[] {
  const close = liste.map((p) =>
    enVigueur(p, nouvelle.cle, nouvelle.pays, nouvelle.effet_debut) ? { ...p, effet_fin: nouvelle.effet_debut } : { ...p },
  );
  return [...close, { ...nouvelle }];
}
