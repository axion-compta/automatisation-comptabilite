// Ventes : du résultat de lecture (lot 04) à une pièce de vente. L'IA propose, une personne valide.
// Aucun appel à un modèle ici ; aucun montant n'est calculé par l'IA : le code additionne les lignes lues.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { natureProposee, sensDeLaPiece, typeProbable } from './reconnaissance.js';
import type { EntreeCatalogue, Habitude, IdentiteLue, Societe } from './reconnaissance.js';
import { ErreurVente, estDans, exigerDate, ORIGINES_VENTE } from './types.js';
import type { CodeTvaVente, LigneVente, NatureLigne, OrigineVente, PieceVente } from './types.js';

export interface PropositionIA {
  nature?: unknown;
  compteProduit?: unknown;
}
export interface LigneLue {
  libelle: string;
  htCentimes: number;
  tauxPdb: number | null;
  tvaLueCentimes: number;
  proposition?: PropositionIA;
}
export interface LectureVente {
  vendeur: IdentiteLue;
  clientId?: string;
  origine: OrigineVente;
  numero: string;
  dateFacture: string;
  dateOperation?: string;
  echeance?: string;
  texteContientAvoir: boolean;
  texteContientAcompte: boolean;
  lignes: readonly LigneLue[];
}
export interface ContexteVente {
  pieceId: string;
  societe: Societe;
  comptesProduit: readonly string[];
  habitude?: Habitude;
  catalogue: readonly EntreeCatalogue[];
}
export type ResultatLecture =
  | { circuit: 'ventes'; piece: PieceVente; lignes: LigneVente[]; aConfirmer: string[] }
  | { circuit: 'achats' | 'a_verifier' };

const refuser = (code: string): never => {
  throw new ErreurVente(code, code);
};
const entierSur = (v: unknown, code: string): number => (Number.isSafeInteger(v) ? (v as number) : refuser(code));
const texteSur = (v: unknown, code: string): string => (typeof v === 'string' && v.trim() !== '' ? v : refuser(code));

/** Nature et compte : la proposition de l'IA n'est retenue que si les listes connues la confirment. */
function choisir(l: LigneLue, c: ContexteVente): { nature: NatureLigne; compteProduit?: string } {
  const regle = natureProposee(l.libelle, c.habitude, c.catalogue);
  const p = l.proposition;
  if (p === undefined) return regle;
  const valide = (p.nature === 'bien' || p.nature === 'service') && typeof p.compteProduit === 'string' && c.comptesProduit.includes(p.compteProduit);
  if (!valide) return { nature: 'a_confirmer' };
  const ia = { nature: p.nature as NatureLigne, compteProduit: p.compteProduit as string };
  if (regle.nature === 'a_confirmer') return ia;
  return regle.nature === ia.nature ? regle : { nature: 'a_confirmer' };
}

export function pieceDepuisLecture(lecture: LectureVente, ctx: ContexteVente): ResultatLecture {
  const sens = sensDeLaPiece(lecture.vendeur, ctx.societe);
  if (sens !== 'vente') return { circuit: sens === 'achat' ? 'achats' : 'a_verifier' };
  if (!estDans(ORIGINES_VENTE, lecture.origine)) refuser('origine_invalide');
  if (!Array.isArray(lecture.lignes) || lecture.lignes.length === 0) refuser('lignes_absentes');
  const numero = texteSur(lecture.numero, 'numero_invalide');
  const dateFacture = exigerDate(lecture.dateFacture, 'dateFacture');
  let ht = centimes(0);
  let tva = centimes(0);
  const aConfirmer: string[] = [];
  const lignes = lecture.lignes.map((l, i): LigneVente => {
    const htL = centimes(entierSur(l.htCentimes, 'montant_invalide'));
    const tvaL = centimes(entierSur(l.tvaLueCentimes, 'montant_invalide'));
    if (l.tauxPdb !== null) entierSur(l.tauxPdb, 'taux_invalide');
    if (l.tauxPdb !== null && l.tauxPdb < 0) refuser('taux_invalide');
    ht = ajouter(ht, htL);
    tva = ajouter(tva, tvaL);
    const n = choisir(l, ctx);
    if (n.nature === 'a_confirmer') aConfirmer.push(`ligne ${i + 1}`);
    const codeTva: CodeTvaVente = l.tauxPdb !== null && tvaL !== 0 ? 'COLLECTEE' : 'A_VERIFIER';
    return {
      libelle: texteSur(l.libelle, 'libelle_invalide'),
      htCentimes: htL,
      tauxPdb: l.tauxPdb,
      tvaLueCentimes: tvaL,
      nature: n.nature,
      ...(n.compteProduit === undefined ? {} : { compteProduit: n.compteProduit }),
      codeTva,
    };
  });
  const ttc: Centimes = ajouter(ht, tva);
  const type = typeProbable({ ttc, texteContientAvoir: lecture.texteContientAvoir, texteContientAcompte: lecture.texteContientAcompte });
  if (type.aConfirmer) aConfirmer.push('type');
  const piece: PieceVente = {
    id: texteSur(ctx.pieceId, 'id_invalide'),
    type: type.type,
    origine: lecture.origine,
    ...(lecture.clientId === undefined ? {} : { clientId: lecture.clientId }),
    numero,
    dateFacture,
    ...(lecture.dateOperation === undefined ? {} : { dateOperation: exigerDate(lecture.dateOperation, 'dateOperation') }),
    ...(lecture.echeance === undefined ? {} : { echeance: exigerDate(lecture.echeance, 'echeance') }),
    htCentimes: ht,
    tvaCentimes: tva,
    ttcCentimes: ttc,
    statut: aConfirmer.length > 0 ? 'a_verifier' : 'proposee',
  };
  return { circuit: 'ventes', piece, lignes, aConfirmer };
}
