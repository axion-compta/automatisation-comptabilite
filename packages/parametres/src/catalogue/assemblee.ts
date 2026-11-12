// Règles datées de l'organe d'approbation des comptes par forme (articles cités). Valeurs « à vérifier » : aucune ligne validée.
export type LigneAssemblee = {
  forme: 'EI' | 'EURL' | 'SASU' | 'SARL' | 'SAS' | 'SCI';
  cas: 'defaut' | 'associe_unique_dirigeant' | 'associe_unique_non_dirigeant' | 'sans_ag' | 'avec_ag';
  organe: 'exploitant' | 'associe_unique' | 'assemblee_generale' | 'collectivite_associes' | 'gerant';
  modes: ('assemblee' | 'consultation_ecrite' | 'acte_unanime' | 'decision_associe_unique' | 'rapport_gerant')[];
  selonStatuts: boolean;
  depotVautApprobation: boolean;
  valableAPartir: string;
  source: string;
  statut: 'a_verifier';
};

const DEBUT = '2022-12-31';
const l = (
  forme: LigneAssemblee['forme'],
  cas: LigneAssemblee['cas'],
  organe: LigneAssemblee['organe'],
  modes: LigneAssemblee['modes'],
  source: string,
  options: { selonStatuts?: boolean; depot?: boolean } = {},
): LigneAssemblee => ({
  forme, cas, organe, modes,
  selonStatuts: options.selonStatuts === true,
  depotVautApprobation: options.depot === true,
  valableAPartir: DEBUT,
  source,
  statut: 'a_verifier',
});
const UNIQUE: LigneAssemblee['modes'] = ['decision_associe_unique'];
export const REGLES_ASSEMBLEE: readonly LigneAssemblee[] = [
  l('EI', 'defaut', 'exploitant', [], 'Code de commerce art. L123-12 (comptes de l\'exploitant, pas d\'assemblée)'),
  l('EURL', 'associe_unique_dirigeant', 'associe_unique', UNIQUE, 'Code de commerce art. L223-31 al. 4 (dépôt des comptes valant approbation)', { depot: true }),
  l('EURL', 'associe_unique_non_dirigeant', 'associe_unique', UNIQUE, 'Code de commerce art. L223-31 (décision de l\'associé unique)'),
  l('SASU', 'associe_unique_dirigeant', 'associe_unique', UNIQUE, 'Code de commerce art. L227-9 et L227-10 (décisions de l\'associé unique)'),
  l('SASU', 'associe_unique_non_dirigeant', 'associe_unique', UNIQUE, 'Code de commerce art. L227-9 et L227-10 (décisions de l\'associé unique)'),
  l('SARL', 'defaut', 'assemblee_generale', ['assemblee', 'consultation_ecrite'], 'Code de commerce art. L223-26 et L223-27 (assemblée annuelle, consultation écrite)'),
  l('SAS', 'defaut', 'collectivite_associes', ['assemblee', 'consultation_ecrite', 'acte_unanime'], 'Code de commerce art. L227-9 (modes fixés par les statuts)', { selonStatuts: true }),
  l('SCI', 'sans_ag', 'gerant', ['rapport_gerant'], 'Code civil art. 1856 (rapport du gérant sur l\'activité)'),
  l('SCI', 'avec_ag', 'assemblee_generale', ['assemblee', 'consultation_ecrite', 'acte_unanime'], 'Code civil art. 1853 (décisions collectives selon les statuts)', { selonStatuts: true }),
];
