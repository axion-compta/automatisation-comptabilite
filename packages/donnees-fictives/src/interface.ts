// Données fictives du lot 15 (interface) : santé, alertes, échéances, pièces, termes, notifications.
// Graine fixe, aucune donnée réelle (V3-PRI-017). Définitions et seuils : DÉMONSTRATION seulement.
import { creerAlea, GRAINE } from './generateur.js';

export type GraviteFictive = 'info' | 'a_faire' | 'urgent' | 'bloquant';
export type EtatFictif = 'ouverte' | 'reportee' | 'ignoree' | 'resolue_auto' | 'resolue';

export interface DefinitionsDemonstration {
  demonstration: true;
  ca: { prefixes: string[]; deduire: string[] };
  charges: { prefixes: string[]; exclure: string[] };
  produits: { prefixes: string[] };
  tresorerie: { prefixes: string[] };
}
export interface SeuilsDemonstration {
  demonstration: true;
  vertPourCent: number;
  orangePourCent: number;
}
export type SousIndicateurFictif = { code: string; nombre: number; sur: number } | { code: string; absent: true };
export interface AlerteFictive {
  id: string;
  regle: string;
  objetType: string;
  objetId: string;
  cle: string;
  gravite: GraviteFictive;
  etat: EtatFictif;
  entreeMenu: string;
  version: number;
}
export interface EcheanceFictive {
  id: string;
  type: 'tva' | 'acompte_is' | 'liasse' | 'cfe' | 'autre';
  dateLimite?: string;
  aVerifier: boolean;
  sourceUrl?: string;
  faite: boolean;
}
export interface PieceFictive {
  id: string;
  nom: string;
  texteLu: string;
  sensible: boolean;
}
export interface TermeFictif {
  code: string;
  simple: string;
  comptable: string;
  survol: string;
  validePar: number;
}
export interface NotificationFictive {
  id: string;
  code: string;
  lue: boolean;
  creeLe: string;
}
export interface ProfilInterface {
  jourDeReference: string;
  definitionsDemonstration: DefinitionsDemonstration;
  seuilsDemonstration: SeuilsDemonstration;
  sousIndicateurs: SousIndicateurFictif[];
  regroupement: { arc: string; codes: string[] }[];
  alertes: AlerteFictive[];
  echeances: EcheanceFictive[];
  pieces: PieceFictive[];
  termes: TermeFictif[];
  notifications: NotificationFictive[];
}
export interface JeuInterface {
  version: 1;
  profils: { pleine: ProfilInterface; vide: ProfilInterface };
}

const JOUR = '2026-10-15';
const DEFINITIONS: DefinitionsDemonstration = {
  demonstration: true,
  ca: { prefixes: ['70'], deduire: ['709'] },
  charges: { prefixes: ['6'], exclure: ['695', '699'] },
  produits: { prefixes: ['7'] },
  tresorerie: { prefixes: ['512', '530'] },
};
const SEUILS: SeuilsDemonstration = { demonstration: true, vertPourCent: 90, orangePourCent: 70 };

// code, entrée du menu, gravité, état
const ALERTES: [string, string, GraviteFictive, EtatFictif][] = [
  ['ALR-01', 'declarations', 'bloquant', 'ouverte'],
  ['ALR-02', 'mois', 'urgent', 'reportee'],
  ['ALR-03', 'banque', 'a_faire', 'ignoree'],
  ['ALR-04', 'declarations', 'urgent', 'ouverte'],
  ['ALR-05', 'mois', 'bloquant', 'ouverte'],
  ['ALR-06', 'factures', 'a_faire', 'resolue_auto'],
  ['ALR-07', 'documents', 'info', 'resolue'],
  ['ALR-08', 'activite', 'info', 'ouverte'],
  ['ALR-09', 'banque', 'urgent', 'ouverte'],
  ['ALR-10', 'factures', 'a_faire', 'reportee'],
  ['ALR-11', 'documents', 'info', 'ignoree'],
];
const TEXTES_HOSTILES = ['<script>alert(1)</script>', '=HYPERLINK("x")'];
const TERMES: [string, string, string, string][] = [
  ['creance', 'Argent que des clients vous doivent', 'Créance client', 'Somme due par un client.'],
  ['dette', 'Argent que vous devez', 'Dette fournisseur', 'Somme due à un fournisseur.'],
  ['rapprochement', 'Faire correspondre banque et pièces', 'Rapprochement bancaire', 'Mise en regard des lignes.'],
  ['resultat', 'Ce que vous gagnez, avant impôt', 'Résultat provisoire avant impôt', 'Produits moins charges.'],
];

