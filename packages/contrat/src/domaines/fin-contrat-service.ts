import { donneesDuScenario, lireScenario, PARAMETRES_ABONNEMENT_FICTIFS } from '../../../donnees-fictives/src/abonnement.js';
import { effacementPrevuLe, enregistrerAccuse } from '../../../noyau/src/abonnement/fin-contrat.js';
import { leverGel, poserGel } from '../../../noyau/src/abonnement/gel.js';
import { ErreurAbonnement, type EvenementJournal, type FinContrat } from '../../../noyau/src/abonnement/types.js';
import type { EtatFinContrat } from './fin-contrat.js';

export const AUTEUR_FICTIF = 'personne-fictive-1';
const LONGUEUR_DATE = 10;

export type ErreurFinContrat = 'PAS_DE_REMISE' | 'DEJA_ACCUSE' | 'EMPREINTE_DIFFERENTE' | 'GEL_DEJA_ACTIF' | 'GEL_INACTIF' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR';
export type ResultatFinContrat = { ok: true; valeur: EtatFinContrat } | { ok: false; erreur: ErreurFinContrat };

const CODES: Record<string, ErreurFinContrat> = {
  pas_de_remise: 'PAS_DE_REMISE',
  deja_accuse: 'DEJA_ACCUSE',
  empreinte_differente: 'EMPREINTE_DIFFERENTE',
  gel_deja_actif: 'GEL_DEJA_ACTIF',
  gel_inactif: 'GEL_INACTIF',
  motif_manquant: 'BAD_REQUEST',
};

function statutDe(fin: FinContrat): EtatFinContrat['statut'] {
  if (fin.accuseLe !== null) return 'accuse';
  if (fin.remisLe !== null) return 'remis';
  return fin.dateFin === null ? 'aucune' : 'preavis';
}

/** Service en mémoire pur : état propre à chaque instance. Il calcule la date d'effacement prévue, il n'efface jamais rien. */
export function creerServiceFinContrat(options: { horloge: () => string; scenario: string | null }) {
  let fin: FinContrat = donneesDuScenario(lireScenario(options.scenario), options.horloge().slice(0, LONGUEUR_DATE)).finContrat;
  const evenements: EvenementJournal[] = [];
  const reponses = new Map<string, EtatFinContrat>();
  const parametres = PARAMETRES_ABONNEMENT_FICTIFS;
  const etat = (): EtatFinContrat => ({
    statut: statutDe(fin),
    date_fin: fin.dateFin,
    remis_le: fin.remisLe,
    manifeste_empreinte: fin.manifesteEmpreinte,
    accuse_le: fin.accuseLe,
    efface_prevu_le: effacementPrevuLe(fin, parametres.finContrat),
    gel: { actif: fin.gelModule.actif, motif: fin.gelModule.motif, pose_le: fin.gelModule.poseLe },
    gel_console: fin.gelConsole,
  });

  /** Une écriture : rejoue la réponse d'une même clé, sinon applique et mémorise. */
  const ecrire = (cle: string, appliquer: () => void): ResultatFinContrat => {
    const deja = reponses.get(cle);
    if (deja !== undefined) return { ok: true, valeur: deja };
    try {
      appliquer();
    } catch (e) {
      const erreur = e instanceof ErreurAbonnement ? CODES[e.code] : undefined;
      return { ok: false, erreur: erreur ?? 'INTERNAL_SERVER_ERROR' };
    }
    const valeur = etat();
    reponses.set(cle, valeur);
    return { ok: true, valeur };
  };
  const optionsGel = (motif: string) => ({
    motif, par: 'client' as const, auteur: AUTEUR_FICTIF, horodatage: options.horloge(), longueurMaxMotif: parametres.longueurMaxMotif,
  });

  return {
    lire: etat,
    accuser: (cle: string, corps: { manifeste_empreinte: string }): ResultatFinContrat =>
      ecrire('accuse:' + cle, () => {
        const r = enregistrerAccuse(fin, { empreinteRecue: corps.manifeste_empreinte, auteur: AUTEUR_FICTIF, horodatage: options.horloge() });
        fin = r.fin;
        evenements.push(...r.evenements);
      }),
    poserGel: (cle: string, corps: { motif: string }): ResultatFinContrat =>
      ecrire('gel:' + cle, () => {
        const r = poserGel(fin, optionsGel(corps.motif));
        fin = r.fin;
        evenements.push(r.evenement);
      }),
    leverGel: (cle: string, corps: { motif: string }): ResultatFinContrat =>
      ecrire('levee:' + cle, () => {
        const r = leverGel(fin, optionsGel(corps.motif));
        fin = r.fin;
        evenements.push(r.evenement);
      }),
    journal: (): readonly EvenementJournal[] => [...evenements],
  };
}
