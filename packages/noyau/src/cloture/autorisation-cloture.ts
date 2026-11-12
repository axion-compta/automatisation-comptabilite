import { type Canal, type Role } from '../securite/types.js';

// Règle de qui peut clôturer et avec quel accord. Pur : ne branche rien (geste G02 hors périmètre).

export type RaisonRefusCloture =
  | 'chat_seul'
  | 'role_insuffisant'
  | 'reauthentification_requise'
  | 'accord_expert_requis'
  | 'confirmation_renforcee_requise';

export type AccordExpert =
  | {
      type: 'approbation';
      par: string;
      role: Role;
      reauthRecente: boolean;
      horodatage: string;
      societeId: string;
      exerciceId: string;
    }
  | { type: 'document'; empreinte: string; rattacheA: string };

export interface Confirmation {
  id: string;
  horodatage: string;
}

export interface DemandeCloture {
  societeId: string;
  exerciceId: string;
  auteur: { personneId: string; role: Role; reauthRecente: boolean };
  canal: Canal;
  expertActif: boolean;
  accord?: AccordExpert;
  confirmations?: readonly Confirmation[];
  responsabiliteAcceptee?: boolean;
  /** Confirmation faite à l'écran : seule façon de clôturer depuis le chat ou la voix. */
  confirmeeAEcran?: boolean;
  /** Instant de la décision, fourni par l'appelant. */
  maintenant?: string;
}

export interface TraceCloture {
  auteur: string;
  accord?: AccordExpert;
  confirmations?: readonly Confirmation[];
  horodatage: string | null;
}

export type DecisionCloture =
  | { permis: true; trace: TraceCloture }
  | { permis: false; raison: RaisonRefusCloture };

const refus = (raison: RaisonRefusCloture): DecisionCloture => ({ permis: false, raison });
const texte = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const EMPREINTE_SHA256 = /^[0-9a-f]{64}$/;

function accordValide(d: DemandeCloture): boolean {
  const a = d.accord;
  if (a === undefined) return false;
  if (a.type === 'approbation') {
    return (
      texte(a.par) &&
      a.role === ('comptable' satisfies Role) &&
      a.reauthRecente === true &&
      texte(a.horodatage) &&
      a.societeId === d.societeId &&
      a.exerciceId === d.exerciceId
    );
  }
  if (a.type === 'document') {
    return (
      typeof a.empreinte === 'string' &&
      EMPREINTE_SHA256.test(a.empreinte) &&
      a.rattacheA === d.exerciceId
    );
  }
  return false;
}

function confirmationsValides(d: DemandeCloture): boolean {
  const c = d.confirmations ?? [];
  if (d.responsabiliteAcceptee !== true || c.length < 2) return false;
  if (!c.every((x) => texte(x.id) && texte(x.horodatage))) return false;
  return new Set(c.map((x) => x.id)).size >= 2;
}

export function autoriserCloture(d: DemandeCloture): DecisionCloture {
  const { auteur } = d;
  if ((d.canal === 'chat' || d.canal === 'voix') && d.confirmeeAEcran !== true) return refus('chat_seul');
  const comptable: Role = 'comptable';
  const administrateur: Role = 'administrateur';
  if (auteur.role !== comptable && auteur.role !== administrateur) return refus('role_insuffisant');
  if (auteur.reauthRecente !== true) return refus('reauthentification_requise');
  const maintenant = d.maintenant ?? null;

  if (auteur.role === comptable) {
    return { permis: true, trace: { auteur: auteur.personneId, horodatage: maintenant } };
  }
  if (d.expertActif) {
    if (!accordValide(d) || d.accord === undefined) return refus('accord_expert_requis');
    const horodatage = d.accord.type === 'approbation' ? d.accord.horodatage : maintenant;
    return { permis: true, trace: { auteur: auteur.personneId, accord: d.accord, horodatage } };
  }
  if (!confirmationsValides(d) || d.confirmations === undefined) return refus('confirmation_renforcee_requise');
  const derniere = d.confirmations.map((c) => c.horodatage).sort().at(-1) ?? null;
  return {
    permis: true,
    trace: { auteur: auteur.personneId, confirmations: d.confirmations, horodatage: derniere },
  };
}
