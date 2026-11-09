import { donneesDuScenario, lireScenario } from '../../../donnees-fictives/src/abonnement.js';
import { accepter, acceptationsManquantes, documentEnVigueur, type Acceptation } from '../../../noyau/src/abonnement/documents.js';
import { ErreurAbonnement, type EvenementJournal } from '../../../noyau/src/abonnement/types.js';

export const PERSONNE_FICTIVE = 'personne-fictive-1';
export const ORGANISATION_FICTIVE = 'organisation-fictive-x';
/** Types de documents exigés avant toute action de la compta (identiques à ceux du jeu fictif). */
export const TYPES_REQUIS: readonly string[] = ['cgv'];
const LONGUEUR_DATE = 10;

export type ResultatAcceptation = { ok: true; valeur: { type: string; version: number; accepte_le: string } } | { ok: false; erreur: 'VERSION_PERIMEE' | 'DOCUMENT_ABSENT' };

/** Service en mémoire pur : état propre à chaque instance, identité fictive tant que l'identité réelle n'est pas branchée. */
export function creerServiceAcceptations(options: { horloge: () => string; scenario: string | null }) {
  const donnees = donneesDuScenario(lireScenario(options.scenario), options.horloge().slice(0, LONGUEUR_DATE));
  const acceptations: Acceptation[] = donnees.acceptations.map((a) => ({ ...a, personne: PERSONNE_FICTIVE, organisation: ORGANISATION_FICTIVE }));
  const evenements: EvenementJournal[] = [];
  const reponses = new Map<string, ResultatAcceptation>();

  return {
    aAccepter() {
      const date = options.horloge().slice(0, LONGUEUR_DATE);
      const manquantes = acceptationsManquantes({
        documents: donnees.documents, acceptations, personne: PERSONNE_FICTIVE, organisation: ORGANISATION_FICTIVE, typesRequis: TYPES_REQUIS, date,
      });
      return manquantes.map((m) => {
        const d = documentEnVigueur(donnees.documents, m.type, date);
        if (d === null) throw new ErreurAbonnement('document_absent');
        return { type: d.type, version: d.version, approuve_le: d.approuveLe + 'T00:00:00Z', empreinte: d.empreinte, sources: [...d.sources] };
      });
    },
    accepter(cle: string, corps: { type: string; version: number }): ResultatAcceptation {
      const deja = reponses.get(cle);
      if (deja !== undefined) return deja;
      const horodatage = options.horloge();
      let resultat: ResultatAcceptation;
      try {
        const r = accepter({ documents: donnees.documents, personne: PERSONNE_FICTIVE, organisation: ORGANISATION_FICTIVE, ...corps, horodatage });
        acceptations.push(r.acceptation);
        evenements.push(r.evenement);
        resultat = { ok: true, valeur: { type: corps.type, version: corps.version, accepte_le: horodatage } };
      } catch (e) {
        if (!(e instanceof ErreurAbonnement)) throw e;
        const erreur = ({ version_perimee: 'VERSION_PERIMEE', document_absent: 'DOCUMENT_ABSENT' } as Record<string, 'VERSION_PERIMEE' | 'DOCUMENT_ABSENT'>)[e.code];
        if (erreur === undefined) throw e;
        return { ok: false, erreur };
      }
      reponses.set(cle, resultat);
      return resultat;
    },
    journal: (): readonly EvenementJournal[] => [...evenements],
  };
}
