import Fastify, { type FastifyInstance } from 'fastify';
import { implement, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fastify';
import { contrat, contratChat } from '../../../packages/contrat/src/routes.js';
import { ConflitVersion, creerService } from '../../../packages/contrat/src/service.js';
import { routesPlan } from './domaines/plan.js';
import { routesPrincipes } from './domaines/principes.js';
import { routesTiers } from './domaines/tiers.js';
import { routesBanque } from './domaines/banque.js';
import { routesTableauDeBord, type ServiceTableauDeBord } from './domaines/tableau-de-bord.js';
import { routesAlertes, type ServiceAlertes } from './domaines/alertes.js';
import { routesPreferences, type ServicePreferences } from './domaines/preferences.js';
import { routesRecherche, type ServiceRecherche } from './domaines/recherche.js';
import { routesExports, type ServiceExports } from './domaines/exports.js';
import { routesCalendrier, type ServiceCalendrier } from './domaines/calendrier.js';
import { routesTva } from './domaines/tva.js';
import { routesNotifications, type ServiceNotifications } from './domaines/notifications.js';
import { implementerAcces } from './domaines/acces.js';
import { implementerVolume } from './domaines/volume.js';
import { implementerPalier } from './domaines/palier.js';
import { routesProfil } from './domaines/profil.js';
import { routesProfilChamps } from './domaines/profil-champs.js';
import { routesProfilChangements } from './domaines/profil-changements.js';
import { creerServiceProfilChangements } from '../../../packages/contrat/src/domaines/profil-changements-service.js';
import { creerServiceProfilChamps } from '../../../packages/contrat/src/domaines/profil-champs-service.js';
import { routesControles, routesFec } from './domaines/fec.js';
import { routesControlesActions, type ContexteSession } from './domaines/controles-actions.js';
import { routesChange } from './domaines/change.js';
import { routesIdentite } from './domaines/identite.js';
import { routesRegimes } from './domaines/regimes.js';
import { routesParametres } from './domaines/parametres.js';
import { genererFrais } from '../../../packages/donnees-fictives/src/frais.js';
import { creerServiceFrais } from '../../../packages/contrat/src/domaines/frais-service.js';
import { creerServiceFraisActions } from '../../../packages/contrat/src/domaines/frais-actions-service.js';
import { routesFrais } from './domaines/frais.js';
import { routesFraisActions } from './domaines/frais-actions.js';
import { configEssai, creerServiceFraisValidation, routesFraisValidation } from './domaines/frais-validation.js';
import { routesVehiculesBareme } from './domaines/vehicules-bareme.js';
import { routesSante } from './domaines/sante.js';
import { implementerPersonnes } from './domaines/personnes.js';
import { implementerSanteExploitation } from './domaines/sante-exploitation.js';
import { routesEcheances } from './domaines/echeances.js';
import { routesBloquants } from './domaines/bloquants.js';
import { routesJuridique } from './domaines/juridique.js';
import { routesSources } from './domaines/sources.js';
import { routesVentes } from './domaines/ventes.js';
import { routesPieces } from './domaines/pieces.js';
import { routesFournisseurs, routesTresorerie } from './domaines/tresorerie.js';
import { creerServiceChat, implementerChat } from './domaines/chat.js';
import { creerServicePropositions, implementerChatPropositions } from './domaines/chat-propositions.js';
import { implementerFinContrat } from './domaines/fin-contrat.js';
import { implementerAcceptations } from './domaines/acceptations.js';
import { routesCapacites } from './domaines/capacites.js';
import { implementerModules } from './registres/index.js';
import type { OptionsApp, OptionsModules, OptionsRouteur } from './registres/types.js';
import { corpsEtatAcces, creerGardeAcces, STATUT_ETAT_ACCES } from './garde-acces.js';
import { brancherSecurite } from './securite/index.js';
import type { ContexteProfil } from './domaines/profil.js';
import { sessionDeRequete, versSessionRoute } from './securite/jeton.js';

type Service = ReturnType<typeof creerService>;

/** Services en mémoire des domaines du lot 15, créés une fois par `creerRouteur` (vides pour l'instant). */
export type Services = {
  tableauDeBord: ServiceTableauDeBord;
  alertes: ServiceAlertes;
  preferences: ServicePreferences;
  recherche: ServiceRecherche;
  exports: ServiceExports;
  calendrier: ServiceCalendrier;
  notifications: ServiceNotifications;
};

/** Routeur oRPC branché sur le service en mémoire du contrat (pas de base de données). */
export function creerRouteur(service: Service = creerService(), services: Partial<Services> = {}, options: OptionsRouteur & OptionsModules = {}) {
  const s: Services = {
    tableauDeBord: services.tableauDeBord ?? {},
    alertes: services.alertes ?? {},
    preferences: services.preferences ?? {},
    recherche: services.recherche ?? {},
    exports: services.exports ?? {},
    calendrier: services.calendrier ?? {},
    notifications: services.notifications ?? {},
  };
  const profilChamps = creerServiceProfilChamps('soc-lemoine');
  const os = implement(contrat).$context<ContexteSession & ContexteProfil>();
  const jeuFrais = genererFrais();
  const routeur = os.router({
    ecritures: {
      lister: os.ecritures.lister.handler(({ input }) => {
        return service.page({ limite: input.query?.limite, decalage: input.query?.decalage });
      }),
      creer: os.ecritures.creer.handler(({ input }) => ({
        body: service.creer(input.headers['idempotency-key'], input.body),
      })),
      modifier: os.ecritures.modifier.handler(({ input, errors }) => {
        try {
          return { body: service.modifier(input.headers['idempotency-key'], input.params.id, input.body) };
        } catch (e) {
          if (e instanceof ConflitVersion) throw errors.CONFLIT_VERSION({ data: { versionActuelle: e.versionActuelle } });
          if (e instanceof Error && e.message === 'INTROUVABLE') throw new ORPCError('NOT_FOUND');
          throw e;
        }
      }),
    },
    plan: routesPlan(),
    principes: routesPrincipes(),
    tiers: routesTiers(),
    banque: routesBanque(),
    tableauDeBord: routesTableauDeBord(s.tableauDeBord),
    alertes: routesAlertes(s.alertes),
    preferences: routesPreferences(s.preferences),
    recherche: routesRecherche(s.recherche),
    exports: routesExports(s.exports),
    calendrier: routesCalendrier(s.calendrier),
    tva: routesTva(),
    notifications: routesNotifications(s.notifications),
    profil: routesProfil(profilChamps),
    profilChamps: routesProfilChamps(profilChamps),
    profilChangements: routesProfilChangements(creerServiceProfilChangements(profilChamps)),
    fec: routesFec(),
    controles: routesControles(),
    controlesActions: routesControlesActions(options.controlesActions),
    regimes: routesRegimes(),
    identite: routesIdentite(),
    change: routesChange(),
    frais: routesFrais(creerServiceFrais(jeuFrais)),
    fraisActions: routesFraisActions(creerServiceFraisActions({ jeu: jeuFrais })),
    fraisValidation: routesFraisValidation(creerServiceFraisValidation(jeuFrais, configEssai())),
    vehiculesBareme: routesVehiculesBareme(),
    sante: routesSante(),
    santeExploitation: implementerSanteExploitation(os, options.exploitation ?? {}),
    personnes: implementerPersonnes(os, options.exploitation ?? {}),
    echeances: routesEcheances(),
    bloquants: routesBloquants(),
    juridique: routesJuridique(),
    parametres: routesParametres(),
    sources: routesSources(),
    ventes: routesVentes(),
    pieces: routesPieces(),
    tresorerie: routesTresorerie(),
    fournisseurs: routesFournisseurs(),
    capacites: routesCapacites(options),
    finContrat: implementerFinContrat(os, options.abonnement ?? {}),
    acceptations: implementerAcceptations(os, options.abonnement ?? {}),
    abonnement: {
      ...implementerAcces(os, options.abonnement ?? {}),
      ...implementerVolume(os, options.abonnement ?? {}),
      ...implementerPalier(os, options.abonnement ?? {}),
    },
    ...implementerModules(os, options),
  });
  const osChat = implement(contratChat);
  return { ...routeur, ...osChat.router({ chat: implementerChat(osChat, options.chat ?? creerServiceChat()), chatPropositions: implementerChatPropositions(osChat, options.propositions ?? creerServicePropositions()) }) };
}

/** Serveur Fastify neuf (état en mémoire propre à chaque appel). */
export function creerApp(service?: Service, options: OptionsApp = {}): FastifyInstance {
  const app = Fastify();
  brancherSecurite(app, options.securite ?? {});
  const handler = new OpenAPIHandler(creerRouteur(service, {}, options));
  const garde = creerGardeAcces({ horloge: options.abonnement?.horloge ?? (() => new Date(Date.now()).toISOString()), scenario: options.abonnement?.scenario });
  app.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));
  app.all('/*', async (request, reply) => {
    const refus = garde(request.method, request.url.split('?')[0] ?? '');
    if (refus) return reply.status(STATUT_ETAT_ACCES).send(corpsEtatAcces(refus));
    const verifiee = sessionDeRequete(request);
    const session = options.session?.(request.headers) ?? (verifiee ? versSessionRoute(verifiee) : undefined);
    const { matched } = await handler.handle(request, reply, { prefix: '/', context: { session, sessionVerifiee: verifiee } });
    if (!matched) reply.status(404).send({ code: 'INTROUVABLE', status: 404 });
  });
  return app;
}
