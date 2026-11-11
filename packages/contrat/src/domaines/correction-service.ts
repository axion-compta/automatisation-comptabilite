import type { Centimes } from '../../../noyau/src/argent/index.js';
import { cheminVirtuel, nomNormalise, type ChampsNom } from '../../../noyau/src/pieces/classement/nom.js';
import { lireDate, lireMontant, resoudreConvention } from '../../../noyau/src/pieces/lecture/formats.js';
import { CHAMPS_SIMPLES } from '../../../noyau/src/pieces/types.js';
import type { PieceDetail } from './pieces.js';
import { mettreAJourPiece, pieceCourante } from './pieces-service.js';

export type RefusCorrection = 'PIECE_INCONNUE' | 'CHAMP_INCONNU' | 'VALEUR_ILLISIBLE' | 'PIECE_SENSIBLE';
export interface EntreeHistorique { champ: string; ancienneValeur: string; nouvelleValeur: string; corrigePar: string; corrigeLe: string; pourquoi: string }

const MONTANTS = new Set(['ttc', 'montant_du']);
const DATES = new Set(['date_service_debut', 'date_service_fin', 'date_echeance', 'date_piece']);
const PAR_TAUX = /^(ht|tva)@\d+$/;
const FR = { decimal: ',', ordreDate: 'JMA' } as const;
const valeurDe = (p: PieceDetail, nom: string): string | undefined => p.champs.find((c) => c.nom === nom)?.valeur;

/** Correction en mémoire (pièces FICTIVES) ; l'historique est en ajout seul. */
export function creerCorrectionEnMemoire(stock: Map<string, PieceDetail>, longueurMax: number, horloge: () => string = () => new Date().toISOString(), auteur = 'utilisateur-fictif-001') {
  const historique: EntreeHistorique[] = [];
  return {
    corriger(id: string, nom: string, valeur: string, pourquoi: string): PieceDetail | RefusCorrection {
      const piece = pieceCourante(stock, id);
      if (piece === undefined) return 'PIECE_INCONNUE';
      if (!(CHAMPS_SIMPLES as readonly string[]).includes(nom) && !PAR_TAUX.test(nom)) return 'CHAMP_INCONNU';
      if (piece.sensible) return 'PIECE_SENSIBLE';
      const convention = resoudreConvention(valeurDe(piece, 'fournisseur_pays') ?? '', valeurDe(piece, 'langue') ?? 'fr') ?? FR;
      let texte = valeur;
      let centimes: number | undefined;
      if (MONTANTS.has(nom) || PAR_TAUX.test(nom)) {
        const m = lireMontant(valeur, convention);
        if ('erreur' in m) return 'VALEUR_ILLISIBLE';
        centimes = m.centimes;
        texte = String(m.centimes);
      } else if (DATES.has(nom)) {
        const d = lireDate(valeur, convention);
        if ('erreur' in d) return 'VALEUR_ILLISIBLE';
        texte = d.date;
      }
      const ancien = valeurDe(piece, nom) ?? '';
      const champ = { nom, valeur: texte, ...(centimes === undefined ? {} : { valeurCentimes: centimes }), mot: 'sur', source: piece.champs.find((c) => c.nom === nom)?.source ?? 'correction' };
      const champs = piece.champs.some((c) => c.nom === nom) ? piece.champs.map((c) => (c.nom === nom ? champ : c)) : [...piece.champs, champ];
      const lu = (n: string): string | undefined => champs.find((c) => c.nom === n)?.valeur;
      const ttc = champs.find((c) => c.nom === 'ttc')?.valeurCentimes;
      const datePiece = lu('date_piece');
      const nomChamps: ChampsNom = {};
      const [fournisseur, numero, devise] = [lu('fournisseur_nom'), lu('numero'), lu('devise')];
      if (datePiece !== undefined) nomChamps.datePiece = datePiece;
      if (fournisseur !== undefined) nomChamps.fournisseur = fournisseur;
      if (numero !== undefined) nomChamps.numero = numero;
      if (devise !== undefined) nomChamps.devise = devise;
      if (ttc !== undefined) nomChamps.ttc = ttc as Centimes;
      const nomNorm = nomNormalise(nomChamps, longueurMax);
      const maj: PieceDetail = {
        ...piece,
        champs,
        nomNormalise: nomNorm,
        cheminVirtuel: `/pieces/${cheminVirtuel(nomChamps)}/${nomNorm}`,
        motConfiance: champs.some((c) => c.mot === 'douteux') ? 'douteux' : piece.etat === 'a_verifier' || piece.motifsAVerifier.length > 0 ? 'a_verifier' : 'sur',
      };
      if (datePiece !== undefined) maj.datePiece = datePiece;
      if (ttc !== undefined) maj.ttcCentimes = ttc;
      historique.push({ champ: nom, ancienneValeur: ancien, nouvelleValeur: texte, corrigePar: auteur, corrigeLe: horloge(), pourquoi });
      return mettreAJourPiece(stock, id, maj);
    },
    historique: (): readonly EntreeHistorique[] => [...historique],
  };
}
