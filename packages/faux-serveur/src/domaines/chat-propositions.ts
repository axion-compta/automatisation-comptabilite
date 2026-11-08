import { http, HttpResponse, type HttpHandler } from 'msw';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import type { AppelIa, DecisionIa } from '../../../contrat/src/chat/journal-ia.js';
import type { PropositionVue } from '../../../contrat/src/domaines/chat-propositions.js';
import { appliquer, creerProposition, type EntreeProposition, type Proposition } from '../../../noyau/src/chat/proposition.js';
import { annuler, modeAnnulation } from '../../../noyau/src/chat/annulation.js';
import { ErreurChat, type Acteur } from '../../../noyau/src/chat/types.js';
import { genererChat } from '../../../donnees-fictives/src/chat.js';

const MINUTE_MS = 60_000;
/** Durées d'essai, en attendant les réglages datés (le scénario peut les remplacer). */
const REGLAGES_ESSAI = { validiteMs: 30 * MINUTE_MS, toastMs: 10 * MINUTE_MS, historiqueMs: 60 * MINUTE_MS };

export type NouvelleProposition = Omit<EntreeProposition, 'creeLe' | 'dureeMs'>;
/** Acteur et horloge viennent de la configuration (scénarios « compte de service », « horloge avancée »), jamais de la requête ; `ajouts` remplace le jeu fictif de L05-T36. */
export interface OptionsPropositionsFaux {
  acteur?: Acteur;
  horloge?: () => string;
  reglages?: typeof REGLAGES_ESSAI;
  ajouts?: NouvelleProposition[];
}

interface Fiche { proposition: Proposition; etatObjet: unknown; appliqueLe?: string; cleAnnulation?: string; decision: DecisionIa; appel: AppelIa }

const TYPEES: Record<string, [string, number]> = {
  proposition_inconnue: ['PROPOSITION_INCONNUE', 404],
  acteur_non_humain: ['ACTEUR_NON_HUMAIN', 403],
  proposition_expiree: ['PROPOSITION_EXPIREE', 409],
  niveau_ferme: ['NIVEAU_FERME', 423],
  annulation_expiree: ['ANNULATION_EXPIREE', 409],
};
const erreur = (code: string, status: number, defined: boolean) => HttpResponse.json({ defined, code, status, message: code }, { status });

/** Faux serveur des propositions : mêmes réponses et mêmes erreurs que le serveur en mémoire ; magasin neuf à chaque création. */
export function creerHandlersChatPropositions(base: string, attendre: () => Promise<void>, options: OptionsPropositionsFaux = {}): HttpHandler[] {
  const acteur = options.acteur ?? 'personne';
  const horloge = options.horloge ?? (() => new Date().toISOString());
  const { validiteMs, toastMs, historiqueMs } = options.reglages ?? REGLAGES_ESSAI;
  const fiches = new Map<string, Fiche>();

  const ajouter = (e: NouvelleProposition, creeLe: string): void => {
    const rattache = { conversation_id: 'conv-fictive-1' };
    fiches.set(e.id, {
      proposition: creerProposition({ ...e, creeLe, dureeMs: validiteMs }),
      etatObjet: e.avant,
      decision: {
        id: `dec-${e.id}`, quand: new Date(Date.parse(creeLe)).toISOString(), agent: 'agent_chat', etape: 'proposition_prete', demandeur: { sorte: 'personne', id: 'personne-fictive-1' }, ...rattache,
        objet: { type: 'ecriture', id: e.cibles[0] ?? e.id }, proposition: e.outil, source_proposition: 'regle_societe', confiance: 'a_verifier', motif: 'Règle de la société (exemple fictif)', sources_legales: [], appel_id: `appel-${e.id}`, cout_micro_centimes: 0,
      },
      appel: { id: `appel-${e.id}`, agent: 'agent_chat', ...rattache, alias: 'modele_essai', modele: 'modele_fictif', version_modele: 'v0', fournisseur: 'faux_fournisseur', region: 'ue', jetons_entree: 0, jetons_sortie: 0, cout_micro_centimes: 0, duree_ms: 0, issue: 'ok' },
    });
  };
  if (options.ajouts) for (const e of options.ajouts) ajouter(e, horloge());
  else for (const p of genererChat().propositions) ajouter({ id: p.id, outil: 'enregistrer_ecriture', niveau: 'B', cibles: [p.id], avant: { montantCentimes: 0 }, apres: { montantCentimes: p.montantCentimes } }, `${p.le}T08:00:00.000Z`);

  const trouver = (id: string): Fiche => fiches.get(id) ?? ((): never => { throw new ErreurChat('proposition_inconnue'); })();
  const vue = (f: Fiche): PropositionVue => {
    const { id, outil, niveau, etat, nombreObjets, creeLe, expireLe } = f.proposition;
    return { id, outil, niveau, etat, nombre_objets: nombreObjets, cree_le: creeLe, expire_le: expireLe, ...(f.appliqueLe ? { applique_le: f.appliqueLe } : {}) };
  };

  function appliquerProposition(id: string, cle: string): PropositionVue {
    const f = trouver(id);
    const r = appliquer(f.proposition, { acteur, cle, maintenant: horloge(), niveauIOuvert: false });
    if (r.effet === 'applique') Object.assign(f, { proposition: r.proposition, appliqueLe: horloge(), etatObjet: r.proposition.apres });
    return vue(f);
  }

  function annulerProposition(id: string, cle: string): PropositionVue {
    const f = trouver(id);
    if (f.proposition.etat === 'annulee' && f.cleAnnulation === cle) return vue(f);
    if (f.proposition.etat === 'annulee') throw new ErreurChat('parametre_invalide');
    if (f.proposition.etat !== 'appliquee' || f.appliqueLe === undefined) throw new ErreurChat('proposition_inconnue');
    if (modeAnnulation({ appliqueLe: f.appliqueLe, maintenant: horloge(), objetValideOuEnvoye: false, toastMs, historiqueMs }) === 'contre_passation') throw new ErreurChat('annulation_expiree');
    f.etatObjet = annuler(f.etatObjet, f.proposition.apres, f.proposition.avant);
    Object.assign(f, { proposition: { ...f.proposition, etat: 'annulee' }, cleAnnulation: cle });
    return vue(f);
  }

  /** Valide la clé d'idempotence (écritures), exécute, traduit les erreurs du noyau comme le vrai serveur. */
  const repondre = async (request: Request, ecriture: boolean, f: () => unknown) => {
    await attendre();
    if (ecriture && !EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined }).success) return erreur('BAD_REQUEST', 400, false);
    try {
      return HttpResponse.json({ body: f() });
    } catch (e) {
      if (!(e instanceof ErreurChat)) throw e;
      const [code, status] = TYPEES[e.code] ?? ['BAD_REQUEST', 400];
      return erreur(code, status, e.code in TYPEES);
    }
  };
  const cle = (r: Request) => r.headers.get('idempotency-key') ?? '';
  const chemin = base + '/chat/propositions/:id';

  return [
    http.get(chemin, ({ request, params }) => repondre(request, false, () => vue(trouver(String(params['id']))))),
    http.get(chemin + '/pourquoi', ({ request, params }) => repondre(request, false, () => ({ decision: trouver(String(params['id'])).decision, appel: trouver(String(params['id'])).appel }))),
    http.post(chemin + '/appliquer', ({ request, params }) => repondre(request, true, () => appliquerProposition(String(params['id']), cle(request)))),
    http.post(chemin + '/annuler', ({ request, params }) => repondre(request, true, () => annulerProposition(String(params['id']), cle(request)))),
  ];
}
