import { implement, ORPCError } from '@orpc/server';
import { contratChat } from '../../../../packages/contrat/src/routes.js';
import type { AppelIa, DecisionIa } from '../../../../packages/contrat/src/chat/journal-ia.js';
import type { PropositionVue } from '../../../../packages/contrat/src/domaines/chat-propositions.js';
import { appliquer, creerProposition, type EntreeProposition, type Proposition } from '../../../../packages/noyau/src/chat/proposition.js';
import { annuler, modeAnnulation } from '../../../../packages/noyau/src/chat/annulation.js';
import { ErreurChat, type Acteur } from '../../../../packages/noyau/src/chat/types.js';
import { genererChat } from '../../../../packages/donnees-fictives/src/chat.js';

/** Réglages injectés (L05-T54 viendra les fournir) : validité de la proposition, fenêtres d'annulation. */
export interface ReglagesPropositions { validiteMs: number; toastMs: number; historiqueMs: number }
export interface OptionsPropositions {
  /** Acteur du serveur : injecté à la création, jamais lu dans la requête (aucun en-tête ne le choisit). */
  acteur: Acteur;
  horloge: () => string;
  reglages: ReglagesPropositions;
}
export type NouvelleProposition = Omit<EntreeProposition, 'creeLe' | 'dureeMs'>;

const MINUTE_MS = 60_000;
/** Valeurs d'essai du serveur par défaut, en attendant les réglages datés. */
const REGLAGES_ESSAI: ReglagesPropositions = { validiteMs: 30 * MINUTE_MS, toastMs: 10 * MINUTE_MS, historiqueMs: 60 * MINUTE_MS };

interface Fiche { proposition: Proposition; etatObjet: unknown; appliqueLe?: string; cleAnnulation?: string; decision: DecisionIa; appel: AppelIa }

const optionsParDefaut = (): OptionsPropositions => ({ acteur: 'personne', horloge: () => new Date().toISOString(), reglages: REGLAGES_ESSAI });

