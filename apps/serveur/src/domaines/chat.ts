import { implement, ORPCError } from '@orpc/server';
import { contratChat } from '../../../../packages/contrat/src/routes.js';
import { encoderEvenement } from '../../../../packages/contrat/src/chat/flux.js';
import type { DemandeMessage, Evenement } from '../../../../packages/contrat/src/chat/evenements.js';
import { genererChat } from '../../../../packages/donnees-fictives/src/chat.js';
import { reglageEntier } from '../../../../packages/parametres/src/reglages-chat.js';
import { microCentimes } from '../../../../packages/noyau/src/chat/types.js';
import { executerTour, type ContexteTour, type ReglagesTour } from '../chat/tour.js';
import type { ModeleTexte } from '../ia/appel.js';
import { identifier, traduire, type OptionsIdentite } from '../chat/identite.js';

const ALIAS = 'simule';
const LECTURE = '{"outil":"exercices.lister","arguments":{}}';
export interface OptionsChat {
  /** Société du serveur : jamais lue dans la requête. */
  societe?: string;
  identite?: OptionsIdentite;
  /** Appelée avant chaque événement (rang à partir de 1) : permet de suspendre un tour dans les tests. */
  attendre?: (rang: number) => Promise<void> | undefined;
}

/** Service en mémoire SANS modèle : tour scripté depuis les données fictives (L05-T36). */
export function creerServiceChat(options: OptionsChat = {}) {
  const societe = options.societe ?? 'soc_a';
  const texte = genererChat().messages.find((m) => m.societe === societe && m.role === 'assistant')?.texte ?? 'Réponse d’essai';
  const exercices = [{ id: 'ex_fictif', libelle: 'Exercice fictif' }];
  // Modèle simulé : une lecture, puis la réponse enregistrée. Gratuit, zéro réseau.
  const port: ModeleTexte = {
    completer: (_a, entree) => Promise.resolve({ texte: entree.includes('appel_1') ? texte : LECTURE, jetons: 0, coutMicroCentimes: 0, modele: ALIAS, version: ALIAS }),
  };
  const jour = new Date().toISOString().slice(0, 10);
  const reglages: ReglagesTour = {
    principal: ALIAS, listeFermee: [ALIAS], delaiMs: reglageEntier('ia.delai_secours_ms', jour),
    plafond: microCentimes(0), tarifEntree: 0, tarifSortie: 0, plafondJetonsSortie: 0, etapesMax: reglageEntier('chat.plan_etapes_max', jour),
    lexique: [], sorteAgent: 'chat', roleLectureSeule: true, detecteurSensibles: () => ({ zones: [] }),
  };
  const reponses = new Map<string, Promise<string>>();
  const motifs = new Map<string, string>();
  const arretes = new Set<string>();
  const ouvertures = new Map<string, { promesse: Promise<void>; ouvrir: () => void }>();
  let appels = 0;

  const ouverture = (id: string) => {
    let o = ouvertures.get(id);
    if (!o) {
      let ouvrir: () => void = () => undefined;
      o = { promesse: new Promise<void>((res) => (ouvrir = res)), ouvrir };
      ouvertures.set(id, o);
    }
    return o;
  };

  async function jouer(demande: DemandeMessage): Promise<string> {
    const id = demande.message_id;
    appels++;
    ouverture(id).ouvrir();
    const contexte: ContexteTour = { puces: demande.puces, societeSession: societe, societeConversation: societe, appartenance: () => societe, executer: () => ({ exercices }) };
    const sortie: string[] = [];
    let rang = 0;
    let finale: Evenement | undefined;
    for await (const evt of executerTour({ demande, contexte, port, reglages, journal: () => undefined })) {
      if (evt.type === 'tour.fin') finale = evt;
      if (finale) break;
      await options.attendre?.(rang + 1);
      if (arretes.has(id)) break;
      sortie.push(encoderEvenement(++rang, evt));
    }
    const arrete = arretes.has(id);
    if (arrete) motifs.set(id, 'arret');
    const fin = finale && !arrete ? { ...finale, id: rang + 1 } : { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 };
    sortie.push(encoderEvenement(rang + 1, fin as Evenement));
    return sortie.join('');
  }

  return {
    identite: options.identite,
    envoyer(demande: DemandeMessage): Promise<string> {
      let r = reponses.get(demande.message_id);
      if (!r) reponses.set(demande.message_id, (r = jouer(demande)));
      return r;
    },
    arreter(id: string): boolean {
      if (!reponses.has(id)) return false;
      arretes.add(id);
      return true;
    },
    tourOuvert: (id: string): Promise<void> => ouverture(id).promesse,
    motifFin: (id: string): string | undefined => motifs.get(id),
    appelsIa: (): number => appels,
    /** Aucune écriture comptable n'est jamais appliquée par ce service. */
    ecrituresAppliquees: (): number => 0,
  };
}

export type ServiceChat = ReturnType<typeof creerServiceChat>;

export function implementerChat(os: ReturnType<typeof implement<typeof contratChat>>, service: ServiceChat) {
  return {
    envoyerMessage: os.chat.envoyerMessage.handler(async ({ input, errors }) => {
      if (service.identite) await identifier(service.identite, input.headers, input.params.s).catch((e: unknown) => traduire(errors, e));
      if (input.headers['idempotency-key'] !== input.body.message_id) throw new ORPCError('BAD_REQUEST', { message: 'cle_differente_du_message' });
      return new Blob([await service.envoyer(input.body)], { type: 'text/event-stream' });
    }),
    arreterTour: os.chat.arreterTour.handler(async ({ input, errors }) => {
      if (service.identite) await identifier(service.identite, input.headers, input.params.s).catch((e: unknown) => traduire(errors, e));
      if (!service.arreter(input.params.id)) throw errors.TOUR_INCONNU();
      return { body: { tour_id: input.params.id, arrete: true as const } };
    }),
  };
}
