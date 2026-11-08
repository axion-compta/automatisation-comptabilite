import {
  cleEtape,
  estFinal,
  etapeSuivante,
  type Etat,
  type Resultat,
} from '../../../../packages/noyau/src/agents/superviseur.js';
import { ETAPES_PIECE, type EtapePiece } from '../../../../packages/noyau/src/chat/types.js';

// Adaptateur du Superviseur sur la file de la console (contrat C4), écrit contre une interface :
// aucun client de file réel ici, le stockage est injecté (faux serveur en essai).
export type AgentAsync = () => Promise<Resultat>;
export type OptionsFile = { maxEtapes: number; maxReprises: number; version?: string; parcoursPermis?: readonly Etat[] };
export type Tache = {
  id: string;
  pieceId: string;
  version: string;
  statut: 'en_cours' | 'terminee';
  etat: Etat;
  etapes: number;
  reprises: number;
};
export interface StockageFile {
  lireResultat(cle: string): Promise<Resultat | undefined>;
  ecrireResultat(cle: string, r: Resultat): Promise<void>;
  lireTache(id: string): Promise<Tache | undefined>;
  ecrireTache(t: Tache): Promise<void>;
}

const VERSION_PAR_DEFAUT = 'v1';
const MARQUE_TACHE = 'tache';

function borne(nom: string, v: number): number {
  if (!Number.isSafeInteger(v) || v < 1) throw new RangeError(`Borne invalide pour ${nom} : ${String(v)}`);
  return v;
}

export class FileTaches {
  constructor(private readonly stockage: StockageFile) {}

  identifiant(pieceId: string, version: string = VERSION_PAR_DEFAUT): string {
    return cleEtape(pieceId, MARQUE_TACHE, version);
  }

  /** Crée la tâche persistante et rend tout de suite son identifiant ; `fin` se résout à la fin du tour. */
  lancer(pieceId: string, agents: Partial<Record<EtapePiece, AgentAsync>>, options: OptionsFile) {
    borne('maxEtapes', options.maxEtapes);
    borne('maxReprises', options.maxReprises);
    const version = options.version ?? VERSION_PAR_DEFAUT;
    const id = this.identifiant(pieceId, version);
    const fin = (async () => {
      const existante = await this.stockage.lireTache(id);
      const t: Tache = existante ?? { id, pieceId, version, statut: 'en_cours', etat: ETAPES_PIECE[0], etapes: 0, reprises: 0 };
      await this.stockage.ecrireTache(t);
      return this.avancer(t, agents, options);
    })();
    return { id, fin };
  }

  async reprendre(id: string, agents: Partial<Record<EtapePiece, AgentAsync>>, options: OptionsFile): Promise<Tache> {
    const t = await this.stockage.lireTache(id);
    if (t === undefined) throw new RangeError(`Tâche inconnue : ${id}`);
    return this.avancer(t, agents, options);
  }

  suivre(id: string): Promise<Tache | undefined> {
    return this.stockage.lireTache(id);
  }

  private async executer(t: Tache, agent: AgentAsync): Promise<Resultat> {
    const cle = cleEtape(t.pieceId, t.etat, t.version);
    const gardee = await this.stockage.lireResultat(cle);
    if (gardee !== undefined) return gardee;
    const r = await agent();
    await this.stockage.ecrireResultat(cle, r);
    return r;
  }

  private async avancer(depart: Tache, agents: Partial<Record<EtapePiece, AgentAsync>>, o: OptionsFile): Promise<Tache> {
    const maxEtapes = borne('maxEtapes', o.maxEtapes);
    const maxReprises = borne('maxReprises', o.maxReprises);
    const t = { ...depart };
    while (!estFinal(t.etat)) {
      const agent = agents[t.etat as EtapePiece];
      if (t.etapes >= maxEtapes || agent === undefined) {
        t.etat = 'en_attente';
      } else {
        try {
          t.etat = etapeSuivante(t.etat, await this.executer(t, agent), o.parcoursPermis);
          t.etapes += 1;
        } catch {
          t.reprises += 1;
          if (t.reprises > maxReprises) t.etat = 'en_attente';
        }
      }
      await this.stockage.ecrireTache(t);
    }
    t.statut = 'terminee';
    await this.stockage.ecrireTache(t);
    return t;
  }
}
