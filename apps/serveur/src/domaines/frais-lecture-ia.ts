import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerFauxFournisseurLecture, creerServiceLectureIa, type FournisseurLectureIa } from '../../../../packages/contrat/src/domaines/frais-lecture-ia.js';
import { exigerSociete, type ContexteProfil } from './profil.js';

/** Lecture du ticket par l'IA : fournisseur injecté (faux par défaut, aucun appel réseau, aucun fournisseur réel). */
export function implementerFraisLectureIa(os: ReturnType<typeof implement<typeof contrat>>, fournisseur: FournisseurLectureIa = creerFauxFournisseurLecture()) {
  const service = creerServiceLectureIa(fournisseur);
  return {
    lireTicketFrais: os.fraisLectureIa.lireTicketFrais.handler(async ({ input, context }) => {
      exigerSociete(context as unknown as ContexteProfil, input.params.s);
      return { body: await service.preparer(input.body.pieceId, input.body) };
    }),
  };
}
