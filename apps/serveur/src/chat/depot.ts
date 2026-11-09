// Dépôt du chat : interface et adaptateur d'essai (mémoire) ; l'adaptateur SQL se branchera derrière la même interface.
export type CodeErreurDepot = 'autre_societe' | 'inconnu' | 'doublon' | 'proposition_non_proposee';
export class ErreurDepotChat extends Error {
  override name = 'ErreurDepotChat';
  constructor(readonly code: CodeErreurDepot) { super(code); }
}

export type Conversation = { id: string; societeId: string; creeLe: string };
export type Message = { id: string; societeId: string; conversationId: string; parentId: string | null; role: 'personne' | 'assistant'; texte: string; le: string };
export type Etape = { id: string; societeId: string; messageId: string; code: string; le: string };
export type Preference = { societeId: string; cle: string; valeur: string; oubliee: boolean };
export type PropositionStockee = {
  id: string; societeId: string; conversationId: string; etat: 'proposee' | 'appliquee' | 'annulee' | 'expiree';
  avant: unknown; apres: unknown; cibles: readonly string[]; expireLe: string; appliqueLe?: string;
};

export interface DepotChat {
  creerConversation(c: Conversation): void;
  lireConversation(societeId: string, id: string): Conversation | undefined;
  ajouterMessage(m: Message): void;
  enfants(societeId: string, conversationId: string, parentId: string | null): readonly Message[];
  ajouterEtape(e: Etape): void;
  etapes(societeId: string, messageId: string): readonly Etape[];
  poserPreference(societeId: string, cle: string, valeur: string): void;
  oublierPreference(societeId: string, cle: string): void;
  preferencesUtilisables(societeId: string): readonly Preference[];
  enregistrerProposition(p: PropositionStockee): void;
  lireProposition(societeId: string, id: string): PropositionStockee | undefined;
  /** Une transaction : la proposition passe à appliquée et `ecrire` ajoute ses étapes ; si `ecrire` échoue, rien n'est gardé. */
  appliquerAtomique(societeId: string, id: string, le: string, ecrire: (tx: Pick<DepotChat, 'ajouterEtape'>) => void): PropositionStockee;
}

const copie = <T>(v: T): T => structuredClone(v);
const cle = (...p: string[]): string => JSON.stringify(p);

export function creerDepotChatMemoire(): DepotChat {
  const etat = {
    conversations: new Map<string, Conversation>(), messages: new Map<string, Message>(), etapes: new Map<string, Etape>(),
    preferences: new Map<string, Preference>(), propositions: new Map<string, PropositionStockee>(),
  };
  const inconnu = (): never => { throw new ErreurDepotChat('inconnu'); };
  const unique = <T>(m: Map<string, T>, k: string, v: T): void => {
    if (m.has(k)) throw new ErreurDepotChat('doublon');
    m.set(k, copie(v));
  };
  const exigerConversation = (societeId: string, id: string): void => {
    if (!etat.conversations.has(cle(societeId, id))) inconnu();
  };

  const depot: DepotChat = {
    creerConversation: (c) => unique(etat.conversations, cle(c.societeId, c.id), c),
    lireConversation: (s, id) => copie(etat.conversations.get(cle(s, id))),
    ajouterMessage(m) {
      exigerConversation(m.societeId, m.conversationId);
      if (m.parentId !== null) {
        const p = etat.messages.get(cle(m.societeId, m.parentId));
        if (p === undefined) inconnu();
        else if (p.conversationId !== m.conversationId) throw new ErreurDepotChat('autre_societe');
      }
      unique(etat.messages, cle(m.societeId, m.id), m);
    },
    enfants: (s, conv, parent) => [...etat.messages.values()]
      .filter((m) => m.societeId === s && m.conversationId === conv && m.parentId === parent)
      .sort((a, b) => a.le.localeCompare(b.le)).map(copie),
    ajouterEtape(e) {
      if (!etat.messages.has(cle(e.societeId, e.messageId))) inconnu();
      unique(etat.etapes, cle(e.societeId, e.id), e);
    },
    etapes: (s, messageId) => [...etat.etapes.values()].filter((e) => e.societeId === s && e.messageId === messageId).map(copie),
    poserPreference: (s, c, v) => { etat.preferences.set(cle(s, c), { societeId: s, cle: c, valeur: v, oubliee: false }); },
    oublierPreference(s, c) {
      const p = etat.preferences.get(cle(s, c));
      if (p === undefined) inconnu();
      else p.oubliee = true;
    },
    preferencesUtilisables: (s) => [...etat.preferences.values()].filter((p) => p.societeId === s && !p.oubliee).map(copie),
    enregistrerProposition(p) {
      exigerConversation(p.societeId, p.conversationId);
      unique(etat.propositions, cle(p.societeId, p.id), p);
    },
    lireProposition: (s, id) => copie(etat.propositions.get(cle(s, id))),
    appliquerAtomique(s, id, le, ecrire) {
      const p = etat.propositions.get(cle(s, id));
      if (p === undefined) return inconnu();
      if (p.etat !== 'proposee') throw new ErreurDepotChat('proposition_non_proposee');
      const instantane = new Map(etat.etapes);
      try {
        ecrire({ ajouterEtape: depot.ajouterEtape });
      } catch (e) {
        etat.etapes = instantane;
        throw e;
      }
      Object.assign(p, { etat: 'appliquee', appliqueLe: le });
      return copie(p);
    },
  };
  return depot;
}
