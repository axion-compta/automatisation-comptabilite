import type { Ecriture } from './schemas.js';

export class ConflitVersion extends Error {
  readonly status = 409;
  constructor(readonly versionActuelle: number) {
    super('CONFLIT_VERSION');
  }
}

/** Service en mémoire (faux serveur) : rejouer la même clé sur la même route ne produit qu'un effet (la clé est propre à chaque route). */
export function creerService() {
  const ecritures = new Map<string, Ecriture>();
  const rejeux = new Map<string, Ecriture>();
  let compteur = 0;

  return {
    lister: (): Ecriture[] => [...ecritures.values()],
    /** Page de la liste : `total` compte toutes les écritures, `decalage` est celui appliqué. */
    page(options: { limite?: number | undefined; decalage?: number | undefined } = {}): { body: Ecriture[]; decalage: number; total: number } {
      const tout = [...ecritures.values()];
      const decalage = options.decalage ?? 0;
      const fin = options.limite === undefined ? undefined : decalage + options.limite;
      return { body: tout.slice(decalage, fin), decalage, total: tout.length };
    },
    creer(cle: string, entree: { libelle: string; montantCentimes: number }): Ecriture {
      const deja = rejeux.get('creer:' + cle);
      if (deja) return deja;
      compteur += 1;
      const e: Ecriture = { id: 'E' + compteur, ...entree, version: 1 };
      ecritures.set(e.id, e);
      rejeux.set('creer:' + cle, e);
      return e;
    },
    modifier(cle: string, id: string, entree: { libelle: string; montantCentimes: number; version: number }): Ecriture {
      const deja = rejeux.get('modifier:' + id + ':' + cle);
      if (deja) return deja;
      const actuelle = ecritures.get(id);
      if (!actuelle) throw new Error('INTROUVABLE');
      if (actuelle.version !== entree.version) throw new ConflitVersion(actuelle.version);
      const e: Ecriture = { id, libelle: entree.libelle, montantCentimes: entree.montantCentimes, version: actuelle.version + 1 };
      ecritures.set(id, e);
      rejeux.set('modifier:' + id + ':' + cle, e);
      return e;
    },
  };
}
