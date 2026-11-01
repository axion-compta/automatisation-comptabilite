import type { Ecriture } from './schemas.js';

export class ConflitVersion extends Error {
  readonly status = 409;
  constructor(readonly versionActuelle: number) {
    super('CONFLIT_VERSION');
  }
}

/** Service en mémoire (faux serveur) : rejouer la même clé ne produit qu'un effet. */
export function creerService() {
  const ecritures = new Map<string, Ecriture>();
  const rejeux = new Map<string, Ecriture>();
  let compteur = 0;

  return {
    lister: (): Ecriture[] => [...ecritures.values()],
    creer(cle: string, entree: { libelle: string; montantCentimes: number }): Ecriture {
      const deja = rejeux.get(cle);
      if (deja) return deja;
      compteur += 1;
      const e: Ecriture = { id: 'E' + compteur, ...entree, version: 1 };
      ecritures.set(e.id, e);
      rejeux.set(cle, e);
      return e;
    },
    modifier(cle: string, id: string, entree: { libelle: string; montantCentimes: number; version: number }): Ecriture {
      const deja = rejeux.get(cle);
      if (deja) return deja;
      const actuelle = ecritures.get(id);
      if (!actuelle) throw new Error('INTROUVABLE');
      if (actuelle.version !== entree.version) throw new ConflitVersion(actuelle.version);
      const e: Ecriture = { id, libelle: entree.libelle, montantCentimes: entree.montantCentimes, version: actuelle.version + 1 };
      ecritures.set(id, e);
      rejeux.set(cle, e);
      return e;
    },
  };
}