/** Service en mémoire : propositions du jeu fictif (L05-T36), acteur et horloge injectés, niveau I fermé. */
export function creerServicePropositions(options: OptionsPropositions = optionsParDefaut()) {
  const fiches = new Map<string, Fiche>();
  const inconnue = () => new ErreurChat('proposition_inconnue');
  const trouver = (id: string): Fiche => fiches.get(id) ?? ((): never => { throw inconnue(); })();
  const vue = (f: Fiche): PropositionVue => {
    const { id, outil, niveau, etat, nombreObjets, creeLe, expireLe } = f.proposition;
    return { id, outil, niveau, etat, nombre_objets: nombreObjets, cree_le: creeLe, expire_le: expireLe, ...(f.appliqueLe ? { applique_le: f.appliqueLe } : {}) };
  };

  function ajouter(e: NouvelleProposition, creeLe: string = options.horloge()): void {
    const proposition = creerProposition({ ...e, creeLe, dureeMs: options.reglages.validiteMs });
    const rattache = { conversation_id: 'conv-fictive-1' };
    const decision: DecisionIa = {
      id: `dec-${e.id}`, quand: new Date(Date.parse(creeLe)).toISOString(), agent: 'agent_chat', etape: 'proposition_prete', demandeur: { sorte: 'personne', id: 'personne-fictive-1' }, ...rattache,
      objet: { type: 'ecriture', id: e.cibles[0] ?? e.id }, proposition: e.outil, source_proposition: 'regle_societe', confiance: 'a_verifier', motif: 'Règle de la société (exemple fictif)', sources_legales: [], appel_id: `appel-${e.id}`, cout_micro_centimes: 0,
    };
    const appel: AppelIa = { id: `appel-${e.id}`, agent: 'agent_chat', ...rattache, alias: 'modele_essai', modele: 'modele_fictif', version_modele: 'v0', fournisseur: 'faux_fournisseur', region: 'ue', jetons_entree: 0, jetons_sortie: 0, cout_micro_centimes: 0, duree_ms: 0, issue: 'ok' };
    fiches.set(e.id, { proposition, etatObjet: e.avant, decision, appel });
  }

  for (const p of genererChat().propositions) ajouter({ id: p.id, outil: 'enregistrer_ecriture', niveau: 'B', cibles: [p.id], avant: { montantCentimes: 0 }, apres: { montantCentimes: p.montantCentimes } }, `${p.le}T08:00:00.000Z`);

  /** Même clé : même réponse ; une autre clé sur un objet déjà traité est refusée. */
  function appliquerProposition(id: string, cle: string): PropositionVue {
    const f = trouver(id);
    const r = appliquer(f.proposition, { acteur: options.acteur, cle, maintenant: options.horloge(), niveauIOuvert: false });
    if (r.effet === 'applique') Object.assign(f, { proposition: r.proposition, appliqueLe: options.horloge(), etatObjet: r.proposition.apres });
    return vue(f);
  }

  function annulerProposition(id: string, cle: string): PropositionVue {
    const f = trouver(id);
    if (f.proposition.etat === 'annulee' && f.cleAnnulation === cle) return vue(f);
    if (f.proposition.etat === 'annulee') throw new ErreurChat('parametre_invalide');
    if (f.proposition.etat !== 'appliquee' || f.appliqueLe === undefined) throw inconnue();
    const { toastMs, historiqueMs } = options.reglages;
    const mode = modeAnnulation({ appliqueLe: f.appliqueLe, maintenant: options.horloge(), objetValideOuEnvoye: false, toastMs, historiqueMs });
    if (mode === 'contre_passation') throw new ErreurChat('annulation_expiree');
    f.etatObjet = annuler(f.etatObjet, f.proposition.apres, f.proposition.avant);
    Object.assign(f, { proposition: { ...f.proposition, etat: 'annulee' }, cleAnnulation: cle });
    return vue(f);
  }

  return {
    ajouter,
    lireProposition: (id: string): PropositionVue => vue(trouver(id)),
    appliquerProposition,
    annulerProposition,
    pourquoi: (id: string) => ({ decision: trouver(id).decision, appel: trouver(id).appel }),
    etatObjet: (id: string): unknown => trouver(id).etatObjet,
  };
}

export type ServicePropositions = ReturnType<typeof creerServicePropositions>;

const TYPEES: Record<string, string> = { proposition_inconnue: 'PROPOSITION_INCONNUE', acteur_non_humain: 'ACTEUR_NON_HUMAIN', proposition_expiree: 'PROPOSITION_EXPIREE', niveau_ferme: 'NIVEAU_FERME', annulation_expiree: 'ANNULATION_EXPIREE' };

/** Traduit les erreurs du noyau en erreurs typées du contrat. */
function proteger<T>(errors: Record<string, (o?: object) => Error>, f: () => T): { body: T } {
  try {
    return { body: f() };
  } catch (e) {
    if (!(e instanceof ErreurChat)) throw e;
    const nom = TYPEES[e.code];
    throw nom ? errors[nom]?.() : new ORPCError('BAD_REQUEST', { message: e.code });
  }
}

export function implementerChatPropositions(os: ReturnType<typeof implement<typeof contratChat>>, service: ServicePropositions) {
  const o = os.chatPropositions;
  const err = (e: unknown) => e as Record<string, (o?: object) => Error>;
  return {
    lireProposition: o.lireProposition.handler(({ input, errors }) => proteger(err(errors), () => service.lireProposition(input.params.id))),
    appliquerProposition: o.appliquerProposition.handler(({ input, errors }) => proteger(err(errors), () => service.appliquerProposition(input.params.id, input.headers['idempotency-key']))),
    annulerProposition: o.annulerProposition.handler(({ input, errors }) => proteger(err(errors), () => service.annulerProposition(input.params.id, input.headers['idempotency-key']))),
    pourquoi: o.pourquoi.handler(({ input, errors }) => proteger(err(errors), () => service.pourquoi(input.params.id))),
  };
}
