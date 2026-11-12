// Pièce hors de l'exercice en cours ou à cheval sur deux exercices : une question, une réponse appliquée et tracée.
// `periode.ts` reste inchangé : il dit dans ou hors exercice, ce module pose la question.
import { ErreurPiece } from '../types.js';

export interface ExerciceRangement { id: string; debut: string; fin: string; }
export interface PieceARanger { id: string; date: string; dateFin?: string | undefined; }
export type MotifRangement = 'exercice_precedent' | 'a_cheval';
/** `propose` : exercice où la date range la pièce ; `autre` : l'exercice en cours (ou le second pour une pièce à cheval). */
export interface QuestionRangement { pieceId: string; motif: MotifRangement; propose: string; autre: string; }
export type Reponse = 'oui' | 'non';
export interface LigneJournalRangement { pieceId: string; motif: MotifRangement; reponse: Reponse; exerciceId: string; par: string; le: string; }

function valider(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [an, mois, jour] = d.split('-').map(Number) as [number, number, number];
    const t = new Date(Date.UTC(an, mois - 1, jour));
    if (t.getUTCFullYear() === an && t.getUTCMonth() === mois - 1 && t.getUTCDate() === jour) return d;
  }
  throw new ErreurPiece('dates_invalides', 'Date invalide : format AAAA-MM-JJ et jour réel attendus.');
}

/** Undefined si aucune question : pièce dans l'exercice en cours, ou hors de tous les exercices (voir `statutPeriode`). */
export function questionRangement(piece: PieceARanger, exercices: ExerciceRangement[]): QuestionRangement | undefined {
  const date = valider(piece.date);
  const fin = piece.dateFin === undefined ? date : valider(piece.dateFin);
  if (fin < date) throw new ErreurPiece('dates_invalides', 'La pièce finit avant son début.');
  const tries = exercices.map((e) => ({ id: e.id, debut: valider(e.debut), fin: valider(e.fin) })).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  const courant = tries[tries.length - 1];
  const dedans = (d: string) => tries.find((e) => d >= e.debut && d <= e.fin);
  const premier = dedans(date);
  if (courant === undefined || premier === undefined) return undefined;
  const dernier = dedans(fin);
  if (dernier !== undefined && dernier.id !== premier.id) {
    return { pieceId: piece.id, motif: 'a_cheval', propose: premier.id, autre: dernier.id };
  }
  if (premier.id !== courant.id) {
    return { pieceId: piece.id, motif: 'exercice_precedent', propose: premier.id, autre: courant.id };
  }
  return undefined;
}

/** « oui » range la pièce dans l'exercice proposé, « non » dans l'autre ; la décision est tracée. */
export function appliquerReponse(question: QuestionRangement, reponse: Reponse, par: string, le: string): { exerciceId: string; journal: LigneJournalRangement } {
  if (reponse !== 'oui' && reponse !== 'non') throw new ErreurPiece('reponse_invalide', 'Réponse attendue : oui ou non.');
  if (par.trim() === '' || le.trim() === '') throw new ErreurPiece('reponse_invalide', 'L\'auteur et la date de la réponse sont obligatoires.');
  const exerciceId = reponse === 'oui' ? question.propose : question.autre;
  return { exerciceId, journal: { pieceId: question.pieceId, motif: question.motif, reponse, exerciceId, par, le } };
}
