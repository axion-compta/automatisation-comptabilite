// Équilibre de chaque écriture et du fichier FEC ; dates dans l'exercice. Entrée : lignes déjà lues (L03-T10).
// Un total qui dépasse l'entier sûr lève `ErreurArgent` (propagée telle quelle, jamais avalée).
import { type Centimes, ajouter, centimes, soustraire } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';
import type { EcartFec, LigneFecLue, RegleFec } from './controles-structure.js';
import { lireDateFec, lireMontantFec } from './format.js';

export class ErreurControleFec extends Error {
  override name = 'ErreurControleFec';
  readonly code: 'bornes_invalides';
  constructor(code: 'bornes_invalides') {
    super(code);
    this.code = code;
  }
}

export const REGLES_EQUILIBRE: readonly RegleFec[] = [
  { id: 'FEC-E01', libelle: 'Écriture déséquilibrée', gravite: 'B', source: 'a_sourcer', testId: 'un-centime-sur-ve-1-fec-e01' },
  { id: 'FEC-E02', libelle: 'Fichier déséquilibré', gravite: 'B', source: 'a_sourcer', testId: 'fichier-desequilibre-fec-e02' },
  { id: 'FEC-E03', libelle: "Date d'écriture hors exercice", gravite: 'B', source: 'a_sourcer', testId: 'date-hors-exercice-fec-e03' },
];

interface Cumul {
  ligne: number;
  debit: Centimes;
  credit: Centimes;
}

export function controlerEquilibre(lignes: readonly LigneFecLue[]): EcartFec[] {
  const ecritures = new Map<string, Cumul>();
  let debit = centimes(0);
  let credit = centimes(0);
  for (const l of lignes) {
    const cle = JSON.stringify([l.valeurs.journalCode, l.valeurs.ecritureNum]);
    const d = lireMontantFec(l.valeurs.debit);
    const c = lireMontantFec(l.valeurs.credit);
    const cumul = ecritures.get(cle) ?? { ligne: l.numero, debit: centimes(0), credit: centimes(0) };
    cumul.ligne = Math.min(cumul.ligne, l.numero);
    cumul.debit = ajouter(cumul.debit, d);
    cumul.credit = ajouter(cumul.credit, c);
    ecritures.set(cle, cumul);
    debit = ajouter(debit, d);
    credit = ajouter(credit, c);
  }
  const ecarts: EcartFec[] = [];
  for (const [cle, cumul] of ecritures) {
    const ecart = soustraire(cumul.debit, cumul.credit);
    if (ecart === 0) continue;
    const [journal, numero] = JSON.parse(cle) as [string, string];
    ecarts.push({ regleId: 'FEC-E01', ligne: cumul.ligne, valeur: `${journal} ${numero}`, ecartCentimes: ecart });
  }
  const total = soustraire(debit, credit);
  if (total !== 0) ecarts.push({ regleId: 'FEC-E02', ligne: 1, ecartCentimes: total });
  return ecarts;
}

export function controlerDatesExercice(
  lignes: readonly LigneFecLue[],
  exercice: { debut: string; fin: string },
): EcartFec[] {
  if (!estDateValide(exercice.debut) || !estDateValide(exercice.fin) || exercice.debut > exercice.fin) {
    throw new ErreurControleFec('bornes_invalides');
  }
  const ecarts: EcartFec[] = [];
  for (const l of lignes) {
    let dedans = false;
    try {
      const date = lireDateFec(l.valeurs.ecritureDate);
      dedans = date >= exercice.debut && date <= exercice.fin;
    } catch {
      dedans = false;
    }
    if (!dedans) ecarts.push({ regleId: 'FEC-E03', ligne: l.numero, champ: 'ecritureDate', valeur: l.valeurs.ecritureDate });
  }
  return ecarts;
}
