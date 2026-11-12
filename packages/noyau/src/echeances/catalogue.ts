// Catalogue des échéances : délais et conditions sont des arguments (paquet signé), aucune valeur légale ici.
import { ajouterJours, ajouterMois, estDateValide } from '../dates/civiles.js';
import { type Calendrier, type RegleReport, reporter } from './jours-ouvres.js';

export class ErreurCatalogue extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = 'ErreurCatalogue';
    this.code = code;
  }
}

export type Ancrage = 'creation' | 'cloture' | 'annee_civile' | 'periode';
export type NiveauEcheance = 'preparee' | 'alerte' | 'rappel_seul';
export type ActionRappel = 'plus_tard' | 'moins_tot' | 'ne_plus_rappeler';

export interface TypeEcheance {
  code: string;
  ancrage: Ancrage;
  decalage: { mois: number; jours: number };
  report: RegleReport;
  condition: { formes?: string[]; avecSalaries?: boolean; avecVehicule?: boolean; regimesTva?: string[] };
  statutSource: 'verifie' | 'non_verifie';
  niveau: NiveauEcheance;
  rappelsJours: number[];
  alerteJours?: number;
  legale: boolean;
  /** Source de la date (lien ou référence) ; absente = rien n'est affirmé. */
  source?: string;
  /** Date (AAAA-MM-JJ) à laquelle la source a été relevée ; absente = « date à vérifier ». */
  releveLe?: string;
}

export interface ProfilEcheances {
  forme?: string;
  avecSalaries: boolean;
  avecVehicule: boolean;
  regimeTva?: string;
}

export interface Ancres {
  creation?: string;
  clotures: string[];
  anneesCiviles: number[];
  finsDePeriode: string[];
}

export interface Echeance {
  code: string;
  dateLimite: string;
  dateAVerifier: boolean;
  rappels: string[];
  alerte?: string;
  niveau: NiveauEcheance;
  source?: string;
  releveLe?: string;
}

const ANCRAGES: readonly string[] = ['creation', 'cloture', 'annee_civile', 'periode'];
const NIVEAUX: readonly string[] = ['preparee', 'alerte', 'rappel_seul'];
const REPORTS: readonly string[] = ['suivant', 'precedent', 'aucun'];
const SOURCES: readonly string[] = ['verifie', 'non_verifie'];
const ACTIONS: readonly string[] = ['plus_tard', 'moins_tot', 'ne_plus_rappeler'];
const LONGUEUR_ANNEE = 4;

const positif = (n: unknown): boolean => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function verifierType(t: TypeEcheance): void {
  const ok = t.code !== '' && ANCRAGES.includes(t.ancrage) && NIVEAUX.includes(t.niveau);
  if (!ok || !REPORTS.includes(t.report) || !SOURCES.includes(t.statutSource) || typeof t.legale !== 'boolean') {
    throw new ErreurCatalogue('type_invalide');
  }
  if (t.source !== undefined && t.source === '') throw new ErreurCatalogue('source_invalide');
  if (t.releveLe !== undefined && !estDateValide(t.releveLe)) throw new ErreurCatalogue('releve_invalide');
  if (!Number.isSafeInteger(t.decalage.mois) || !Number.isSafeInteger(t.decalage.jours)) {
    throw new ErreurCatalogue('decalage_invalide');
  }
  if (!t.rappelsJours.every(positif) || (t.alerteJours !== undefined && !positif(t.alerteJours))) {
    throw new ErreurCatalogue('rappel_invalide');
  }
}

export function conditionRemplie(c: TypeEcheance['condition'], p: ProfilEcheances): boolean {
  const dans = (l: string[] | undefined, v: string | undefined) => l === undefined || (v !== undefined && l.includes(v));
  const egal = (a: boolean | undefined, b: boolean) => a === undefined || a === b;
  return (
    dans(c.formes, p.forme) &&
    dans(c.regimesTva, p.regimeTva) &&
    egal(c.avecSalaries, p.avecSalaries) &&
    egal(c.avecVehicule, p.avecVehicule)
  );
}

function ancresDe(ancrage: Ancrage, a: Ancres): string[] {
  const annee = (n: number) => (positif(n) ? `${String(n).padStart(LONGUEUR_ANNEE, '0')}-12-31` : '');
  const brut = {
    creation: a.creation === undefined ? [] : [a.creation],
    cloture: a.clotures,
    annee_civile: a.anneesCiviles.map(annee),
    periode: a.finsDePeriode,
  }[ancrage];
  if (!brut.every((d) => estDateValide(d))) throw new ErreurCatalogue('ancre_invalide');
  return brut;
}

export function echeancesDe(
  types: readonly TypeEcheance[],
  profil: ProfilEcheances,
  ancres: Ancres,
  calendrier: Calendrier,
): Echeance[] {
  const codes = new Set<string>();
  for (const t of types) {
    verifierType(t);
    if (codes.has(t.code)) throw new ErreurCatalogue('code_double');
    codes.add(t.code);
  }
  const sortie: Echeance[] = [];
  for (const t of types.filter((x) => conditionRemplie(x.condition, profil))) {
    for (const ancre of ancresDe(t.ancrage, ancres)) {
      const dateLimite = reporter(ajouterJours(ajouterMois(ancre, t.decalage.mois), t.decalage.jours), t.report, calendrier);
      const rappels = t.rappelsJours.map((j) => ajouterJours(dateLimite, -j)).sort(comparer);
      const e: Echeance = { code: t.code, dateLimite, dateAVerifier: t.statutSource === 'non_verifie', rappels, niveau: t.niveau };
      if (t.source !== undefined) e.source = t.source;
      if (t.releveLe !== undefined) e.releveLe = t.releveLe;
      if (t.alerteJours !== undefined) e.alerte = ajouterJours(dateLimite, -t.alerteJours);
      sortie.push(e);
    }
  }
  return sortie.sort((x, y) => comparer(x.dateLimite, y.dateLimite) || comparer(x.code, y.code));
}

export function actionRappel(echeance: Pick<Echeance, 'code'>, action: ActionRappel, type: TypeEcheance) {
  if (!ACTIONS.includes(action)) throw new ErreurCatalogue('action_invalide');
  if (echeance.code !== type.code) throw new ErreurCatalogue('type_incoherent');
  if (action === 'ne_plus_rappeler' && type.legale) throw new ErreurCatalogue('interdit_echeance_legale');
  return { code: echeance.code, action };
}
