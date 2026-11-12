// Décisions courantes (rémunération, mandat, convention de compte courant) : fonctions pures.
// Un brouillon n'est jamais présenté comme signé ; seule une pièce déposée le fait passer à « deposee ».
import type { DecisionOrgane } from './remuneration.js';

export type TypeDecisionCourante = 'remuneration_dirigeant' | 'mandat' | 'convention_compte_courant';
export type CodeErreurDecisionCourante =
  | 'modele_a_faire_valider'
  | 'piece_absente'
  | 'deja_deposee'
  | 'acte_non_depose'
  | 'donnees_invalides';

export class ErreurDecisionCourante extends Error {
  override name = 'ErreurDecisionCourante';
  readonly code: CodeErreurDecisionCourante;
  constructor(code: CodeErreurDecisionCourante, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

export interface ModeleDecision {
  type: TypeDecisionCourante;
  version?: string;
  dateModele?: string;
  approuve: boolean;
}

export interface DonneesDecision {
  id: string;
  debut: string;
  fin: string;
  montantMaxCentimes: number | null;
  forme: string;
}

export interface DecisionCourante {
  type: TypeDecisionCourante;
  versionModele: string;
  dateModele: string;
  mention: 'prepare_par_ia_a_faire_valider';
  statut: 'brouillon' | 'deposee';
  donnees: DonneesDecision;
  pieceId?: string;
}

export type SuiteActe =
  | { suite: 'carte_remuneration_levee'; decisionOrgane: DecisionOrgane }
  | { suite: 'convention_prete_archivage'; decisionId: string; pieceId: string }
  | { suite: 'date_fin_a_suivre'; decisionId: string; dateFin: string };

const renseigne = (v: string | undefined): v is string => v !== undefined && v.trim() !== '';

export function preparerDecision(
  type: TypeDecisionCourante,
  modele: ModeleDecision,
  donnees: DonneesDecision,
): DecisionCourante {
  if (!renseigne(donnees.id) || donnees.debut > donnees.fin) throw new ErreurDecisionCourante('donnees_invalides');
  if (modele.type !== type || !modele.approuve || !renseigne(modele.version) || !renseigne(modele.dateModele)) {
    throw new ErreurDecisionCourante('modele_a_faire_valider', type);
  }
  return {
    type,
    versionModele: modele.version,
    dateModele: modele.dateModele,
    mention: 'prepare_par_ia_a_faire_valider',
    statut: 'brouillon',
    donnees: { ...donnees },
  };
}

export function deposerActe(decision: DecisionCourante, pieceSignee: { pieceId: string }): DecisionCourante {
  if (decision.statut === 'deposee') throw new ErreurDecisionCourante('deja_deposee', decision.donnees.id);
  if (!renseigne(pieceSignee.pieceId)) throw new ErreurDecisionCourante('piece_absente', decision.donnees.id);
  return { ...decision, statut: 'deposee', pieceId: pieceSignee.pieceId };
}

export function apresActeDepose(decision: DecisionCourante): SuiteActe {
  const { pieceId } = decision;
  if (decision.statut !== 'deposee' || pieceId === undefined) {
    throw new ErreurDecisionCourante('acte_non_depose', decision.donnees.id);
  }
  const d = decision.donnees;
  switch (decision.type) {
    case 'remuneration_dirigeant':
      return {
        suite: 'carte_remuneration_levee',
        decisionOrgane: {
          id: d.id,
          objet: 'remuneration_dirigeant',
          forme: d.forme,
          debut: d.debut,
          fin: d.fin,
          montantMaxCentimes: d.montantMaxCentimes,
          statut: 'deposee',
        },
      };
    case 'convention_compte_courant':
      return { suite: 'convention_prete_archivage', decisionId: d.id, pieceId };
    case 'mandat':
      return { suite: 'date_fin_a_suivre', decisionId: d.id, dateFin: d.fin };
  }
}
