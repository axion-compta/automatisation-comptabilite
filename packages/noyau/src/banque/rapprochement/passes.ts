// Passes déterministes du rapprochement : référence exacte, exacte, tolérante, affectation globale. Liens toujours proposés, jamais validés.
import { centimes } from '../../argent/index.js';
import { estDateValide } from '../../dates/civiles.js';
import { joursEntre } from '../../interface/dates.js';
import type { EtatRapprochement, Lien, LigneBancaire, Moyen } from '../types.js';
import { affecter } from './affectation.js';
import type { PieceAvecReste } from './preparation.js';
import { appliquerAmbiguite, etatSelonScore, scorer, type Bareme, type Constats } from './score.js';
import { restePiece, verifierNouveauLien } from './sommes.js';

export class ErreurPasses extends Error {
  override name = 'ErreurPasses';
  constructor(readonly code: 'tolerance_invalide' | 'date_invalide') {
    super(code);
  }
}

export const PASSES = { reference_exacte: 4, exacte: 5, tolerante: 6, affectation: 7 } as const;
type NomPasse = keyof typeof PASSES;
const UN_CENTIME = 1;

export type Reglage = { bareme: Bareme; toleranceJours: Record<Moyen, number>; maxAffectation: number };
export type Entree = { lignes: readonly LigneBancaire[]; pieces: readonly PieceAvecReste[] };
export type Resultat = { liens: Lien[]; etats: Record<string, EtatRapprochement>; options: Record<string, string[]> };

type Candidat = { piece: PieceAvecReste; score: number; constats: Constats; facteurs: Lien['facteurs']; plafonne: boolean };
type Concurrente = { ligne: LigneBancaire; cands: Candidat[] };

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const parRang = (a: LigneBancaire, b: LigneBancaire): number => a.rang - b.rang || cmp(a.id, b.id);
const plein = (s: string | undefined): s is string => s !== undefined && s !== '';

function verifierEntree(entree: Entree, r: Reglage): void {
  if (!Object.values(r.toleranceJours).every((n) => Number.isSafeInteger(n) && n >= 0)) throw new ErreurPasses('tolerance_invalide');
  const dates = [...entree.lignes.map((l) => l.dateOperation), ...entree.pieces.flatMap((p) => [p.date, ...(p.echeance === undefined ? [] : [p.echeance])])];
  if (!dates.every(estDateValide)) throw new ErreurPasses('date_invalide');
}

/** Écart de montant comparé (origine si la pièce est en devise d'origine) ; 'sans_origine' si la ligne ne porte pas l'origine. */
function ecartMontant(l: LigneBancaire, p: PieceAvecReste): number | 'sans_origine' | null {
  if (p.montantOrigine === undefined) return Math.abs(Math.abs(l.montant) - Math.abs(p.montant));
  const vu = l.montantOrigine !== undefined && l.deviseOrigine === p.deviseOrigine ? l.montantOrigine : l.devise === p.deviseOrigine ? l.montant : undefined;
  if (vu !== undefined) return Math.abs(Math.abs(vu) - Math.abs(p.montantOrigine));
  return l.montantOrigine === undefined && plein(l.contrepartieId) && l.contrepartieId === p.contrepartieId ? 'sans_origine' : null;
}

function candidats(l: LigneBancaire, pieces: readonly PieceAvecReste[], r: Reglage): Candidat[] {
  const tol = r.toleranceJours[l.moyen];
  const sens = l.montant < 0 ? 'achat' : 'vente';
  const texte = `${l.libelleBrut} ${l.reference ?? ''}`.toLowerCase();
  const sortie: Candidat[] = [];
  for (const p of pieces) {
    const ecart = p.sens === sens ? ecartMontant(l, p) : null;
    if (ecart === null || (ecart !== 'sans_origine' && ecart > UN_CENTIME)) continue;
    const joursEcart = Math.min(...[p.date, p.echeance].filter((d): d is string => d !== undefined).map((d) => Math.abs(joursEntre(l.dateOperation, d))));
    const constats: Constats = {
      montant: ecart === 0 ? 'exact' : ecart === 'sans_origine' ? 'aucun' : 'centime',
      contrepartie: plein(l.contrepartieId) && l.contrepartieId === p.contrepartieId ? (l.certitudeContrepartie === 'connue' ? 'connue' : 'similaire') : 'aucune',
      reference: plein(p.numero) && texte.includes(p.numero.toLowerCase()) ? 'complete' : 'aucune',
      date: joursEcart <= tol ? 'tolerance' : joursEcart <= tol + tol ? 'double' : 'hors',
      sensCoherent: true, regleApprise: l.regleApprise === true, dejaPartielle: p.reste < p.montant, joursEcart,
    };
    const s = scorer(constats, r.bareme);
    const facteurs = [...s.facteurs, ...s.penalites].map((f) => ({ ...f, code: f.nom }));
    sortie.push({ piece: p, score: s.score, constats, facteurs, plafonne: ecart === 'sans_origine' });
  }
  return sortie.sort((a, b) => b.score - a.score || cmp(a.piece.id, b.piece.id));
}

