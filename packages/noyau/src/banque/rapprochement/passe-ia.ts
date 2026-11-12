// Passe IA du rapprochement (passe 10) : proposition seulement, score plafonné, sommes vérifiées par le code. Aucune trace écrite ici (V3-BAN-093).
import { estComptable, type EtatRapprochement, type Lien } from '../types.js';
import { pseudonymiser } from '../libelles/pseudonymiser.js';
import type { Entree } from './passes.js';
import { etatSelonScore, type Bareme } from './score.js';
import { resteLigne, restePiece, verifierNouveauLien } from './sommes.js';

export const PASSE_IA = 10;

export type ProposeurLiens = (entree: {
  lignes: { id: string; date: string; montant: number; moyen: string; libelle: string }[];
  pieces: { id: string; date: string; montant: number; sens: string; numero?: string }[];
}) => Promise<string>;
export type ReglageIa = { version: string; plafondScore: number; plafondDesaccord: number };
export type RejetIa = { ligneId: string; pieceId: string; code: string };
export type ResultatIa = {
  issue: 'ok' | 'rien_a_proposer' | 'indisponible' | 'reponse_illisible';
  liens: Lien[];
  etats: Record<string, EtatRapprochement>;
  rejets: RejetIa[];
};

export class ErreurPasseIa extends Error {
  override name = 'ErreurPasseIa';
  constructor(readonly code: 'reglage_invalide') {
    super(code);
  }
}

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
const vide = (issue: ResultatIa['issue']): ResultatIa => ({ issue, liens: [], etats: {}, rejets: [] });

function verifierReglage(r: ReglageIa, b?: Bareme): void {
  const ok =
    typeof r?.version === 'string' && r.version !== '' && entier(r.plafondScore) && r.plafondScore >= 0 &&
    entier(r.plafondDesaccord) && r.plafondDesaccord >= 0 &&
    (b === undefined || (r.plafondDesaccord < b.seuils.proposee && r.plafondScore < b.seuils.rapprochee));
  if (!ok) throw new ErreurPasseIa('reglage_invalide');
}

const CHAMPS = ['ligneId', 'pieceId', 'montantAffecte', 'score'];
const texte = (v: unknown): string => (typeof v === 'string' ? v : '');

export async function proposerParIa(
  entree: Entree & { liens: readonly Lien[] },
  options: { bareme: Bareme; reglage: ReglageIa; personnes: readonly string[]; proposer: ProposeurLiens },
): Promise<ResultatIa> {
  const { bareme, reglage } = options;
  verifierReglage(reglage, bareme);
  const lignes = entree.lignes.filter((l) => estComptable(l) && resteLigne(l, entree.liens) > 0);
  const pieces = entree.pieces.filter((p) => restePiece({ id: p.id, montant: p.montant }, entree.liens) > 0);
  if (lignes.length === 0 || pieces.length === 0) return vide('rien_a_proposer');

  const { textes } = pseudonymiser([...lignes.map((l) => l.libelleBrut), ...pieces.map((p) => p.numero ?? '')], options.personnes);
  let brut: string;
  try {
    brut = await options.proposer({
      lignes: lignes.map((l, i) => ({ id: l.id, date: l.dateOperation, montant: l.montant, moyen: l.moyen, libelle: textes[i]! })),
      pieces: pieces.map((p, i) => ({
        id: p.id, date: p.date, montant: p.montant, sens: p.sens,
        ...(p.numero === undefined ? {} : { numero: textes[lignes.length + i]! }),
      })),
    });
  } catch {
    return vide('indisponible');
  }
  let propositions: unknown;
  try {
    propositions = (JSON.parse(brut) as { propositions?: unknown } | null)?.propositions;
  } catch {
    return vide('reponse_illisible');
  }
  if (!Array.isArray(propositions)) return vide('reponse_illisible');

  const acceptes: Lien[] = [];
  const rejets: RejetIa[] = [];
  const meilleur = new Map<string, number>();
  for (const p of propositions as Record<string, unknown>[]) {
    const ligneId = texte(p?.ligneId);
    const pieceId = texte(p?.pieceId);
    const rejeter = (code: string) => rejets.push({ ligneId, pieceId, code });
    const ligne = lignes.find((l) => l.id === ligneId);
    const piece = pieces.find((x) => x.id === pieceId);
    const forme = p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).sort().join() === [...CHAMPS].sort().join();
    if (!forme || !ligne || !piece || !entier(p.montantAffecte) || p.montantAffecte <= 0 || !entier(p.score) || p.score < 0) {
      rejeter('proposition_invalide');
      continue;
    }
    const verdict = verifierNouveauLien({ ligneId, pieceId, montantAffecte: p.montantAffecte }, ligne, piece, [...entree.liens, ...acceptes]);
    if (!verdict.ok) {
      rejeter(verdict.code);
      continue;
    }
    const score = Math.min(p.score, reglage.plafondScore);
    if (etatSelonScore(score, bareme) === null) {
      rejeter('score_insuffisant');
      continue;
    }
    acceptes.push({
      id: `lien:ia:${acceptes.length + 1}:${ligneId}:${pieceId}`, groupeId: `groupe:${ligneId}`, ligneId, pieceId,
      montantAffecte: p.montantAffecte as Lien['montantAffecte'], score, facteurs: [], passe: PASSE_IA,
      codeRaison: 'proposition_ia', proposePar: 'ia', etat: 'propose', version: 1,
    });
    meilleur.set(ligneId, Math.max(score, meilleur.get(ligneId) ?? 0));
  }
  const etats: Record<string, EtatRapprochement> = {};
  for (const [id, score] of meilleur) etats[id] = etatSelonScore(score, bareme)!;
  return { issue: 'ok', liens: acceptes, etats, rejets };
}

/** Le contrôle croisé ne peut que rétrograder : jamais de hausse. Entrées non modifiées. */
export function controleCroise(
  liens: readonly Lien[], verdicts: readonly { lienId: string; accord: boolean }[], reglage: ReglageIa,
): Lien[] {
  verifierReglage(reglage);
  const desaccords = new Set(verdicts.filter((v) => !v.accord).map((v) => v.lienId));
  return liens.map((l) =>
    l.proposePar === 'ia' && desaccords.has(l.id)
      ? { ...l, score: Math.min(l.score, reglage.plafondDesaccord), codeRaison: 'controle_croise_desaccord' }
      : l,
  );
}
