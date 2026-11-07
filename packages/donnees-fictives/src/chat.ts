// Données fictives du chat à graine fixe (V3-CHT-059, V3-AGT-045). Aucune donnée réelle, aucun prix.
// Listes fermées recopiées de L05-T00 (comparées par test) : cette fiche n'importe pas le noyau.
import { creerAlea, GRAINE } from './generateur.js';

export const ETATS_PROPOSITION = ['proposee', 'appliquee', 'annulee', 'expiree', 'refusee'] as const;
export const SOURCES_PROPOSITION = ['regle_societe', 'historique', 'ia_exemples', 'ia_seule'] as const;
export const CONFIANCES = ['sur', 'a_verifier', 'douteux'] as const;
export const ISSUES_APPEL_IA = ['ok', 'secours', 'refus_gardien', 'hors_schema', 'arret'] as const;

export const SOCIETES_CHAT = ['soc_a', 'soc_b'] as const;
export const PERSONNES_CHAT: Record<(typeof SOCIETES_CHAT)[number], readonly string[]> = {
  soc_a: ['Dir-A', 'Lec-A'],
  soc_b: ['Dir-B'],
};
export const FOURNISSEURS_CHAT = ['Fournil Exemple', 'Papeterie Test'] as const;
export const ANNEE_CHAT = 2031;

type Societe = (typeof SOCIETES_CHAT)[number];

export interface ConversationFictive { id: string; societe: Societe; personne: string; ouverteLe: string }
export interface MessageFictif { id: string; conversation: string; societe: Societe; auteur: string; role: 'personne' | 'assistant'; le: string; texte: string }
export interface PropositionFictive { id: string; conversation: string; message: string; societe: Societe; etat: (typeof ETATS_PROPOSITION)[number]; fournisseur: string; montantCentimes: number; le: string }
export interface DecisionFictive { id: string; proposition: string; societe: Societe; source: (typeof SOURCES_PROPOSITION)[number]; confiance: (typeof CONFIANCES)[number]; le: string }
export interface AppelFictif { id: string; conversation: string; societe: Societe; issue: (typeof ISSUES_APPEL_IA)[number]; tokensEntree: number; tokensSortie: number; dureeMs: number; le: string }
export interface JeuChat {
  conversations: ConversationFictive[];
  messages: MessageFictif[];
  propositions: PropositionFictive[];
  decisions: DecisionFictive[];
  appels: AppelFictif[];
}

export function genererChat(graine: number = GRAINE): JeuChat {
  const alea = creerAlea(graine);
  const tirer = (n: number): number => Math.floor(alea() * n);
  const pris = new Set<string>();
  const id = (prefixe: string): string => {
    let c: string;
    do c = prefixe + tirer(0x100000000).toString(16).padStart(8, '0');
    while (pris.has(c));
    pris.add(c);
    return c;
  };
  const date = (): string => `${ANNEE_CHAT}-${String(1 + tirer(12)).padStart(2, '0')}-${String(1 + tirer(28)).padStart(2, '0')}`;
  const choix = <T>(l: readonly T[]): T => l[tirer(l.length)] as T;

  const cibles: Societe[] = ['soc_a', 'soc_a', 'soc_a', 'soc_b'];
  const conversations = cibles.map((societe): ConversationFictive => ({
    id: id('cnv_'), societe, personne: choix(PERSONNES_CHAT[societe]), ouverteLe: date(),
  }));
  const messages = Array.from({ length: 20 }, (_, i): MessageFictif => {
    const c = conversations[i % 4] as ConversationFictive;
    const humain = i % 8 < 4;
    const fournisseur = choix(FOURNISSEURS_CHAT);
    return {
      id: id('msg_'), conversation: c.id, societe: c.societe, auteur: humain ? c.personne : 'assistant',
      role: humain ? 'personne' : 'assistant', le: date(),
      texte: humain ? `Facture de ${fournisseur} à enregistrer` : `Proposition pour ${fournisseur}`,
    };
  });
  const propositions = ETATS_PROPOSITION.map((etat, i): PropositionFictive => {
    const m = messages[i * 3] as MessageFictif;
    return {
      id: id('prp_'), conversation: m.conversation, message: m.id, societe: m.societe, etat,
      fournisseur: choix(FOURNISSEURS_CHAT), montantCentimes: 100 + tirer(500000), le: date(),
    };
  });
  const decisions = Array.from({ length: 10 }, (_, i): DecisionFictive => {
    const p = propositions[i % 5] as PropositionFictive;
    return { id: id('dec_'), proposition: p.id, societe: p.societe, source: SOURCES_PROPOSITION[i % 4] as DecisionFictive['source'], confiance: CONFIANCES[i % 3] as DecisionFictive['confiance'], le: date() };
  });
  const appels = Array.from({ length: 10 }, (_, i): AppelFictif => {
    const c = conversations[i % 4] as ConversationFictive;
    return {
      id: id('app_'), conversation: c.id, societe: c.societe, issue: ISSUES_APPEL_IA[i % 5] as AppelFictif['issue'],
      tokensEntree: 100 + tirer(4000), tokensSortie: 10 + tirer(1000), dureeMs: 50 + tirer(5000), le: date(),
    };
  });
  return { conversations, messages, propositions, decisions, appels };
}
