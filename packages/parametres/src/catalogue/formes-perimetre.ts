// Matrice forme × comportement et périmètre du produit (spec 09 §01 règles 5 et 6). Valeurs « à vérifier ».
export type LigneForme = {
  forme: string;
  comportement: string;
  valeur: string;
  source: string;
  statut: 'a_verifier';
  date_releve: string;
};

const RELEVE = '2026-11-06';
const SRC_COMPTE = 'Règlement ANC relatif au plan comptable général';
const SRC_IMPOT = 'CGI art. 206 et 8';

function ligne(forme: string, comportement: string, valeur: string, source: string): LigneForme {
  return { forme, comportement, valeur, source, statut: 'a_verifier', date_releve: RELEVE };
}

const exploitant = ['EI'].map((f) => ligne(f, 'compte_exploitant', '108', SRC_COMPTE));
const associe = ['EURL', 'SARL', 'SASU', 'SAS', 'SCI'].map((f) => ligne(f, 'compte_courant_associe', '455', SRC_COMPTE));
const capital = ['EURL', 'SARL', 'SASU', 'SAS'].map((f) => ligne(f, 'compte_capital', '1013', SRC_COMPTE));
const dividendes = ['EURL', 'SARL', 'SASU', 'SAS'].map((f) => ligne(f, 'dividendes', 'societe_a_l_is', SRC_IMPOT));
const impot: [string, string][] = [
  ['EI', 'IR'],
  ['EURL_PP', 'IR'],
  ['EURL_PM', 'IS'],
  ['SARL', 'IS'],
  ['SASU', 'IS'],
  ['SAS', 'IS'],
  ['SCI', 'IR'],
];

export const MATRICE_FORMES: readonly LigneForme[] = [
  ...exploitant,
  ...associe,
  ...capital,
  ...dividendes,
  ...impot.map(([f, v]) => ligne(f, 'impot_par_defaut', v, SRC_IMPOT)),
];

export const PERIMETRE = {
  formesHorsPerimetre: ['SA', 'cooperative', 'GIE'],
  prefixesPostauxExclus: ['20', '971', '972', '973', '974', '976'],
  effet_debut: RELEVE,
  source: 'périmètre du produit, spec 09 §01 règle 6',
  statut: 'decision_produit',
} as const;
