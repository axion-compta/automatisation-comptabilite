// CC-T01 : TVA des pièces contre TVA de la déclaration préparée, par taux, écart toléré nul.
// Aucun texte affiché ici : seulement des codes. Taux en points de base (entiers sûrs).
import { ajouter, centimes, soustraire, type Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle } from './commun.js';

export interface TotauxTva {
  collecteeParTaux: ReadonlyMap<number, Centimes>;
  deductibleBiensServices: Centimes;
  deductibleImmobilisations: Centimes;
  autoliquideeCollectee: Centimes;
  autoliquideeDeductible: Centimes;
}

/** Écart justifié (crédit reporté ou régularisation datée) : retiré du poste visé, une seule fois. */
export interface EcartJustifie {
  motif: 'credit_reporte' | 'regularisation';
  poste: string;
  date: string;
  montant: Centimes;
}

export interface EcartPoste {
  poste: string;
  ecart: Centimes;
}

function montant(n: number): Centimes {
  try {
    return centimes(n);
  } catch {
    throw new ErreurControle('entree_invalide');
  }
}

function collectee(t: TotauxTva): Map<number, Centimes> {
  const sortie = new Map<number, Centimes>();
  for (const [taux, m] of t.collecteeParTaux) {
    if (!Number.isSafeInteger(taux)) throw new ErreurControle('entree_invalide');
    sortie.set(taux, montant(m));
  }
  return sortie;
}

function ecartAutoliquidation(p: TotauxTva, d: TotauxTva): Centimes {
  const pc = montant(p.autoliquideeCollectee);
  const dc = montant(d.autoliquideeCollectee);
  const ecarts = [soustraire(pc, montant(p.autoliquideeDeductible)), soustraire(dc, montant(d.autoliquideeDeductible)), soustraire(pc, dc)];
  return ecarts.reduce((total, e) => ajouter(total, centimes(Math.abs(e))), centimes(0));
}

/** Compare poste par poste ; exception codée si un montant ou un taux est invalide. */
export function comparerPiecesDeclaration(
  pieces: TotauxTva,
  declaration: TotauxTva,
  justifies: readonly EcartJustifie[],
): { ecarts: EcartPoste[]; ecartTotal: Centimes } {
  const postes = new Map<string, Centimes>();
  const cp = collectee(pieces);
  const cd = collectee(declaration);
  const taux = [...new Set([...cp.keys(), ...cd.keys()])].sort((a, b) => a - b);
  for (const t of taux) postes.set('collectee:' + String(t), soustraire(cp.get(t) ?? centimes(0), cd.get(t) ?? centimes(0)));
  postes.set('deductible_bs', soustraire(montant(pieces.deductibleBiensServices), montant(declaration.deductibleBiensServices)));
  postes.set('deductible_immo', soustraire(montant(pieces.deductibleImmobilisations), montant(declaration.deductibleImmobilisations)));
  postes.set('autoliquidation', ecartAutoliquidation(pieces, declaration));
  for (const j of justifies) {
    const reste = postes.get(j.poste) ?? centimes(0);
    postes.set(j.poste, soustraire(reste, montant(j.montant)));
  }
  const ecarts: EcartPoste[] = [];
  let ecartTotal = centimes(0);
  for (const [poste, ecart] of postes) {
    if (ecart === 0) continue;
    ecarts.push({ poste, ecart });
    ecartTotal = ajouter(ecartTotal, centimes(Math.abs(ecart)));
  }
  return { ecarts, ecartTotal };
}

export interface ObjetCCT01 {
  pieces: TotauxTva;
  declaration: TotauxTva;
  justifies: readonly EcartJustifie[];
}

export const regleCCT01: RegleControle<ObjetCCT01> = {
  id: 'CC-T01',
  version: 1,
  gravite: 'B',
  bloque: ['tva', 'export'],
  declencheurs: ['continu', 'avant_tva', 'avant_export', 'a_la_demande'],
  actif: true,
  evaluer: (o): SortieRegle => {
    try {
      const { ecarts, ecartTotal } = comparerPiecesDeclaration(o.pieces, o.declaration, o.justifies);
      const premier = ecarts[0];
      if (premier === undefined) return { resultat: 'OK', valeur: 0, ecartCentimes: 0 };
      return { resultat: 'ALERTE', valeur: premier.poste, ecartCentimes: ecartTotal };
    } catch {
      return { resultat: 'IMPOSSIBLE' };
    }
  },
};
