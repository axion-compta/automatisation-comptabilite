// Contrôles CC-T03 (TVA sous réserve jamais déduite) et CC-T04 (trois montants = TVA lue).
// Aucun texte affiché ici : seulement des codes. Comptes reçus en argument.
import { ajouter, soustraire, type Centimes } from '../../argent/index.js';
import { troisMontants as montantsDesLignes, type LigneTvaAchat } from '../../tva/sous-reserve.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, exigerCentimes, ok } from './commun.js';

export interface LigneSousReserve {
  pieceId: string;
  montant: Centimes;
  compteDebit: string;
  priseDActe: boolean;
  dansDeclaration: boolean;
}

export interface ContexteSousReserve {
  lignes: readonly LigneSousReserve[];
  compteAttente: string;
  compteDeductible: string;
}

export interface TroisMontantsLus {
  solide: Centimes;
  sousReserve: Centimes;
  perdue: Centimes;
}

function verifier(c: ContexteSousReserve): void {
  if (c.compteAttente === '' || c.compteDeductible === '' || c.compteAttente === c.compteDeductible) {
    throw new ErreurControle('entree_invalide');
  }
  for (const l of c.lignes) exigerCentimes(l.montant);
}

/** CC-T03 : sous réserve écrite au compte d'attente, absente de la déclaration. */
export const regleCCT03: RegleControle<ContexteSousReserve> = {
  id: 'CC-T03',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['continu', 'avant_tva', 'a_la_demande'],
  actif: true,
  evaluer: (c): SortieRegle => {
    verifier(c);
    const fautives = c.lignes.filter((l) => l.compteDebit !== c.compteAttente || l.dansDeclaration);
    return fautives.length === 0 ? ok() : alerte(undefined, fautives.length);
  },
};

/** CC-T03A : la personne doit avoir pris acte de chaque ligne sous réserve. */
export const regleCCT03A: RegleControle<ContexteSousReserve> = {
  id: 'CC-T03A',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['continu', 'avant_tva', 'a_la_demande'],
  actif: true,
  evaluer: (c): SortieRegle => {
    verifier(c);
    const sans = c.lignes.filter((l) => !l.priseDActe).length;
    return sans === 0 ? { resultat: 'OK', valeur: 0 } : alerte(undefined, sans);
  },
};

/** Les trois montants sont toujours rendus, même à 0 (fonction de L14-T21). */
export function troisMontants(lignes: readonly LigneTvaAchat[]): TroisMontantsLus {
  const { solide, sousReserve, perdue } = montantsDesLignes(lignes);
  return { solide, sousReserve, perdue };
}

/** CC-T04 : solide + sous réserve + perdue = TVA lue ; écart signé = TVA lue − somme. */
export const regleCCT04: RegleControle<TroisMontantsLus & { tvaLue: Centimes }> = {
  id: 'CC-T04',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['continu', 'avant_tva', 'a_la_demande'],
  actif: true,
  evaluer: (o): SortieRegle => {
    const somme = ajouter(ajouter(exigerCentimes(o.solide), exigerCentimes(o.sousReserve)), exigerCentimes(o.perdue));
    const ecart = soustraire(exigerCentimes(o.tvaLue), somme);
    return ecart === 0 ? ok() : alerte(ecart);
  },
};
