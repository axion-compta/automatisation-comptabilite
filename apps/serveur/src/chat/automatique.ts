// Actions automatiques (L05-T65) : liste vide par défaut, niveau B réversible seulement.
// Écrit contre une interface de la console (faux service pour l'essai) : aucun réglage ni adresse ici.
import type { Niveau } from '../../../../packages/noyau/src/chat/types.js';

export type Classement = 'automatique' | 'brouillon';
export interface PortConsoleAuto {
  lireManifeste(): Promise<{ actionsAutomatiquesAutorisees?: unknown }>;
  classerAction(outil: string, niveau: Niveau): Promise<unknown>;
}
export type RegistreAuto = Readonly<Record<string, { niveau: Niveau; reversible: boolean }>>;
export interface JournalAuto {
  noter(l: { acteur: string; evenement: 'chat.automatique' | 'chat.annulation'; outil: string; niveau: Niveau }): void;
}
export interface ActionAuto { outil: string; niveau: Niveau; appliquer(): Promise<void>; annuler(): Promise<void> }
export interface DepsAuto { console: PortConsoleAuto; journal: JournalAuto; registre: RegistreAuto; agent: string }
export interface ResultatAuto { etat: 'rien' | 'brouillon' | 'automatique'; annuler?: () => Promise<void> }

export class ErreurAuto extends Error {
  constructor(readonly code: 'liste_refusee' | 'niveau_refuse' | 'agent_invalide') { super(code); }
}

const FORME_AGENT = /^[a-z][a-z0-9_]*$/;
const admissible = (r: RegistreAuto, outil: string): boolean => Object.hasOwn(r, outil) && r[outil]!.niveau === 'B' && r[outil]!.reversible;

/** Refuse toute entrée qui n'est pas une action connue de niveau B réversible (M, I, irréversible, inconnue). */
export function verifierListe(liste: readonly string[], registre: RegistreAuto): void {
  for (const outil of liste) if (!admissible(registre, outil)) throw new ErreurAuto('liste_refusee');
}

async function lireListe(port: PortConsoleAuto): Promise<readonly string[]> {
  try {
    const l = (await port.lireManifeste()).actionsAutomatiquesAutorisees;
    return Array.isArray(l) && l.every((x) => typeof x === 'string' && x !== '') ? (l as string[]) : [];
  } catch {
    return [];
  }
}

async function classer(port: PortConsoleAuto, outil: string, niveau: Niveau): Promise<Classement> {
  try {
    return (await port.classerAction(outil, niveau)) === 'automatique' ? 'automatique' : 'brouillon';
  } catch {
    return 'brouillon';
  }
}

export async function executerAutomatique(d: DepsAuto, action: ActionAuto): Promise<ResultatAuto> {
  if (!FORME_AGENT.test(d.agent)) throw new ErreurAuto('agent_invalide');
  const liste = await lireListe(d.console);
  if (!liste.includes(action.outil)) return { etat: 'rien' };
  verifierListe(liste, d.registre);
  if (action.niveau !== 'B') throw new ErreurAuto('niveau_refuse');
  if ((await classer(d.console, action.outil, action.niveau)) !== 'automatique') return { etat: 'brouillon' };
  const acteur = `agent:${d.agent}`;
  const { outil, niveau } = action;
  await action.appliquer();
  try {
    d.journal.noter({ acteur, evenement: 'chat.automatique', outil, niveau });
  } catch (e) {
    await action.annuler();
    throw e;
  }
  let annulee = false;
  const annuler = async (): Promise<void> => {
    if (annulee) return;
    annulee = true;
    await action.annuler();
    d.journal.noter({ acteur, evenement: 'chat.annulation', outil, niveau });
  };
  return { etat: 'automatique', annuler };
}
