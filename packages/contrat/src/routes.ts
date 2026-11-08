import { oc } from '@orpc/contract';
import { z } from 'zod';
import {
  Ecriture,
  EnTeteEcriture,
  ErreurConflit,
  ModificationEcriture,
  NouvelleEcriture,
} from './schemas.js';
import { plan } from './domaines/plan.js';
import { principes } from './domaines/principes.js';
import { tiers } from './domaines/tiers.js';
import { banque } from './domaines/banque.js';
import { tableauDeBord } from './domaines/tableau-de-bord.js';
import { alertes } from './domaines/alertes.js';
import { preferences } from './domaines/preferences.js';
import { recherche } from './domaines/recherche.js';
import { exports } from './domaines/exports.js';
import { calendrier } from './domaines/calendrier.js';
import { tva } from './domaines/tva.js';
import { notifications } from './domaines/notifications.js';
import { lireAcces } from './domaines/acces.js';
import { lireVolume } from './domaines/volume.js';
import { demanderPalier } from './domaines/palier.js';
import { chat } from './domaines/chat.js';
import { chatPropositions } from './domaines/chat-propositions.js';
import { profil } from './domaines/profil.js';
import { change } from './domaines/change.js';
import { regimes } from './domaines/regimes.js';
import { frais } from './domaines/frais.js';
import { sante } from './domaines/sante.js';

/** Contrat partagé : 3 routes. Les routes d'écriture exigent l'en-tête Idempotency-Key. */
export const lister = oc
  .route({ method: 'GET', path: '/ecritures', inputStructure: 'detailed', operationId: 'listerEcritures' })
  .input(
    z.object({
      query: z
        .object({
          limite: z.coerce.number().int().min(1).max(100).optional(),
          decalage: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
    }),
  )
  .output(z.object({ body: z.array(Ecriture), decalage: z.number().int().min(0), total: z.number().int().min(0) }));

export const creer = oc
  .route({ method: 'POST', path: '/ecritures', inputStructure: 'detailed', operationId: 'creerEcriture' })
  .input(z.object({ headers: EnTeteEcriture, body: NouvelleEcriture }))
  .output(z.object({ body: Ecriture }));

export const modifier = oc
  .route({ method: 'PUT', path: '/ecritures/{id}', inputStructure: 'detailed', operationId: 'modifierEcriture' })
  .errors({ CONFLIT_VERSION: { status: 409, data: ErreurConflit } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }), headers: EnTeteEcriture, body: ModificationEcriture }))
  .output(z.object({ body: Ecriture }));

export const contrat = {
  ecritures: { lister, creer, modifier },
  plan,
  principes,
  tiers,
  banque,
  tableauDeBord,
  alertes,
  preferences,
  recherche,
  exports,
  calendrier,
  tva,
  notifications,
  abonnement: { lireAcces, lireVolume, demanderPalier },
  profil,
  regimes,
  change,
  frais,
  sante,
};
/** Domaine du chat, séparé de `contrat` : les clés de `contrat` sont figées par un test existant. */
export const contratChat = { chat, chatPropositions };
export type Contrat = typeof contrat;
