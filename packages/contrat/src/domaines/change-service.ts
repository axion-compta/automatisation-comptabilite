import { expliquerEcart, type TauxSource } from '../../../noyau/src/change/explication.js';
import { phraseEcartChange } from '../../../textes/src/moteur/messages.js';
import type { ExplicationEcart } from './change.js';

const SOURCE = 'taux de test, source fictive';
const taux = (tauxE8: number, date: string): TauxSource => ({ tauxE8, source: SOURCE, date });

interface EcartFictif {
  montant: number;
  devise: string;
  piece: TauxSource;
  paiement: TauxSource;
}

/** Deux écarts fictifs : ECART-001 est une perte, ECART-002 un gain. */
const ECARTS: Readonly<Record<string, EcartFictif>> = {
  'ECART-001': { montant: 1800, devise: 'XXA', piece: taux(92000000, '2026-10-07'), paiement: taux(95000000, '2026-11-20') },
  'ECART-002': { montant: -1250, devise: 'XXA', piece: taux(95000000, '2026-09-03'), paiement: taux(92000000, '2026-10-15') },
};

/** Service en mémoire, lecture seule : aucune méthode d'écriture. */
export function creerServiceChange(ecarts: Readonly<Record<string, EcartFictif>> = ECARTS) {
  return {
    /** `undefined` si l'écart est inconnu. */
    expliquer(id: string): ExplicationEcart | undefined {
      const e = Object.hasOwn(ecarts, id) ? ecarts[id] : undefined;
      if (!e) return undefined;
      const x = expliquerEcart({ montant: e.montant, devise: e.devise }, e.piece, e.paiement);
      const [piece, paiement] = x.taux;
      return {
        sens: x.sens,
        montantCentimes: x.montant,
        devise: x.devise,
        taux: [piece, paiement],
        phrase: phraseEcartChange({ sens: x.sens, montant: x.montant, tauxPiece: piece, tauxPaiement: paiement }),
      };
    },
  };
}
export type ServiceChange = ReturnType<typeof creerServiceChange>;
