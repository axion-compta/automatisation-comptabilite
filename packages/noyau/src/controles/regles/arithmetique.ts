// Contrôle CC-K04 : HT + TVA = TTC par taux (montants en centimes, règle pure).
// Aucun texte affiché ici : seulement des codes. Tolérances reçues en argument.
import { ajouter, soustraire, type Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle, alerte, exigerCentimes, ok, type PieceControlee } from './commun.js';

export interface ObjetArithmetique {
  piece: PieceControlee;
  toleranceTaux?: Centimes;
  tolerancePiece?: Centimes;
}

export interface EcartsArithmetiques {
  parTaux: { taux: number; ecart: Centimes }[];
  total: Centimes;
}

/** Écart absolu |HT + TVA − TTC| par taux (lignes regroupées, trié par taux) et leur total. */
export function ecartsArithmetiques(piece: PieceControlee): EcartsArithmetiques {
  const groupes = new Map<number, { ht: Centimes; tva: Centimes; ttc: Centimes }>();
  for (const l of piece.lignes) {
    if (!Number.isSafeInteger(l.taux)) throw new ErreurControle('entree_invalide');
    const g = groupes.get(l.taux) ?? { ht: exigerCentimes(0), tva: exigerCentimes(0), ttc: exigerCentimes(0) };
    g.ht = ajouter(g.ht, exigerCentimes(l.ht));
    g.tva = ajouter(g.tva, exigerCentimes(l.tva));
    g.ttc = ajouter(g.ttc, exigerCentimes(l.ttc));
    groupes.set(l.taux, g);
  }
  const parTaux: { taux: number; ecart: Centimes }[] = [];
  let total = exigerCentimes(0);
  for (const [taux, g] of [...groupes].sort((a, b) => a[0] - b[0])) {
    const brut = soustraire(ajouter(g.ht, g.tva), g.ttc);
    const ecart = exigerCentimes(brut < 0 ? -brut : brut);
    parTaux.push({ taux, ecart });
    total = ajouter(total, ecart);
  }
  return { parTaux, total };
}

function tolerance(valeur: Centimes | undefined): Centimes {
  if (valeur === undefined) throw new ErreurControle('parametre_absent');
  if (exigerCentimes(valeur) < 0) throw new ErreurControle('parametre_invalide');
  return valeur;
}

/** CC-K04 : par taux et pour la pièce entière, l'écart reste dans les tolérances. */
export const regleCCK04: RegleControle<ObjetArithmetique> = {
  id: 'CC-K04',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['arrivee', 'continu', 'nocturne', 'a_la_demande'],
  actif: true,
  evaluer(objet): SortieRegle {
    const parTaux = tolerance(objet.toleranceTaux);
    const parPiece = tolerance(objet.tolerancePiece);
    const ecarts = ecartsArithmetiques(objet.piece);
    const depasse = ecarts.parTaux.some((e) => e.ecart > parTaux) || ecarts.total > parPiece;
    return depasse ? alerte(ecarts.total, 'ARITH') : ok();
  },
};
