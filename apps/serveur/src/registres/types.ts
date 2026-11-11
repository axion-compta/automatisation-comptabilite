import { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import type { ContexteSession, FournisseurSession, ServiceControlesActions } from '../domaines/controles-actions.js';
import type { OptionsAbonnement } from '../domaines/options-abonnement.js';
import type { OptionsExploitation } from '../domaines/options-exploitation.js';
import type { ServiceChat } from '../domaines/chat.js';
import type { ServicePropositions } from '../domaines/chat-propositions.js';
import type { OptionsSecurite } from '../securite/index.js';

export const fabriqueOs = (c: typeof contrat) => implement(c).$context<ContexteSession>();

/** Fabrique oRPC liée au contrat complet (socle + modules) et au contexte de session. */
export type OsContrat = ReturnType<typeof fabriqueOs>;

/** Options de `creerRouteur` (sans `session`, que seul `creerApp` utilise). */
export type OptionsRouteur = {
  abonnement?: OptionsAbonnement;
  exploitation?: OptionsExploitation;
  chat?: ServiceChat;
  propositions?: ServicePropositions;
  controlesActions?: ServiceControlesActions;
  securite?: OptionsSecurite;
};

/** Options propres aux modules : chaque lot la complète par fusion de déclaration. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OptionsModules {}

/** Options de `creerApp` : celles du routeur, celles des modules et le fournisseur de session. */
export type OptionsApp = OptionsRouteur & OptionsModules & { session?: FournisseurSession };
