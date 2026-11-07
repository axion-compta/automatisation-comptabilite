// Profils fictifs (spec 09 §05). Noms et SIREN du jeu existant ; valeurs inventées, aucune valeur légale.
import { creerAlea } from './generateur.js';

export interface SocieteProfilFictive { id: string; denomination: string; forme: string; siren: string | null; enFormation: boolean }
export interface ChampFictif {
  societeId: string; cle: string; valeur: string; origine: string; confiance: string; source_ref: string | null;
  date_source: string | null; statut: string; effet_debut: string; confirme_par: string | null; confirme_le: string | null; rang: number;
}
export interface LigneRegimeFictive { societeId: string; regime: string; effet_debut: string; effet_fin: string | null }
export interface LigneImpositionFictive { societeId: string; impot: string; categorie: string; regime: string; effet_debut: string }
export interface ParametreFictif {
  cle: string; pays: string; valeur: string; effet_debut: string; effet_fin: string | null; statut: string;
  source: string; source_url: string; source_titre: string; source_maj: string | null; date_releve: string;
}
export interface IdentiteFictive { siren: string; denomination: string; forme: string; viesNumero: string; vies: 'valide' | 'invalide' | 'indisponible' }

export const perimetreFictif = { formesHorsPerimetre: ['FORME_X'], prefixesPostauxExclus: ['99'] };

const LEMOINE = 'soc-lemoine';
const BERTIN = 'soc-bertin';
const RIVOIRE = 'soc-rivoire';
const PIECE = 'piece-fictive-001#page=1';

export function genererProfils(graine = 1) {
  const alea = creerAlea(graine);
  const jour = () => String(1 + Math.floor(alea() * 28)).padStart(2, '0');
  const champs: ChampFictif[] = [];
  const ajouter = (societeId: string, cle: string, valeur: string, origine: string, confiance: string, statut: string, debut: string) => {
    const confirme = statut === 'confirme';
    champs.push({
      societeId, cle, valeur, origine, confiance,
      source_ref: origine === 'saisie_personne' ? null : PIECE,
      date_source: origine === 'saisie_personne' ? null : '2026-05-' + jour(),
      statut, effet_debut: debut,
      confirme_par: confirme ? 'personne-fictive-1' : null,
      confirme_le: confirme ? '2026-06-' + jour() : null,
      rang: champs.length,
    });
  };
  const tout = (id: string, nom: string, siren: string | null, forme: string, tenue: string, debut: string) => {
    ajouter(id, 'denomination', nom, 'sirene', 'sur', 'confirme', debut);
    ajouter(id, 'siren', siren ?? '', siren === null ? 'saisie_personne' : 'sirene', 'sur', siren === null ? 'vide' : 'confirme', debut);
    ajouter(id, 'tenue', tenue, 'saisie_personne', 'sur', 'confirme', debut);
  };
  tout(LEMOINE, 'Lemoine Rénovation', '123456782', 'SARL', 'partie_double', '2024-01-01');
  ajouter(LEMOINE, 'forme', 'SARL', 'document', 'sur', 'confirme', '2024-01-01');
  ajouter(LEMOINE, 'exercice_debut', '2026-07-01', 'document', 'sur', 'confirme', '2026-07-01');
  ajouter(LEMOINE, 'exercice_fin', '2027-06-30', 'document', 'sur', 'confirme', '2026-07-01');
  ajouter(LEMOINE, 'regime_tva', 'reel_simplifie', 'proposition_ia', 'a_verifier', 'a_confirmer', '2026-07-01');
  tout(BERTIN, 'Atelier Bertin', null, 'EI', 'livre_recettes', '2026-01-01');
  ajouter(BERTIN, 'forme', 'EI', 'saisie_personne', 'sur', 'confirme', '2026-01-01');
  ajouter(BERTIN, 'en_formation', 'vrai', 'saisie_personne', 'sur', 'confirme', '2026-01-01');
  tout(RIVOIRE, 'Boulangerie Rivoire', '987654324', 'SAS', 'partie_double', '2024-01-01');
  ajouter(RIVOIRE, 'forme', 'SARL', 'document', 'sur', 'confirme', '2024-01-01');
  ajouter(RIVOIRE, 'forme', 'SAS', 'document', 'a_verifier', 'confirme', '2026-01-01');

  const source = { source: 'Source inventée', source_url: 'https://www.legifrance.gouv.fr/fictif/chemin-001', source_titre: 'Titre inventé', source_maj: '2026-04-01', date_releve: '2026-05-01' };
  const parametre = (cle: string, valeur: string, statut: string): ParametreFictif => ({ cle, pays: 'FR', valeur, effet_debut: '2026-01-01', effet_fin: null, statut, ...source });
  return {
    societes: [
      { id: LEMOINE, denomination: 'Lemoine Rénovation', forme: 'SARL', siren: '123456782', enFormation: false },
      { id: BERTIN, denomination: 'Atelier Bertin', forme: 'EI', siren: null, enFormation: true },
      { id: RIVOIRE, denomination: 'Boulangerie Rivoire', forme: 'SAS', siren: '987654324', enFormation: false },
    ] as SocieteProfilFictive[],
    champs,
    regimesTva: [
      { societeId: LEMOINE, regime: 'reel_simplifie', effet_debut: '2026-07-01', effet_fin: null },
      { societeId: BERTIN, regime: 'franchise', effet_debut: '2026-01-01', effet_fin: null },
      { societeId: RIVOIRE, regime: 'reel_normal', effet_debut: '2024-01-01', effet_fin: null },
    ] as LigneRegimeFictive[],
    regimesImposition: [
      { societeId: LEMOINE, impot: 'IS', categorie: 'BIC', regime: 'reel_simplifie', effet_debut: '2026-07-01' },
      { societeId: BERTIN, impot: 'IR', categorie: 'BNC', regime: 'micro', effet_debut: '2026-01-01' },
      { societeId: RIVOIRE, impot: 'IS', categorie: 'BIC', regime: 'reel_normal', effet_debut: '2024-01-01' },
    ] as LigneImpositionFictive[],
    parametres: [
      parametre('fictif.seuil_a', 'valeur-inventee-a', 'non_verifie'),
      parametre('fictif.taux_b', 'valeur-inventee-b', 'a_verifier'),
      parametre('fictif.seuil_c', 'valeur-inventee-c', 'valide'),
      parametre('fictif.taux_d', 'valeur-inventee-d', 'retire'),
    ] as ParametreFictif[],
    identites: [
      { siren: '123456782', denomination: 'Lemoine Rénovation', forme: 'SARL', viesNumero: 'FR00123456782', vies: 'valide' },
      { siren: '987654324', denomination: 'Boulangerie Rivoire', forme: 'SAS', viesNumero: 'FR00987654324', vies: 'indisponible' },
      { siren: '123456782', denomination: 'Société inventée', forme: 'SARL', viesNumero: 'FR00000000000', vies: 'invalide' },
    ] as IdentiteFictive[],
  };
}
