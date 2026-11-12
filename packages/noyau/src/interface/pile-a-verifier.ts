// Pile « À vérifier » : tri, regroupement par fait, présélection, report. Fonctions pures, instant injecté.
import { ajouterJours } from './dates.js';

export class ErreurPile extends Error {
  constructor(readonly code: 'instant_invalide' | 'fuseau_invalide' | 'carte_invalide') {
    super(code);
    this.name = 'ErreurPile';
  }
}
export type PropositionPile = { readonly id: string; readonly confiance: number };
export type CartePile = {
  readonly id: string;
  readonly fait: string; // même fournisseur et même motif
  readonly groupe: number; // plus petit = plus tôt
  readonly echeance?: string | undefined; // AAAA-MM-JJ ; absente = en dernier
  readonly tvaEnJeu: number; // centimes, >= 0
  readonly datePiece: string;
  readonly propositions: readonly PropositionPile[];
  readonly masqueJusqu?: number | undefined; // instant (ms) du « Plus tard »
};
export type RaisonPile = 'groupe' | 'echeance' | 'tva' | 'date_piece' | 'identifiant';
export type CarteRendue = {
  readonly id: string;
  readonly fait: string;
  readonly ids: readonly string[];
  readonly nombre: number;
  readonly groupe: number;
  readonly echeance?: string | undefined;
  readonly tvaEnJeu: number;
  readonly datePiece: string;
  readonly preselection?: string | undefined;
  readonly rang: number;
  readonly raison: RaisonPile; // critère qui la sépare de la suivante (de la précédente pour la dernière)
};
type Brouillon = Omit<CarteRendue, 'rang' | 'raison'>;

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const cmpEch = (a?: string, b?: string): number => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : cmp(a, b));
const instantOk = (t: number): void => {
  if (typeof t !== 'number' || !Number.isFinite(t)) throw new ErreurPile('instant_invalide');
};
function fuseauOk(fuseau: string): void {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau });
  } catch {
    throw new ErreurPile('fuseau_invalide');
  }
}
function carteOk(c: CartePile): void {
  const mauvais = !Number.isFinite(c.groupe) || !Number.isFinite(c.tvaEnJeu) || c.tvaEnJeu < 0;
  if (mauvais || c.propositions.some((p) => !Number.isFinite(p.confiance))) throw new ErreurPile('carte_invalide');
}

function preselection(props: readonly PropositionPile[]): string | undefined {
  const m = new Map<string, number>();
  for (const p of props) m.set(p.id, Math.max(m.get(p.id) ?? p.confiance, p.confiance));
  const max = Math.max(...m.values());
  const tete = [...m].filter(([, v]) => v === max);
  return tete.length === 1 ? tete[0]![0] : undefined;
}

function fusionner(membres: readonly CartePile[]): Brouillon {
  const t = [...membres].sort((a, b) => cmp(a.id, b.id));
  return {
    id: t[0]!.id,
    fait: t[0]!.fait,
    ids: t.map((x) => x.id),
    nombre: t.length,
    groupe: Math.min(...t.map((x) => x.groupe)),
    echeance: t.map((x) => x.echeance).sort(cmpEch)[0],
    tvaEnJeu: t.reduce((s, x) => s + x.tvaEnJeu, 0),
    datePiece: t.map((x) => x.datePiece).sort(cmp)[0]!,
    preselection: preselection(t.flatMap((x) => x.propositions)),
  };
}

function raison(a: Brouillon, b: Brouillon): RaisonPile {
  if (a.groupe !== b.groupe) return 'groupe';
  if (cmpEch(a.echeance, b.echeance) !== 0) return 'echeance';
  if (a.tvaEnJeu !== b.tvaEnJeu) return 'tva';
  return a.datePiece !== b.datePiece ? 'date_piece' : 'identifiant';
}
const ordre = (a: Brouillon, b: Brouillon): number =>
  a.groupe - b.groupe || cmpEch(a.echeance, b.echeance) || b.tvaEnJeu - a.tvaEnJeu || cmp(a.datePiece, b.datePiece) || cmp(a.id, b.id);

export function construirePile(cartes: readonly CartePile[], maintenant: number): CarteRendue[] {
  instantOk(maintenant);
  const parFait = new Map<string, CartePile[]>();
  for (const c of cartes) {
    carteOk(c);
    if (c.masqueJusqu === undefined || maintenant >= c.masqueJusqu) parFait.set(c.fait, [...(parFait.get(c.fait) ?? []), c]);
  }
  const triees = [...parFait.values()].map(fusionner).sort(ordre);
  return triees.map((c, i) => {
    const voisin = triees[i + 1] ?? triees[i - 1];
    return { ...c, rang: i + 1, raison: voisin === undefined ? 'identifiant' : raison(c, voisin) };
  });
}

function local(ms: number, fuseau: string): { date: string; mur: number } {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: fuseau, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const v: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) v[p.type] = p.value;
  const n = (k: string): number => Number(v[k]);
  return { date: `${v['year']}-${v['month']}-${v['day']}`, mur: Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) };
}

/** « Plus tard » : masque la carte jusqu'au lendemain 00:00 dans le fuseau de la société. */
export function reporter(carte: CartePile, maintenant: number, fuseau: string): CartePile {
  instantOk(maintenant);
  fuseauOk(fuseau);
  const s = maintenant - (((maintenant % 1000) + 1000) % 1000);
  const [a, m, j] = ajouterJours(local(s, fuseau).date, 1).split('-').map(Number) as [number, number, number];
  const mur = Date.UTC(a, m - 1, j);
  // Deux passes : le décalage du fuseau est celui de l'instant visé, pas de l'instant présent.
  let t = mur - (local(s, fuseau).mur - s);
  t = mur - (local(t, fuseau).mur - t);
  return { ...carte, masqueJusqu: t };
}
