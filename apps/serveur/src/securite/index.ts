import type { FastifyInstance } from 'fastify';
import * as correlation from './correlation.js';
import * as arret from './arret.js';
import * as debit from './debit.js';
import * as enTetes from './en-tetes.js';
import { installerJeton, type OptionJeton } from './jeton.js';
import type { ContexteAutorisation } from '../../../../packages/noyau/src/securite/autoriser.js';

/** `session` : injectée par les tests seulement (la session réelle attend J3a). */
export type OptionsSecurite = { observer?: (nom: string) => void; session?: ContexteAutorisation; jeton?: OptionJeton; [cle: string]: unknown };

const CROCHETS = [correlation, arret, debit, enTetes];
const branches = new WeakSet<FastifyInstance>();

export function brancherSecurite(app: FastifyInstance, options: OptionsSecurite = {}): void {
  if (branches.has(app)) throw new Error('sécurité déjà branchée sur cette instance');
  branches.add(app);
  for (const c of CROCHETS) {
    c.installer(app, options);
    options.observer?.(c.nom);
  }
  if (options.jeton !== undefined) installerJeton(app, options.jeton);
}
