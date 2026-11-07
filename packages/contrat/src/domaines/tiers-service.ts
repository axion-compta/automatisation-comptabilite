import { genererCompta } from '../../../donnees-fictives/src/compta.js';
import { normaliser } from './plan-service.js';
import type { Tiers } from './tiers.js';

export interface OptionsTiers {
  type?: Tiers['type'] | undefined;
  q?: string | undefined;
  limite?: number | undefined;
  decalage?: number | undefined;
}

/** Service en mémoire pur, bâti sur le jeu fictif (profil pleine). Lecture seulement. */
export function creerServiceTiers(entree?: Tiers[]) {
  const societe = genererCompta().societes.find((s) => s.profil === 'pleine');
  if (!societe) throw new Error('PROFIL_PLEINE_ABSENT');
  const tous: Tiers[] = (entree ?? societe.tiers)
    .map((t) => ({ code: t.code, nom: t.nom, type: t.type, email: t.email }))
    .sort((a, b) => (a.code < b.code ? -1 : 1));

  return {
    lister(options: OptionsTiers = {}): { body: Tiers[]; decalage: number; total: number } {
      const q = normaliser(options.q ?? '');
      const filtres = tous
        .filter((t) => options.type === undefined || t.type === options.type)
        .filter((t) => normaliser(t.code).includes(q) || normaliser(t.nom).includes(q));
      const decalage = options.decalage ?? 0;
      const fin = options.limite === undefined ? undefined : decalage + options.limite;
      return { body: filtres.slice(decalage, fin), decalage, total: filtres.length };
    },
  };
}
