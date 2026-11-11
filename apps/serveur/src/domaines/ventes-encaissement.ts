// Ventes : effet du lien bancaire validé (512 / 411, lettrage, TVA encaissée) en UNE transaction avec l'événement.
import type { Centimes } from '../../../../packages/noyau/src/argent/index.js';
import type { Ecriture } from '../../../../packages/noyau/src/ecritures/modele.js';
import type { UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import { ecritureEncaissement, type EntreeEcritureEncaissement, type ResultatEcritureEncaissement } from '../../../../packages/noyau/src/ventes/ecriture-encaissement.js';
import { evenementEncaissee, type ContexteEvenementVente } from './ventes-evenements.js';

export interface LienBancaireValide {
  id: string;
  contexte: ContexteEvenementVente;
  entree: EntreeEcritureEncaissement;
}

export interface ResultatLien { ecriture: Ecriture; resteDu: Centimes; rejoue: boolean }
export type EtapeEffet = 'ecriture' | 'lettrage' | 'reste_du';

/** Écritures du dépôt, visibles seulement si toute la transaction réussit. */
export interface TxEncaissement {
  rejoue(lienId: string): boolean;
  ecrire(lienId: string, ecriture: Ecriture): void;
  lettrer(lienId: string, lettrage: ResultatEcritureEncaissement['lettrage']): void;
  fixerResteDu(factureId: string, reste: Centimes): void;
}
export interface DepotEncaissement { transaction<R>(travail: (tx: TxEncaissement) => Promise<R>): Promise<R> }

export function creerDepotEncaissementMemoire(opts: { panne?: (etape: EtapeEffet) => boolean } = {}) {
  type Etat = { ecritures: Map<string, Ecriture>; lettrages: Map<string, ResultatEcritureEncaissement['lettrage']>; restes: Map<string, Centimes> };
  let etat: Etat = { ecritures: new Map(), lettrages: new Map(), restes: new Map() };
  const panne = (e: EtapeEffet): void => {
    if (opts.panne?.(e)) throw new Error('panne_simulee');
  };
  const depot: DepotEncaissement = {
    async transaction(travail) {
      const copie: Etat = { ecritures: new Map(etat.ecritures), lettrages: new Map(etat.lettrages), restes: new Map(etat.restes) };
      const r = await travail({
        rejoue: (id) => copie.ecritures.has(id),
        ecrire: (id, e) => (panne('ecriture'), void copie.ecritures.set(id, e)),
        lettrer: (id, l) => (panne('lettrage'), void copie.lettrages.set(id, l)),
        fixerResteDu: (f, reste) => (panne('reste_du'), void copie.restes.set(f, reste)),
      });
      etat = copie; // validation : tout ou rien
      return r;
    },
  };
  return {
    ...depot,
    ecritures: (): Ecriture[] => [...etat.ecritures.values()],
    lettrages: () => [...etat.lettrages.values()],
    resteDu: (factureId: string): Centimes | undefined => etat.restes.get(factureId),
  };
}

/** Écriture, lettrage, reste dû et événement `compta.vente.encaissee` dans la même transaction : une panne n'en laisse aucun. */
export async function appliquerLienBancaire(
  deps: { unite: UniteDeTravail; depot: DepotEncaissement },
  lien: LienBancaireValide,
): Promise<ResultatLien> {
  const calcul = ecritureEncaissement(lien.entree);
  return deps.unite.executer(({ boite }) => deps.depot.transaction<ResultatLien>((tx) => {
    if (tx.rejoue(lien.id)) return Promise.resolve({ ecriture: calcul.ecriture, resteDu: calcul.resteDu, rejoue: true });
    tx.ecrire(lien.id, calcul.ecriture);
    boite.deposer(evenementEncaissee(lien.contexte, {
      factureId: lien.entree.facture.id, ecritureId: calcul.ecriture.id,
      statut: calcul.resteDu > 0 ? 'partiel' : 'total', tvaExigible: calcul.lignesTva.some((t) => t.tvaCentimes > 0),
    }));
    tx.lettrer(lien.id, calcul.lettrage);
    tx.fixerResteDu(lien.entree.facture.id, calcul.resteDu);
    return Promise.resolve({ ecriture: calcul.ecriture, resteDu: calcul.resteDu, rejoue: false });
  }));
}
