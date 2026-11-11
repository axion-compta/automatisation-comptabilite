import { PERMISSIONS } from '../../../../packages/noyau/src/securite/types.js';

export const CODE_MODULE = 'compta';
export const VERSION_MODULE = '0.1.0';

export interface CasEssai {
  id: string;
  type: 'normal' | 'panne' | 'email-piege';
  entree: Readonly<Record<string, string>>;
}

const SIRENS_FICTIFS = ['123456782', '987654324'] as const;
const NB_NORMAUX = SIRENS_FICTIFS.length * 9;
const num = (n: number): string => String(n).padStart(2, '0');

const normaux: CasEssai[] = Array.from({ length: NB_NORMAUX }, (_, i) => ({
  id: `compta-${num(i + 1)}`,
  type: 'normal',
  entree: { reference: `FICT-${num(i + 1)}`, siren: SIRENS_FICTIFS[i % SIRENS_FICTIFS.length] as string },
}));

export const JEU_ESSAI_COMPTA: readonly CasEssai[] = Object.freeze([
  ...normaux,
  {
    id: `compta-${num(NB_NORMAUX + 1)}`,
    type: 'panne',
    entree: { reference: `FICT-${num(NB_NORMAUX + 1)}`, panne: 'service-lecture-indisponible' },
  },
  {
    id: `compta-${num(NB_NORMAUX + 2)}`,
    type: 'email-piege',
    entree: { reference: `FICT-${num(NB_NORMAUX + 2)}`, expediteur: 'piege@exemple.fr' },
  },
]);

export function migrerCompta(): string[] {
  return ['CREATE SCHEMA IF NOT EXISTS a_compta'];
}

// Bloc commercial (D73, D74) : déclaratif, sans aucun montant ; la console gère le reste.
export const COMMERCIAL_COMPTA = {
  modesArrivee: ['installation_axion', 'libre_service'],
  libreService: true,
  operationsMiseEnService: ['creerEspace', 'inviter', 'suspendre', 'geler', 'supprimer'],
  evenementsConsommation: [
    { code: 'consommation_ia', champs: ['societe', 'agent', 'coutMicroCentimes', 'date'] },
  ],
};

export const MANIFESTE_COMPTA = {
  code: CODE_MODULE,
  version: VERSION_MODULE,
  contrat: '0.5.0', // hypothèse, en attente de D29
  permissions: [...PERMISSIONS],
  actionsAutomatiquesAutorisees: [] as string[],
  tablesAjoutSeul: [] as string[],
  actif: false,
  commercial: COMMERCIAL_COMPTA,
  jeuEssai: JEU_ESSAI_COMPTA,
  migrer: migrerCompta,
};
