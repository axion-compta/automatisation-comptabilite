// Export CSV du rapprochement : une ligne par ligne bancaire de la société, format des exports existants (« ; », virgule, CRLF).
import { ecrireCsv } from '../../exports/csv.js';
import type { ColonneCsv } from '../../exports/csv.js';
import type { LigneBancaire } from '../types.js';

export type LigneExport = { ligne: LigneBancaire; pieceId?: string };

const COLONNES: ColonneCsv[] = [
  { code: 'date', type: 'date', entete: 'Date' },
  { code: 'libelle', type: 'texte', entete: 'Libellé' },
  { code: 'montant', type: 'centimes', entete: 'Montant' },
  { code: 'etat', type: 'texte', entete: 'État' },
  { code: 'piece', type: 'texte', entete: 'Pièce liée' },
];

/** Les lignes d'une autre société sont écartées : l'export ne sort jamais ses données. */
export function exporterRapprochement(lignes: readonly LigneExport[], societeId: string): string {
  return ecrireCsv({
    colonnes: COLONNES,
    lignes: lignes
      .filter((x) => x.ligne.societeId === societeId)
      .map((x) => ({
        date: x.ligne.dateOperation, libelle: x.ligne.libelleBrut, montant: x.ligne.montant,
        etat: x.ligne.etatRapprochement, piece: x.pieceId ?? '',
      })),
  });
}
