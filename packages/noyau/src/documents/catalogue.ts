// Catalogue fermé des documents préparés et filtre par forme et mode. Les formes viennent de profil/types.ts.
import type { Forme } from '../profil/types.js';
import type { TypeDocument } from './historique.js';

export type ModeTenue = 'complet' | 'saisie_seule';
export interface EntreeCatalogue {
  code: string;
  typeProduit: TypeDocument;
  formes: readonly Forme[];
  /** Document officiel de clôture : absent en saisie seule. */
  officielCloture: boolean;
}
export interface ResultatCatalogue {
  documents: EntreeCatalogue[];
  absents: { code: string; motif: 'officiel_absent_saisie_seule' }[];
}

export class ErreurCatalogueDocuments extends Error {
  readonly code = 'entree_invalide';
  constructor() {
    super('entree_invalide');
    this.name = 'ErreurCatalogueDocuments';
  }
}

const SOCIETES: readonly Forme[] = ['EURL', 'SARL', 'SASU', 'SAS'];
const TOUTES: readonly Forme[] = ['EI', ...SOCIETES, 'SCI'];
const e = (code: string, typeProduit: TypeDocument, formes: readonly Forme[], officielCloture = false): EntreeCatalogue => ({ code, typeProduit, formes, officielCloture });

export const CATALOGUE_DOCUMENTS: readonly EntreeCatalogue[] = [
  e('convocation_ag', 'pv', ['SARL', 'SAS', 'SCI']),
  e('ordre_du_jour', 'pv', ['SARL', 'SAS', 'SCI']),
  e('feuille_presence', 'pv', ['SARL', 'SAS', 'SCI']),
  e('pv_ag', 'pv', ['SARL', 'SAS', 'SCI']),
  e('consultation_ecrite', 'pv', ['SARL', 'SAS', 'SCI']),
  e('pv_consultation', 'pv', ['SARL', 'SAS', 'SCI']),
  e('acte_unanime', 'pv', ['SAS', 'SCI']),
  e('decision_associe_unique', 'pv', ['EURL', 'SASU']),
  e('rapport_gerant_sci', 'pv', ['SCI']),
  e('bilan', 'etat', ['EI', ...SOCIETES], true),
  e('compte_resultat', 'etat', ['EI', ...SOCIETES], true),
  e('annexe', 'etat', SOCIETES, true),
  e('liasse_fiscale', 'declaration', ['EI', ...SOCIETES], true),
  e('rapport_gestion', 'pv', SOCIETES, true),
  e('fec', 'fec', TOUTES),
  e('declaration_tva', 'declaration_tva', TOUTES),
  e('grand_livre', 'etat', TOUTES),
  e('balance', 'etat', TOUTES),
];

export function catalogueFiltre(forme: Forme, mode: ModeTenue): ResultatCatalogue {
  if (!TOUTES.includes(forme) || (mode !== 'complet' && mode !== 'saisie_seule')) throw new ErreurCatalogueDocuments();
  const applicables = CATALOGUE_DOCUMENTS.filter((d) => d.formes.includes(forme));
  const retire = (d: EntreeCatalogue): boolean => mode === 'saisie_seule' && d.officielCloture;
  return {
    documents: applicables.filter((d) => !retire(d)),
    absents: applicables.filter(retire).map((d) => ({ code: d.code, motif: 'officiel_absent_saisie_seule' as const })),
  };
}
