import { ACTIONS_ECRITURE, ErreurSecurite, type Evenement } from './types.js';

export const SOURCES_ETAT = ['console', 'reglage_local'] as const;
export type SourceEtat = (typeof SOURCES_ETAT)[number];

export interface BrouillonEvenement {
  readonly evenement: Evenement;
  readonly horodatage: string;
  readonly auteur: string;
  readonly donnees: Readonly<Record<string, string>>;
}

function refuser(detail: string): never {
  throw new ErreurSecurite('argument_invalide', detail);
}

function texte(valeur: unknown, nom: string): string {
  if (typeof valeur !== 'string' || valeur.trim() === '') refuser(`${nom} : chaîne non vide attendue`);
  return valeur;
}

function horodatageValide(valeur: unknown): string {
  const t = texte(valeur, 'horodatage');
  if (Number.isNaN(Date.parse(t))) refuser('horodatage : date invalide');
  return t;
}

function entierPositifOuNul(valeur: unknown, nom: string): number {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur) || valeur < 0) refuser(`${nom} : entier positif ou nul attendu`);
  return valeur;
}

export function evenementEtatAcces(p: {
  ancien: string;
  nouveau: string;
  source: string;
  auteur: string;
  horodatage: string;
}): BrouillonEvenement {
  const ancien = texte(p.ancien, 'ancien');
  const nouveau = texte(p.nouveau, 'nouveau');
  if (ancien === nouveau) refuser('ancien et nouveau états identiques');
  if (!(SOURCES_ETAT as readonly string[]).includes(p.source)) refuser('source inconnue');
  const auteur = texte(p.auteur, 'auteur');
  const horodatage = horodatageValide(p.horodatage);
  return { evenement: 'acces.etat_change', horodatage, auteur, donnees: { ancien, nouveau, source: p.source } };
}

export function detecterExportMassif(
  instantsExportsComplets: readonly number[],
  maintenantMs: number,
  reglage: { nombreMax: number; fenetreMs: number },
): boolean {
  const maintenant = entierPositifOuNul(maintenantMs, 'maintenantMs');
  const nombreMax = entierPositifOuNul(reglage.nombreMax, 'nombreMax');
  const fenetre = entierPositifOuNul(reglage.fenetreMs, 'fenetreMs');
  const instants = instantsExportsComplets.map((t) => entierPositifOuNul(t, 'instant'));
  const dansLaFenetre = instants.filter((t) => t <= maintenant && maintenant - t <= fenetre);
  return dansLaFenetre.length > nombreMax;
}

export function evenementEcritureAxionRefusee(p: {
  personneId: string;
  action: string;
  horodatage: string;
}): BrouillonEvenement {
  const personneId = texte(p.personneId, 'personneId');
  if (!(ACTIONS_ECRITURE as readonly string[]).includes(p.action)) refuser('action : écriture attendue');
  const horodatage = horodatageValide(p.horodatage);
  return { evenement: 'securite.ecriture_axion_refusee', horodatage, auteur: personneId, donnees: { action: p.action } };
}
