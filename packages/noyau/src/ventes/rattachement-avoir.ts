// Ventes : rattachement d'un avoir à sa facture d'origine (spec 10, règle 6). Aucune écriture.
import type { Centimes } from '../argent/index.js';
import { decouperNumero } from './series.js';
import { ErreurVente } from './types.js';

export interface AvoirALier {
  referenceLue?: string | undefined;
  clientId?: string | undefined;
  ttc: Centimes;
}
export interface FactureCandidate {
  id: string;
  numero: string;
  clientId: string;
  ttc: Centimes;
  resteDu: Centimes;
}
export interface ResultatRattachement {
  factureId: string | null;
  par: 'reference' | 'client_et_montant' | null;
  cartes: ('A12' | 'A13')[];
}

const invalide = (message: string): ErreurVente => new ErreurVente('entree_invalide', message);

function seule(trouvees: readonly FactureCandidate[]): FactureCandidate | undefined {
  return trouvees.length === 1 ? trouvees[0] : undefined;
}

/** Référence lue (même série, même ordre), sinon UNE seule facture du client au même TTC ; sinon A12. Avoir > reste dû : A13. */
export function rattacherAvoir(avoir: AvoirALier, factures: readonly FactureCandidate[]): ResultatRattachement {
  if (!Number.isSafeInteger(avoir.ttc) || avoir.ttc <= 0) throw invalide('Le TTC de l’avoir doit être un entier de centimes positif.');
  for (const f of factures) {
    if (!Number.isSafeInteger(f.ttc) || !Number.isSafeInteger(f.resteDu) || f.resteDu < 0) throw invalide('Montants de facture invalides.');
  }
  let trouvee: FactureCandidate | undefined;
  let par: 'reference' | 'client_et_montant' = 'reference';
  if (avoir.referenceLue !== undefined) {
    const lue = decouperNumero(avoir.referenceLue);
    if (lue.ordre !== null) {
      trouvee = seule(factures.filter((f) => {
        const d = decouperNumero(f.numero);
        return d.serie === lue.serie && d.ordre === lue.ordre;
      }));
    }
  }
  if (trouvee === undefined) {
    par = 'client_et_montant';
    const { clientId } = avoir;
    if (clientId !== undefined && clientId !== '') trouvee = seule(factures.filter((f) => f.clientId === clientId && f.ttc === avoir.ttc));
  }
  if (trouvee === undefined) return { factureId: null, par: null, cartes: ['A12'] };
  return { factureId: trouvee.id, par, cartes: avoir.ttc > trouvee.resteDu ? ['A13'] : [] };
}
