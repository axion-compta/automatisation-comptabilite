// Liste « À payer » : le logiciel ne paie jamais, il propose. IBAN hachés seulement.
import { ajouter, centimes, type Centimes } from "../../argent/index.js";
import { ajouterJours, comparerDates } from "../../dates/civiles.js";

export class ErreurAPayer extends Error {
  override name = "ErreurAPayer";
  readonly code: "reste_invalide" | "horizon_invalide";
  constructor(code: "reste_invalide" | "horizon_invalide") {
    super(code);
    this.code = code;
  }
}
export interface DetteFournisseur {
  pieceId: string;
  fournisseurId: string;
  echeance: string;
  reste: Centimes;
  ibanHache?: string;
  parPrelevement: boolean;
  rapprochee: boolean;
  dansLotGenere: boolean;
  escompteJusquau?: string;
}
export interface IbanConnu {
  fournisseurId: string;
  ibanHache: string;
}
export interface LigneAPayer {
  pieceId: string;
  fournisseurId: string;
  echeance: string;
  reste: Centimes;
  escompte: boolean;
}
export interface ExclueAPayer {
  pieceId: string;
  motif: "iban_change" | "deja_payee" | "dans_un_lot" | "prelevement";
}
export interface RefPiece {
  fournisseurId: string;
  pieceId: string;
}
export interface ListeAPayer {
  lignes: LigneAPayer[];
  total: Centimes;
  exclues: ExclueAPayer[];
  alertesIban: RefPiece[];
  premiereVue: RefPiece[];
}

function motifExclusion(
  d: DetteFournisseur,
): ExclueAPayer["motif"] | undefined {
  if (d.parPrelevement) return "prelevement";
  if (d.rapprochee || d.reste === 0) return "deja_payee";
  if (d.dansLotGenere) return "dans_un_lot";
  return undefined;
}

export function listeAPayer(
  dettes: readonly DetteFournisseur[],
  ibansConnus: readonly IbanConnu[],
  aujourdhui: string,
  horizonJours: number,
  memeIban: (a: string, b: string) => boolean,
): ListeAPayer {
  if (!Number.isSafeInteger(horizonJours) || horizonJours < 0)
    throw new ErreurAPayer("horizon_invalide");
  for (const d of dettes)
    if (!Number.isSafeInteger(d.reste) || d.reste < 0)
      throw new ErreurAPayer("reste_invalide");
  const limite = ajouterJours(aujourdhui, horizonJours);
  const connus = new Map(
    ibansConnus.map((i) => [i.fournisseurId, i.ibanHache]),
  );
  const lignes: LigneAPayer[] = [];
  const exclues: ExclueAPayer[] = [];
  const alertesIban: RefPiece[] = [];
  const premiereVue: RefPiece[] = [];
  for (const d of dettes) {
    const motif = motifExclusion(d);
    if (motif) {
      exclues.push({ pieceId: d.pieceId, motif });
      continue;
    }
    if (comparerDates(d.echeance, limite) > 0) continue;
    const connu = connus.get(d.fournisseurId);
    const ref = { fournisseurId: d.fournisseurId, pieceId: d.pieceId };
    if (connu === undefined) premiereVue.push(ref);
    else if (d.ibanHache !== undefined && !memeIban(d.ibanHache, connu)) {
      alertesIban.push(ref);
      exclues.push({ pieceId: d.pieceId, motif: "iban_change" });
      continue;
    }
    const escompte =
      d.escompteJusquau !== undefined &&
      comparerDates(d.escompteJusquau, aujourdhui) >= 0;
    lignes.push({
      pieceId: d.pieceId,
      fournisseurId: d.fournisseurId,
      echeance: d.echeance,
      reste: d.reste,
      escompte,
    });
  }
  lignes.sort(
    (a, b) =>
      Number(b.escompte) - Number(a.escompte) ||
      comparerDates(a.echeance, b.echeance) ||
      (a.pieceId < b.pieceId ? -1 : a.pieceId > b.pieceId ? 1 : 0),
  );
  const total = lignes.reduce((s, l) => ajouter(s, l.reste), centimes(0));
  return { lignes, total, exclues, alertesIban, premiereVue };
}
