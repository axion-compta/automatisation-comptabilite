// TVA sur marge : montants vides légitimes quand la mention est lue, carte « TVA de marge à tort ou oubliée »
// sur un bien d'occasion sans TVA ni mention. Les mentions et les natures « occasion » sont des arguments.
// Codes seulement, aucun texte. CC-T10 et `regimes-particuliers.ts` ne sont pas modifiés.
import type { Centimes } from '../../argent/index.js';
import { effetTraitement } from '../../tva/traitement.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, exigerCentimes, ok, type PieceControlee } from './commun.js';
import { normaliser } from './regimes-particuliers.js';

function mentionLue(piece: PieceControlee, mentions: readonly string[]): boolean {
  const attendues = mentions.map(normaliser).filter((m) => m !== '');
  return piece.mentions.some((m) => {
    const n = normaliser(m);
    return attendues.some((a) => n.includes(a));
  });
}

/** Vrai si la mention de marge est lue : l'appelant tait alors la carte « montant manquant ». */
export function montantsVidesLegitimes(piece: PieceControlee, mentions: readonly string[]): boolean {
  return mentionLue(piece, mentions);
}

/** TVA déductible d'une pièce dont la mention de marge est lue, obtenue par `tva/traitement.ts` (code `MARGE`) ; sinon `undefined`. */
export function tvaDeductibleMarge(piece: PieceControlee, mentions: readonly string[]): Centimes | undefined {
  if (!mentionLue(piece, mentions)) return undefined;
  return effetTraitement({
    code: 'MARGE',
    sens: piece.sens,
    tvaLue: exigerCentimes(piece.totaux.tva),
    base: exigerCentimes(piece.totaux.ht),
    franchise: false,
  }).deductible;
}

/** Bien d'occasion (nature dans `naturesOccasion`) facturé sans TVA ni mention de marge : carte `marge_a_tort_ou_oubliee`. */
export function regleMargeOccasion(
  mentions: readonly string[],
  naturesOccasion: readonly string[],
): RegleControle<{ piece: PieceControlee }> {
  const natures = naturesOccasion.map(normaliser).filter((n) => n !== '');
  return {
    id: 'CC-T10-OCCASION',
    version: 1,
    gravite: 'M',
    bloque: [],
    declencheurs: ['arrivee', 'continu', 'a_la_demande'],
    actif: true,
    evaluer({ piece }): SortieRegle {
      if (!piece.lignes.some((l) => natures.includes(normaliser(l.nature)))) return { resultat: 'NON_APPLICABLE' };
      if (mentionLue(piece, mentions)) return { resultat: 'OK', valeur: 'MARGE' };
      return exigerCentimes(piece.totaux.tva) === 0 ? alerte(undefined, 'marge_a_tort_ou_oubliee') : ok();
    },
  };
}
