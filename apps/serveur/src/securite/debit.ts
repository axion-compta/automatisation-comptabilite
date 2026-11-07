import type { FastifyInstance, FastifyRequest } from 'fastify';
import { verifierDebits, type DemandeDebit, type EtatDebit } from '../../../../packages/noyau/src/securite/debit.js';
import type { OptionsSecurite } from './index.js';

export const nom = 'debit';

const MS_PAR_SECONDE = 1000;
const CORPS_429 = { defined: false, code: 'DEBIT_DEPASSE', status: 429, message: 'DEBIT_DEPASSE' };

export type OptionDebit = {
  demandes: (requete: FastifyRequest) => DemandeDebit[];
  horloge?: () => number;
};

export function installer(app: FastifyInstance, options: OptionsSecurite): void {
  const debit = options['debit'] as OptionDebit | undefined;
  if (debit === undefined) return;
  if (typeof debit !== 'object' || debit === null || typeof debit.demandes !== 'function') {
    throw new Error('debit : fonction demandes attendue');
  }
  if (debit.horloge !== undefined && typeof debit.horloge !== 'function') throw new Error('debit : horloge invalide');
  const horloge = debit.horloge ?? Date.now;
  let etat: EtatDebit = {};

  app.addHook('onRequest', async (request, reply) => {
    const demandes = debit.demandes(request);
    if (!Array.isArray(demandes)) throw new Error('debit : liste de demandes attendue');
    const r = verifierDebits(etat, demandes, horloge());
    if (r.accepte) {
      etat = r.etat;
      return;
    }
    const secondes = Math.max(1, Math.ceil(r.reessayerApresMs / MS_PAR_SECONDE));
    return reply.code(429).header('retry-after', String(secondes)).send(CORPS_429);
  });
}