function profilPlein(graine: number): ProfilInterface {
  const alea = creerAlea(graine);
  const entier = (n: number): number => Math.floor(alea() * n);
  const suffixe = (): string => String(100 + entier(900));
  const alertes = ALERTES.map(([regle, entreeMenu, gravite, etat], i) => {
    const objetId = `obj-${suffixe()}`;
    return { id: `al-${i + 1}-${suffixe()}`, regle, objetType: 'piece', objetId, cle: `${regle}|piece|${objetId}`, gravite, etat, entreeMenu, version: 1 };
  });
  const echeances: EcheanceFictive[] = [
    { id: 'ech-1', type: 'tva', dateLimite: '2026-10-19', aVerifier: false, faite: false },
    { id: 'ech-2', type: 'acompte_is', aVerifier: false, faite: false },
    { id: 'ech-3', type: 'liasse', dateLimite: '2027-05-03', aVerifier: true, sourceUrl: 'https://exemple.invalid/liasse', faite: false },
    { id: 'ech-4', type: 'cfe', dateLimite: '2026-09-15', aVerifier: false, faite: true },
  ];
  const texteMontant = `Facture ${suffixe()} de Société Fictive SAS : 1 234,50 € TTC, SIREN 123456782, règlement à échéance, prestation réalisée à Été-sur-Mer.`;
  const pieces: PieceFictive[] = [
    { id: 'pc-1', nom: 'facture-fictive.pdf', texteLu: texteMontant, sensible: false },
    ...TEXTES_HOSTILES.map((texteLu, i) => ({ id: `pc-${i + 2}`, nom: `hostile-${i + 1}.txt`, texteLu, sensible: false })),
    { id: 'pc-4', nom: 'bulletin-fictif.pdf', texteLu: 'Bulletin de Camille Fictif, contact camille@exemple.fr', sensible: true },
  ];
  return {
    jourDeReference: JOUR,
    definitionsDemonstration: DEFINITIONS,
    seuilsDemonstration: SEUILS,
    sousIndicateurs: [
      { code: 'pieces_classees', nombre: 18 + entier(3), sur: 20 },
      { code: 'pieces_lues', nombre: 9, sur: 10 },
      { code: 'banque_rapprochee', nombre: 5, sur: 10 },
      { code: 'tva_prete', nombre: 0, sur: 4 },
      { code: 'ecritures_validees', absent: true },
    ],
    regroupement: [
      { arc: 'pieces', codes: ['pieces_classees', 'pieces_lues'] },
      { arc: 'banque', codes: ['banque_rapprochee'] },
      { arc: 'tva', codes: ['tva_prete', 'ecritures_validees'] },
    ],
    alertes,
    echeances,
    pieces,
    termes: TERMES.map(([code, simple, comptable, survol], i) => ({ code, simple, comptable, survol, validePar: i })),
    notifications: [
      { id: 'no-1', code: 'ALR-01', lue: false, creeLe: JOUR },
      { id: 'no-2', code: 'ALR-04', lue: true, creeLe: '2026-10-10' },
      { id: 'no-3', code: 'ALR-09', lue: false, creeLe: '2026-10-14' },
    ],
  };
}

export function genererInterface(graine: number = GRAINE): JeuInterface {
  const vide: ProfilInterface = {
    jourDeReference: JOUR,
    definitionsDemonstration: DEFINITIONS,
    seuilsDemonstration: SEUILS,
    sousIndicateurs: [],
    regroupement: [],
    alertes: [],
    echeances: [],
    pieces: [],
    termes: [],
    notifications: [],
  };
  return { version: 1, profils: { pleine: profilPlein(graine), vide } };
}