function nomPasse(c: Constats): NomPasse {
  if (c.reference === 'complete') return 'reference_exacte';
  return c.montant === 'exact' && c.date === 'tolerance' ? 'exacte' : 'tolerante';
}

export function rapprocher(entree: Entree, reglage: Reglage): Resultat {
  verifierEntree(entree, reglage);
  const { bareme } = reglage;
  const liens: Lien[] = [];
  const etats: Record<string, EtatRapprochement> = {};
  const options: Record<string, string[]> = {};
  const douteuse = (ligneId: string, ids: string[]): void => {
    etats[ligneId] = 'DOUTEUSE';
    options[ligneId] = ids;
  };
  const poser = (l: LigneBancaire, c: Candidat, passe: NomPasse, score: number): boolean => {
    const p = { id: c.piece.id, montant: c.piece.reste };
    const montant = Math.min(Math.abs(l.montant), restePiece(p, liens));
    if (!verifierNouveauLien({ ligneId: l.id, pieceId: p.id, montantAffecte: montant }, l, p, liens).ok) return false;
    liens.push({
      id: `lien:${l.id}:${p.id}`, groupeId: `groupe:${l.id}`, ligneId: l.id, pieceId: p.id, montantAffecte: centimes(montant), score,
      facteurs: c.facteurs, passe: PASSES[passe], codeRaison: passe, proposePar: 'regle', etat: 'propose', version: 1,
    });
    return true;
  };

  const ambigus: Concurrente[] = [];
  for (const l of [...entree.lignes].sort(parRang)) {
    const cands = candidats(l, entree.pieces, reglage);
    const [premier, second] = cands;
    if (premier === undefined) continue;
    const ecart = second === undefined ? undefined : premier.score - second.score;
    if (ecart !== undefined && (ecart <= 0 || ecart < bareme.ecartAmbiguite)) {
      ambigus.push({ ligne: l, cands: cands.filter((c) => premier.score - c.score < Math.max(bareme.ecartAmbiguite, UN_CENTIME)) });
      continue;
    }
    const score = appliquerAmbiguite(cands.map((c) => c.score), bareme)[0] as number;
    const etat = premier.plafonne ? 'DOUTEUSE' : etatSelonScore(score, bareme);
    if (etat === null) continue;
    if (etat !== 'DOUTEUSE' && poser(l, premier, nomPasse(premier.constats), score)) etats[l.id] = etat;
    else douteuse(l.id, [premier.piece.id]);
  }

  // Lignes en concurrence : composantes reliées par des pièces communes, affectation globale par écart de date.
  let composantes: { lignes: Concurrente[]; pieces: Set<string> }[] = [];
  for (const a of ambigus) {
    const ids = a.cands.map((c) => c.piece.id);
    const liees = composantes.filter((k) => ids.some((id) => k.pieces.has(id)));
    const fusion = { lignes: [...liees.flatMap((k) => k.lignes), a], pieces: new Set([...liees.flatMap((k) => [...k.pieces]), ...ids]) };
    composantes = [...composantes.filter((k) => !liees.includes(k)), fusion];
  }
  for (const k of composantes) {
    const tous = [...k.lignes].sort((x, y) => parRang(x.ligne, y.ligne));
    const trouver = (ligneId: string, pieceId: string): Candidat | undefined => tous.find((a) => a.ligne.id === ligneId)?.cands.find((c) => c.piece.id === pieceId);
    const libre = (c: Candidat): boolean => !c.plafonne && restePiece({ id: c.piece.id, montant: c.piece.reste }, liens) > 0;
    const cout = (l: { id: string }, p: { id: string }): number | null => {
      const c = trouver(l.id, p.id);
      return c !== undefined && libre(c) ? c.constats.joursEcart : null;
    };
    const el = (id: string) => ({ id, cle: id });
    const sortie = tous.length > 1 ? affecter(tous.map((a) => el(a.ligne.id)), [...k.pieces].map(el), cout, reglage.maxAffectation) : { paires: [], unique: false };
    const paires = new Map(sortie.unique ? sortie.paires.map((p) => [p.ligneId, p.pieceId]) : []);
    for (const a of tous) {
      const choisi = trouver(a.ligne.id, paires.get(a.ligne.id) ?? '');
      const etat = choisi === undefined ? null : etatSelonScore(choisi.score, bareme);
      if (choisi !== undefined && (etat === 'PROPOSEE' || etat === 'RAPPROCHEE') && poser(a.ligne, choisi, 'affectation', choisi.score)) etats[a.ligne.id] = 'PROPOSEE';
      else douteuse(a.ligne.id, a.cands.map((c) => c.piece.id));
    }
  }
  liens.sort((a, b) => cmp(a.ligneId, b.ligneId) || cmp(a.pieceId ?? '', b.pieceId ?? ''));
  return { liens, etats, options };
}
