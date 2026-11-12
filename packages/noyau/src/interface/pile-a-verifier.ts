// Pile « À vérifier » : tri, regroupement par fait, présélection et report. Fonctions pures, instant injecté, codes seulement.
import { ajouterJours } from "./dates.js";

export type CodeErreurPile =
  | "instant_invalide"
  | "fuseau_invalide"
  | "carte_invalide";

export class ErreurPile extends Error {
  readonly code: CodeErreurPile;
  constructor(code: CodeErreurPile) {
    super(code);
    this.name = "ErreurPile";
    this.code = code;
  }
}

export type PropositionPile = {
  readonly id: string;
  readonly confiance: number;
};

export type CartePile = {
  readonly id: string;
  /** Même fournisseur et même motif : les cartes de même fait sont groupées. */
  readonly fait: string;
  /** Rang du groupe d'urgence : plus petit = plus tôt. */
  readonly groupe: number;
  /** AAAA-MM-JJ ; absente = classée après les échéances connues. */
  readonly echeance?: string | undefined;
  /** En centimes, positif ou nul. */
  readonly tvaEnJeu: number;
  /** AAAA-MM-JJ. */
  readonly datePiece: string;
  readonly propositions: readonly PropositionPile[];
  /** Instant (ms) avant lequel la carte est masquée (« Plus tard »). */
  readonly masqueJusqu?: number | undefined;
};

export type RaisonPile =
  | "groupe"
  | "echeance"
  | "tva"
  | "date_piece"
  | "identifiant";

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
  /** Critère qui sépare cette carte de la suivante (de la précédente pour la dernière). */
  readonly raison: RaisonPile;
};

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function verifierInstant(t: number): void {
  if (typeof t !== "number" || !Number.isFinite(t))
    throw new ErreurPile("instant_invalide");
}

function verifierCarte(c: CartePile): void {
  if (
    !Number.isFinite(c.groupe) ||
    !Number.isFinite(c.tvaEnJeu) ||
    c.tvaEnJeu < 0 ||
    c.propositions.some((p) => !Number.isFinite(p.confiance))
  ) {
    throw new ErreurPile("carte_invalide");
  }
}

function preselection(props: readonly PropositionPile[]): string | undefined {
  const meilleures = new Map<string, number>();
  for (const p of props)
    meilleures.set(
      p.id,
      Math.max(meilleures.get(p.id) ?? p.confiance, p.confiance),
    );
  let max = -Infinity;
  for (const v of meilleures.values()) max = Math.max(max, v);
  const tete = [...meilleures].filter(([, v]) => v === max);
  return tete.length === 1 ? tete[0]![0] : undefined;
}

type Brouillon = Omit<CarteRendue, "rang" | "raison">;

function fusionner(membres: readonly CartePile[]): Brouillon {
  const tries = [...membres].sort((a, b) => cmp(a.id, b.id));
  const echeances = tries
    .flatMap((m) => (m.echeance === undefined ? [] : [m.echeance]))
    .sort(cmp);
  return {
    id: tries[0]!.id,
    fait: tries[0]!.fait,
    ids: tries.map((m) => m.id),
    nombre: tries.length,
    groupe: Math.min(...tries.map((m) => m.groupe)),
    echeance: echeances[0],
    tvaEnJeu: tries.reduce((s, m) => s + m.tvaEnJeu, 0),
    datePiece: tries.map((m) => m.datePiece).sort(cmp)[0]!,
    preselection: preselection(tries.flatMap((m) => m.propositions)),
  };
}

function comparerEcheance(a?: string, b?: string): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return cmp(a, b);
}

function critere(a: Brouillon, b: Brouillon): RaisonPile {
  if (a.groupe !== b.groupe) return "groupe";
  if (comparerEcheance(a.echeance, b.echeance) !== 0) return "echeance";
  if (a.tvaEnJeu !== b.tvaEnJeu) return "tva";
  if (a.datePiece !== b.datePiece) return "date_piece";
  return "identifiant";
}

function ordre(a: Brouillon, b: Brouillon): number {
  return (
    a.groupe - b.groupe ||
    comparerEcheance(a.echeance, b.echeance) ||
    b.tvaEnJeu - a.tvaEnJeu ||
    cmp(a.datePiece, b.datePiece) ||
    cmp(a.id, b.id)
  );
}

export function construirePile(
  cartes: readonly CartePile[],
  maintenant: number,
  fuseau: string,
): CarteRendue[] {
  verifierInstant(maintenant);
  verifierFuseau(fuseau);
  const visibles = cartes.filter((c) => {
    verifierCarte(c);
    return c.masqueJusqu === undefined || maintenant >= c.masqueJusqu;
  });
  const parFait = new Map<string, CartePile[]>();
  for (const c of visibles)
    parFait.set(c.fait, [...(parFait.get(c.fait) ?? []), c]);
  const triees = [...parFait.values()].map(fusionner).sort(ordre);
  return triees.map((c, i) => {
    const voisin = triees[i + 1] ?? triees[i - 1];
    return {
      ...c,
      rang: i + 1,
      raison: voisin === undefined ? "identifiant" : critere(c, voisin),
    };
  });
}

function verifierFuseau(fuseau: string): void {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau });
  } catch {
    throw new ErreurPile("fuseau_invalide");
  }
}

function partiesLocales(
  ms: number,
  fuseau: string,
): { date: string; murEnUtc: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuseau,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const v: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) v[p.type] = p.value;
  const date = `${v["year"]}-${v["month"]}-${v["day"]}`;
  const murEnUtc = Date.UTC(
    Number(v["year"]),
    Number(v["month"]) - 1,
    Number(v["day"]),
    Number(v["hour"]),
    Number(v["minute"]),
    Number(v["second"]),
  );
  return { date, murEnUtc };
}

/** « Plus tard » : masque la carte jusqu'au lendemain 00:00 dans le fuseau de la société. */
export function reporter(
  carte: CartePile,
  maintenant: number,
  fuseau: string,
): CartePile {
  verifierInstant(maintenant);
  verifierFuseau(fuseau);
  const arrondi = maintenant - (((maintenant % 1000) + 1000) % 1000);
  const lendemain = ajouterJours(partiesLocales(arrondi, fuseau).date, 1);
  const [a, m, j] = lendemain.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const mur = Date.UTC(a, m - 1, j, 0, 0, 0);
  // Deux passes : le décalage du fuseau est celui de l'instant visé, pas de l'instant présent.
  let instant = mur - (partiesLocales(arrondi, fuseau).murEnUtc - arrondi);
  instant = mur - (partiesLocales(instant, fuseau).murEnUtc - instant);
  return { ...carte, masqueJusqu: instant };
}
