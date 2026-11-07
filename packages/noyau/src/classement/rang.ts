// Classement d'une pièce : compte proposé par rang de source (règles pures).
// Aucun numéro de compte en dur : les comptes sont des données d'entrée.

export type SourceClassement = 'regle_societe' | 'regle_apprise' | 'historique' | 'ia' | 'aucune';

export type StatutPiece = 'valide' | 'brouillon' | 'contre_passee';

export interface PieceHistorique {
  compte: string;
  statut: StatutPiece;
  exercice: number;
  /** Date ISO AAAA-MM-JJ. */
  date: string;
}

export interface EntreeClassement {
  regleSociete?: string;
  regleApprise?: { compte: string; statut: 'proposee' | 'eteinte' };
  historique: readonly PieceHistorique[];
  exercices: { courant: number; precedent?: number };
  ia?: () => string | undefined;
}

export interface SortieClassement {
  compte?: string;
  source: SourceClassement;
  confianceMax: 'sur' | 'a_verifier';
  detail?: { nbRetenu: number; nbTotal: number };
  signalements: string[];
}

export class ErreurClassement extends Error {
  override name = 'ErreurClassement';
  readonly code: 'date_invalide';
  constructor(code: 'date_invalide', message: string) {
    super(message);
    this.code = code;
  }
}

function dateValide(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === date;
}

function presente(compte: string | undefined): compte is string {
  return typeof compte === 'string' && compte !== '';
}

/** Rang 3 : majorité des pièces validées de l'exercice courant ou précédent. */
function depuisHistorique(entree: EntreeClassement): SortieClassement | undefined {
  for (const p of entree.historique) {
    if (!dateValide(p.date)) {
      throw new ErreurClassement('date_invalide', "Date invalide dans l'historique.");
    }
  }
  const { courant, precedent } = entree.exercices;
  const retenues = entree.historique.filter(
    (p) =>
      p.statut === 'valide' &&
      (p.exercice === courant || (precedent !== undefined && p.exercice === precedent)),
  );
  if (retenues.length === 0) return undefined;
  const parCompte = new Map<string, { nb: number; derniere: string }>();
  for (const p of retenues) {
    const cur = parCompte.get(p.compte) ?? { nb: 0, derniere: '' };
    cur.nb += 1;
    if (p.date > cur.derniere) cur.derniere = p.date;
    parCompte.set(p.compte, cur);
  }
  const classes = [...parCompte.entries()].sort(
    (a, b) =>
      b[1].nb - a[1].nb ||
      (a[1].derniere < b[1].derniere ? 1 : a[1].derniere > b[1].derniere ? -1 : 0) ||
      (a[0] < b[0] ? -1 : 1),
  );
  const [compte, stat] = classes[0] as [string, { nb: number; derniere: string }];
  return {
    compte,
    source: 'historique',
    confianceMax: 'sur',
    detail: { nbRetenu: stat.nb, nbTotal: retenues.length },
    signalements: [],
  };
}

/** Propose un compte depuis la première source qui répond (rangs 1 à 4). */
export function proposerCompte(entree: EntreeClassement): SortieClassement {
  const apprise =
    entree.regleApprise && entree.regleApprise.statut !== 'eteinte' && presente(entree.regleApprise.compte)
      ? entree.regleApprise.compte
      : undefined;

  if (presente(entree.regleSociete)) {
    const signalements =
      apprise !== undefined && apprise !== entree.regleSociete ? ['regle_apprise_contredite'] : [];
    return {
      compte: entree.regleSociete,
      source: 'regle_societe',
      confianceMax: 'sur',
      signalements,
    };
  }
  if (apprise !== undefined) {
    return {
      compte: apprise,
      source: 'regle_apprise',
      confianceMax: 'sur',
      signalements: [],
    };
  }
  const historique = depuisHistorique(entree);
  if (historique) return historique;

  const proposeIa = entree.ia?.();
  if (presente(proposeIa)) {
    return {
      compte: proposeIa,
      source: 'ia',
      confianceMax: 'a_verifier',
      signalements: [],
    };
  }
  return { source: 'aucune', confianceMax: 'a_verifier', signalements: [] };
}
