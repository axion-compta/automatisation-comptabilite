// Contrôles CC-T10 (régime de la marge), CC-T11 (autoliquidation du bâtiment), CC-T15 (exonération incohérente).
// Les mentions reconnues et le taux sont des arguments ; le moteur change les exceptions en IMPOSSIBLE. Codes seulement.
import { pourcentage, type Arrondi, type Centimes } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle, alerte, exigerCentimes, ok, type PieceControlee } from './commun.js';

export interface MentionsReconnues {
  marge: string[];
  autoliquidation: string[];
  exoneration: string[];
}

const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'a_la_demande'];
const ACCENTS = /[̀-ͯ]/g;

/** Minuscules, accents retirés, espaces de bord retirés. */
export function normaliser(s: string): string {
  return s.normalize('NFD').replace(ACCENTS, '').toLowerCase().trim();
}

function contientMention(piece: PieceControlee, reconnues: readonly string[]): boolean {
  const attendues = reconnues.map(normaliser).filter((m) => m !== '');
  return piece.mentions.some((m) => {
    const n = normaliser(m);
    return attendues.some((a) => n.includes(a));
  });
}

function tvaFacturee(piece: PieceControlee): Centimes {
  for (const l of piece.lignes) {
    exigerCentimes(l.tva);
    if (!Number.isSafeInteger(l.taux)) throw new ErreurControle('entree_invalide');
  }
  return exigerCentimes(piece.totaux.tva);
}

/** CC-T10 : mention du régime de la marge, à vérifier tant que le geste n'est pas fait. */
export function regleCCT10(m: MentionsReconnues): RegleControle<{ piece: PieceControlee; confirme: boolean }> {
  return {
    id: 'CC-T10',
    version: 1,
    gravite: 'M',
    bloque: [],
    declencheurs: DECLENCHEURS,
    actif: true,
    evaluer({ piece, confirme }): SortieRegle {
      if (!contientMention(piece, m.marge)) return { resultat: 'NON_APPLICABLE' };
      return confirme ? { resultat: 'OK', valeur: 'MARGE' } : alerte(undefined, 'A_VERIFIER');
    },
  };
}

/** Autoliquidation du bâtiment : collectée = déductible, net toujours nul. Taux en points de base, en argument. */
export function autoliquidationBatiment(
  ht: Centimes,
  tauxPdb: number,
  arrondi: Arrondi,
): { collectee: Centimes; deductible: Centimes; net: 0 } {
  exigerCentimes(ht);
  if (!Number.isSafeInteger(tauxPdb) || tauxPdb < 0) throw new ErreurControle('entree_invalide');
  const montant = pourcentage(ht, tauxPdb, arrondi);
  return { collectee: montant, deductible: montant, net: 0 };
}

/** CC-T11 : mention d'autoliquidation et TVA facturée sur la même pièce. */
export function regleCCT11(m: MentionsReconnues): RegleControle<{ piece: PieceControlee }> {
  return {
    id: 'CC-T11',
    version: 1,
    gravite: 'M',
    bloque: [],
    declencheurs: DECLENCHEURS,
    actif: true,
    evaluer({ piece }): SortieRegle {
      const tva = tvaFacturee(piece);
      return contientMention(piece, m.autoliquidation) && tva > 0 ? alerte(undefined, 'TVA-C03') : ok();
    },
  };
}

export type MotifExoneration = 'exoneration_avec_tva' | 'taux_zero_sans_mention' | 'tva_francaise_client_ue';

/** CC-T15 : exonération incohérente (mention et TVA, taux 0 sans mention, TVA française à un client UE valide). */
export function regleCCT15(
  m: MentionsReconnues,
): RegleControle<{ piece: PieceControlee; clientUeNumeroValide?: boolean }> {
  return {
    id: 'CC-T15',
    version: 1,
    gravite: 'M',
    bloque: [],
    declencheurs: DECLENCHEURS,
    actif: true,
    evaluer({ piece, clientUeNumeroValide }): SortieRegle {
      const tva = tvaFacturee(piece);
      const exoneree = contientMention(piece, m.exoneration);
      let motif: MotifExoneration | undefined;
      if (exoneree && tva > 0) motif = 'exoneration_avec_tva';
      else if (!exoneree && piece.lignes.some((l) => l.taux === 0)) motif = 'taux_zero_sans_mention';
      else if (piece.sens === 'vente' && clientUeNumeroValide === true && tva > 0) motif = 'tva_francaise_client_ue';
      return motif === undefined ? ok() : alerte(undefined, motif);
    },
  };
}
