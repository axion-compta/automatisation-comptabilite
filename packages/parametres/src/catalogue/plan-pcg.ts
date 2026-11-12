// Catalogue daté : versions du plan comptable général selon la date d'ouverture de l'exercice.
// Aucune ligne « valide » : dates d'effet, comptes supprimés et compte de subvention restent à confirmer. Fin EXCLUE.
import type { ParametreSource } from '../source.js';

const RELEVE = '2026-11-12';
const SOURCE_URL = 'https://www.legifrance.gouv.fr/';
const SOURCE_TITRE = 'Règlement de l’Autorité des normes comptables sur le plan comptable général (Légifrance)';

type Version = {
  id: string;
  debut: string;
  fin: string | null;
  prefixesSupprimes: string[];
  compteSubvention: string;
};

const VERSIONS: Version[] = [
  { id: 'pcg_ancien', debut: '2014-01-01', fin: '2025-01-01', prefixesSupprimes: [], compteSubvention: '777' },
  { id: 'pcg_2025', debut: '2025-01-01', fin: null, prefixesSupprimes: ['79'], compteSubvention: '747' },
];

function ligne(v: Version): ParametreSource {
  const { debut, fin, ...reste } = v;
  return {
    cle: 'pcg.version',
    pays: 'FR',
    valeur: JSON.stringify(reste),
    effet_debut: debut,
    effet_fin: fin,
    statut: 'non_verifie',
    source: `${SOURCE_TITRE} ; dates, comptes supprimés et compte de subvention à confirmer`,
    source_url: SOURCE_URL,
    source_titre: SOURCE_TITRE,
    source_maj: null,
    date_releve: RELEVE,
  };
}

export const CATALOGUE_PLAN_PCG: ParametreSource[] = VERSIONS.map(ligne);
