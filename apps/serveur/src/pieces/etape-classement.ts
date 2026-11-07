// Étape 5 (classement) : type confirmé, doublons, proposition d'écriture au statut brouillon seulement, jamais validée.
import { classementAutomatiquePermis } from '../../../../packages/noyau/src/pieces/lecture/confiance.js';
import { appliquerTransition } from '../../../../packages/noyau/src/pieces/etats.js';
import { comparerPieces, texteNormalise, type PieceComparee } from '../../../../packages/noyau/src/pieces/classement/doublons.js';
import { proposerEcriture, type ComptesProposition } from '../../../../packages/noyau/src/pieces/classement/proposition.js';
import { compteeParDefaut, confirmerType } from '../../../../packages/noyau/src/pieces/classement/typologie.js';
import type { Ecriture } from '../../../../packages/noyau/src/ecritures/modele.js';
import type { MotifAVerifier, MotifNonComptee, TypePiece } from '../../../../packages/noyau/src/pieces/types.js';
import type { ResultatLecture } from './etape-lecture.js';
import type { DepotPiecesEnregistrees, Horloge, PieceEnregistree } from './ports.js';
export interface RegistreDoublons { autres(societeId: string, sauf: string): Promise<PieceComparee[]>; enregistrer(societeId: string, piece: PieceComparee): Promise<void> }
export interface RegistrePropositions { creerSiAbsente(cleIdempotence: string, ecriture: Ecriture): Promise<'creee' | 'existe'> }
export interface ReglageClassement { distanceImageMax: number; journal: string; comptes: ComptesProposition }
export interface ContexteClassement { depot: DepotPiecesEnregistrees; horloge: Horloge; doublons: RegistreDoublons; propositions: RegistrePropositions; reglage: ReglageClassement }
export interface ResultatClassement {
  piece: PieceEnregistree; type: TypePiece; comptee: boolean; motifs: string[]; motifNonComptee?: MotifNonComptee; cleIdempotence?: string; propositionCreee: boolean;
}
export async function etapeClassement(piece: PieceEnregistree, lecture: ResultatLecture, ctx: ContexteClassement): Promise<ResultatClassement> {
  const { reglage } = ctx;
  const confirme = confirmerType(lecture.typePropose ?? 'inconnu', { texte: lecture.texte, ...(lecture.ttc === undefined ? {} : { ttc: lecture.ttc }), nombreDeNumerosDeFacture: lecture.nombreDeNumeros });
  const motifs = new Set<string>(confirme.aVerifier === undefined ? [] : [confirme.aVerifier]);
  let comptee = compteeParDefaut(confirme.type, confirme.motifNonPiece);
  const courante: PieceComparee = {
    id: piece.id, sha256: piece.sha256, electronique: false, qualite: piece.typeReel === 'pdf' ? 'texte_pdf' : 'photo', recueLe: ctx.horloge.maintenant(),
    texteNormalise: texteNormalise(lecture.texte), ...(lecture.numero === undefined ? {} : { numero: lecture.numero }),
    ...(lecture.date === undefined ? {} : { date: lecture.date }), ...(lecture.ttc === undefined ? {} : { ttc: lecture.ttc }),
  };
  for (const autre of await ctx.doublons.autres(piece.societeId, piece.id)) {
    const verdict = comparerPieces(courante, autre, { distanceImageMax: reglage.distanceImageMax });
    if (verdict.decision === 'collision_numeros') motifs.add('collision_numeros');
    else if (verdict.decision !== 'aucun') comptee = { comptee: false, motif: 'doublon' };
  }
  await ctx.doublons.enregistrer(piece.societeId, courante);
  let cleIdempotence: string | undefined;
  let propositionCreee = false;
  if (comptee.comptee && motifs.size === 0 && lecture.date !== undefined && lecture.ttc !== undefined) {
    const proposition = proposerEcriture({
      id: piece.id, sha256: piece.sha256, type: confirme.type, comptee: true, sensible: lecture.sensible,
      classementAutomatiquePermis: classementAutomatiquePermis(lecture.champs), aVerifier: [...motifs] as MotifAVerifier[],
      date: lecture.date, journal: reglage.journal, parTaux: lecture.parTaux, ttc: lecture.ttc,
    }, reglage.comptes);
    if ('ecriture' in proposition) {
      cleIdempotence = proposition.cleIdempotence;
      propositionCreee = (await ctx.propositions.creerSiAbsente(cleIdempotence, proposition.ecriture)) === 'creee';
    } else motifs.add('aucune_proposition_' + proposition.aucune);
  }
  const prete = cleIdempotence !== undefined;
  const finale = piece.etat === 'lue' ? { ...piece, etat: appliquerTransition(piece.etat, prete ? 'prete' : 'a_verifier') } : piece;
  await ctx.depot.enregistrer(finale);
  return {
    piece: finale, type: confirme.type, comptee: comptee.comptee, motifs: [...motifs].sort(), propositionCreee,
    ...(comptee.comptee ? {} : { motifNonComptee: comptee.motif }), ...(cleIdempotence === undefined ? {} : { cleIdempotence }),
  };
}
