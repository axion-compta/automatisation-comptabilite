import { ETAPES_PIECE, SORTIES_PIECE, estDans, type EtapePiece, type SortiePiece } from '../chat/types.js';

// Enchaînement des agents sur une pièce. Les états de traitement du fichier restent dans pieces/etats.ts.
export type Etat = EtapePiece | SortiePiece;
export type IssueEtape = 'ok' | 'atypique' | SortiePiece;
export type Resultat = { issue: IssueEtape; parcours?: Etat | undefined };
export type Agent = () => Resultat;
export type Options = { maxEtapes: number; maxReprises: number; version?: string; parcoursPermis?: readonly Etat[] };
export type Deroulement = { etat: Etat; etapes: number; reprises: number; trace: Etat[] };

const ETAT_FINAL_NOMINAL: EtapePiece = 'proposition_prete';
const VERSION_PAR_DEFAUT = 'v1';

export function estFinal(etat: Etat): boolean {
  return etat === ETAT_FINAL_NOMINAL || estDans(SORTIES_PIECE, etat);
}

export function etapeSuivante(etat: Etat, resultat: Resultat, parcoursPermis: readonly Etat[] = []): Etat {
  if (estFinal(etat)) return etat;
  if (resultat.issue === 'ok') {
    const suivante = ETAPES_PIECE[ETAPES_PIECE.indexOf(etat as EtapePiece) + 1];
    return suivante ?? 'a_verifier';
  }
  if (resultat.issue === 'atypique') {
    const p = resultat.parcours;
    return p !== undefined && parcoursPermis.includes(p) && (estDans(ETAPES_PIECE, p) || estDans(SORTIES_PIECE, p))
      ? p
      : 'a_verifier';
  }
  return estDans(SORTIES_PIECE, resultat.issue) ? resultat.issue : 'a_verifier';
}

function morceau(nom: string, v: string): string {
  if (typeof v !== 'string' || v === '' || v.includes(':')) throw new RangeError(`${nom} invalide`);
  return v;
}

export function cleEtape(pieceId: string, etape: string, version: string): string {
  return `${morceau('pieceId', pieceId)}:${morceau('etape', etape)}:${morceau('version', version)}`;
}

function borne(nom: string, v: number): number {
  if (!Number.isSafeInteger(v) || v < 1) throw new RangeError(`Borne invalide pour ${nom} : ${String(v)}`);
  return v;
}

export class Superviseur {
  private readonly gardes = new Map<string, unknown>();

  executer<R>(pieceId: string, etape: string, version: string, faire: () => R): R {
    const cle = cleEtape(pieceId, etape, version);
    if (this.gardes.has(cle)) return this.gardes.get(cle) as R;
    const r = faire();
    this.gardes.set(cle, r);
    return r;
  }

  derouler(pieceId: string, agents: Partial<Record<EtapePiece, Agent>>, options: Options): Deroulement {
    const maxEtapes = borne('maxEtapes', options.maxEtapes);
    const maxReprises = borne('maxReprises', options.maxReprises);
    const version = options.version ?? VERSION_PAR_DEFAUT;
    let etat: Etat = ETAPES_PIECE[0];
    let etapes = 0;
    let reprises = 0;
    const trace: Etat[] = [etat];
    while (!estFinal(etat)) {
      if (etapes >= maxEtapes) {
        etat = 'en_attente';
      } else {
        const agent = agents[etat as EtapePiece];
        if (agent === undefined) {
          etat = 'en_attente';
        } else {
          try {
            etat = etapeSuivante(etat, this.executer(pieceId, etat, version, agent), options.parcoursPermis);
            etapes += 1;
          } catch {
            reprises += 1;
            if (reprises > maxReprises) etat = 'en_attente';
            else continue;
          }
        }
      }
      trace.push(etat);
    }
    return { etat, etapes, reprises, trace };
  }
}
