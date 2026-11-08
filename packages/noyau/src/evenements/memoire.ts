import { creerEnveloppe, ErreurEvenement, type Enveloppe } from './enveloppe.js';
import type { BoiteEnvoi, Publieur, StockEnvoi, UniteDeTravail } from './publication.js';

/** Boîte d'envoi en mémoire : les dépôts ne deviennent visibles qu'à la fin réussie de executer. */
export function creerBoiteEnvoiMemoire(): UniteDeTravail & StockEnvoi {
  const attente: Enveloppe[] = [];
  const vus = new Set<string>();
  return {
    async executer(travail) {
      const local: Enveloppe[] = [];
      let ouverte = true;
      const boite: BoiteEnvoi = {
        deposer(e) {
          if (!ouverte) throw new ErreurEvenement('hors_transaction');
          local.push(creerEnveloppe(e));
        },
      };
      try {
        const r = await travail({ boite });
        for (const e of local) {
          if (vus.has(e.id)) continue;
          vus.add(e.id);
          attente.push(e);
        }
        return r;
      } finally {
        ouverte = false;
      }
    },
    enAttente: (limite) => Promise.resolve(attente.slice(0, limite)),
    marquerPubliee(id) {
      const i = attente.findIndex((e) => e.id === id);
      if (i >= 0) attente.splice(i, 1);
      return Promise.resolve();
    },
  };
}

export function creerFauxPublieur(opts: { echouer?: (e: Enveloppe) => boolean } = {}): { publieur: Publieur; recus: Enveloppe[] } {
  const recus: Enveloppe[] = [];
  return {
    recus,
    publieur: { publier: (e) => (opts.echouer?.(e) ? Promise.reject(new Error('echec simule')) : (recus.push(e), Promise.resolve())) },
  };
}
