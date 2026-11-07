import { implement, ORPCError } from '@orpc/server';
import { contratChat } from '../../../../packages/contrat/src/routes.js';
import { encoderEvenement } from '../../../../packages/contrat/src/chat/flux.js';
import type { DemandeMessage, Evenement } from '../../../../packages/contrat/src/chat/evenements.js';
import { genererChat } from '../../../../packages/donnees-fictives/src/chat.js';

type Brut = Evenement extends infer E ? (E extends { id: number } ? Omit<E, 'id'> : never) : never;
export interface OptionsChat {
  /** Société du serveur : jamais lue dans la requête. */
  societe?: string;
  /** Appelée avant chaque événement (rang à partir de 1) : permet de suspendre un tour dans les tests. */
  attendre?: (rang: number) => Promise<void> | undefined;
}

/** Service en mémoire SANS modèle : tour scripté depuis les données fictives (L05-T36). */
export function creerServiceChat(options: OptionsChat = {}) {
  const societe = options.societe ?? 'soc_a';
  const texte = genererChat().messages.find((m) => m.societe === societe && m.role === 'assistant')?.texte ?? 'Réponse d’essai';
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

  async function jouer(id: string): Promise<string> {
    appels++;
    ouverture(id).ouvrir();
    const script: Brut[] = [{ type: 'tour.debut' }, { type: 'etape', etape: 'lecture' }, { type: 'texte', texte }];
    const sortie: string[] = [];
    let rang = 0;
    for (const evt of script) {
      await options.attendre?.(rang + 1);
      if (arretes.has(id)) break;
      sortie.push(encoderEvenement(++rang, evt as Evenement));
    }
    if (arretes.has(id)) motifs.set(id, 'arret');
    sortie.push(encoderEvenement(rang + 1, { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 } as Evenement));
    return sortie.join('');
  }

  return {
    envoyer(demande: DemandeMessage): Promise<string> {
      let r = reponses.get(demande.message_id);
      if (!r) reponses.set(demande.message_id, (r = jouer(demande.message_id)));
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
    envoyerMessage: os.chat.envoyerMessage.handler(async ({ input }) => {
      if (input.headers['idempotency-key'] !== input.body.message_id) throw new ORPCError('BAD_REQUEST', { message: 'cle_differente_du_message' });
      return new Blob([await service.envoyer(input.body)], { type: 'text/event-stream' });
    }),
    arreterTour: os.chat.arreterTour.handler(({ input, errors }) => {
      if (!service.arreter(input.params.id)) throw errors.TOUR_INCONNU();
      return { body: { tour_id: input.params.id, arrete: true as const } };
    }),
  };
}
