// Données fictives de l'abonnement (V3-PLA-154, V3-PLA-158). Source unique du serveur en mémoire et du faux serveur.
// Aucune donnée réelle, aucun prix. Dates calculées depuis `aujourdhui` ; seule la graine est fixe.
import type { Acceptation, DocumentContractuel } from '../../noyau/src/abonnement/documents.js';
import type { ParametresFinContrat } from '../../noyau/src/abonnement/fin-contrat.js';
import type { Palier } from '../../noyau/src/abonnement/paliers.js';
import type { PieceEnAttente } from '../../noyau/src/abonnement/pieces.js';
import { ajouterJours, ecartJours, type EtatVoulu, type FinContrat } from '../../noyau/src/abonnement/types.js';
import { creerAlea, GRAINE } from './generateur.js';

export const SOCIETES_FICTIVES_ABONNEMENT = ['Société A fictive', 'Société B fictive'] as const;
const [CLIENT, PERSONNE] = ['Client X fictif', 'Alice Fictive'];
const [BASE_BPS, HEX] = [10000, '0123456789abcdef'];

export const PALIERS_FICTIFS: readonly Palier[] = [
  { code: 'compta-1', nomAffiche: '100 pièces par mois', piecesParMois: 100, societesMax: 1, fonctions: ['ecritures'] },
  { code: 'compta-2', nomAffiche: '300 pièces par mois', piecesParMois: 300, societesMax: 3, fonctions: ['ecritures', 'declarations'] },
  { code: 'compta-3', nomAffiche: '1000 pièces par mois', piecesParMois: 1000, societesMax: 10, fonctions: ['ecritures', 'declarations', 'export'] },
];

export const PARAMETRES_ABONNEMENT_FICTIFS: {
  seuilsBps: readonly number[]; fenetreJours: number; comportementQuota: 'continuer' | 'attente';
  plafondTechniqueMicroCentimes: number; finContrat: ParametresFinContrat; longueurMaxMotif: number;
} = {
  seuilsBps: [7000, 10000], // valeur fictive tirée de la spec 07, à lire dans la console
  fenetreJours: 7, // valeur fictive tirée de la spec 07, à lire dans la console
  comportementQuota: 'continuer', // valeur fictive tirée de la spec 07, à lire dans la console
  plafondTechniqueMicroCentimes: 5000000, // valeur fictive tirée de la spec 07, à lire dans la console
  finContrat: { joursAvantEffacement: 30, joursRappelAvantEffacement: 7, joursRelancesSansAccuse: [3, 7] }, // valeur fictive tirée de la spec 07, à lire dans la console
  longueurMaxMotif: 200, // valeur fictive tirée de la spec 07, à lire dans la console
};

export const VALEURS_SCENARIO = {
  acces: ['actif', 'essai', 'delai_de_grace', 'lecture_seule', 'suspendu', 'resilie'],
  volume: ['normal', 'seuil', 'depasse'],
  finContrat: ['aucune', 'preavis', 'remis', 'accuse', 'gele'],
  cgv: ['acceptees', 'a_accepter'],
  reprise: ['non', 'oui'],
} as const;

export type ScenarioAbonnement = {
  acces: (typeof VALEURS_SCENARIO.acces)[number]; volume: (typeof VALEURS_SCENARIO.volume)[number];
  finContrat: (typeof VALEURS_SCENARIO.finContrat)[number]; cgv: (typeof VALEURS_SCENARIO.cgv)[number];
  reprise: (typeof VALEURS_SCENARIO.reprise)[number];
};

export const SCENARIO_PAR_DEFAUT: ScenarioAbonnement = { acces: 'actif', volume: 'normal', finContrat: 'aucune', cgv: 'acceptees', reprise: 'non' };

// En-tête x-scenario-abonnement : jamais d'exception, toute forme inconnue rend le scénario par défaut.
export function lireScenario(texte: string | null): ScenarioAbonnement {
  if (texte === null || texte === '') return SCENARIO_PAR_DEFAUT;
  const lu: Record<string, string> = {};
  for (const part of texte.split(';')) {
    const [cle, valeur, ...reste] = part.split('=');
    const permises: readonly string[] | undefined = Object.hasOwn(VALEURS_SCENARIO, cle ?? '')
      ? VALEURS_SCENARIO[cle as keyof typeof VALEURS_SCENARIO]
      : undefined;
    if (cle === undefined || valeur === undefined || reste.length > 0 || permises === undefined) return SCENARIO_PAR_DEFAUT;
    if (!permises.includes(valeur) || Object.hasOwn(lu, cle)) return SCENARIO_PAR_DEFAUT;
    lu[cle] = valeur;
  }
  return { ...SCENARIO_PAR_DEFAUT, ...lu } as ScenarioAbonnement;
}

export type DonneesScenario = {
  etatVoulu: EtatVoulu; palierActuel: string; piecesParJour: Map<string, number>; utilise: number;
  finContrat: FinContrat; documents: DocumentContractuel[]; acceptations: Acceptation[]; fileReprise: PieceEnAttente[];
};

const COMPRIS = PALIERS_FICTIFS[0]?.piecesParMois ?? 1;
const [JOURS_EXEMPLE_ESSAI, JOURS_EXEMPLE_FIN, NB_PIECES_REPRISE] = [14, 30, 20];

function utiliseDuVolume(volume: ScenarioAbonnement['volume']): number {
  const premier = PARAMETRES_ABONNEMENT_FICTIFS.seuilsBps[0] ?? BASE_BPS;
  if (volume === 'seuil') return Math.floor((COMPRIS * premier) / BASE_BPS);
  return volume === 'depasse' ? COMPRIS + 1 : Math.floor(COMPRIS / 5);
}

function etatVouluDe(acces: ScenarioAbonnement['acces'], auj: string): EtatVoulu {
  const base: EtatVoulu = { etat: 'actif', version: 1, arretEnvois: false };
  switch (acces) {
    case 'essai': return { ...base, periodeEssaiFin: ajouterJours(auj, JOURS_EXEMPLE_ESSAI) };
    case 'delai_de_grace': return { ...base, impayeSignale: true };
    case 'lecture_seule': return { ...base, etat: 'pause' };
    case 'suspendu': return { ...base, etat: 'arrete', arretEnvois: true, dateFin: ajouterJours(auj, JOURS_EXEMPLE_FIN) };
    case 'resilie': return { ...base, etat: 'arrete', arretEnvois: true, dateFin: ajouterJours(auj, -1) };
    default: return base;
  }
}

function finContratDe(mode: ScenarioAbonnement['finContrat'], auj: string): FinContrat {
  const fin: FinContrat = {
    dateFin: null, remisLe: null, manifesteEmpreinte: null, accuseLe: null, accusePar: null,
    gelModule: { actif: false, motif: null, posePar: null, poseLe: null }, gelConsole: false,
  };
  if (mode === 'aucune') return fin;
  const avecDate = { ...fin, dateFin: ajouterJours(auj, JOURS_EXEMPLE_FIN) };
  if (mode === 'preavis') return avecDate;
  const remis = { ...avecDate, remisLe: auj + 'T09:00:00Z', manifesteEmpreinte: 'ab12'.repeat(16) };
  if (mode === 'remis') return remis;
  const accuse = { ...remis, accuseLe: auj + 'T10:00:00Z', accusePar: PERSONNE };
  if (mode === 'accuse') return accuse;
  return { ...accuse, gelModule: { actif: true, motif: 'Litige fictif', posePar: 'client', poseLe: auj + 'T11:00:00Z' } };
}

function historique(utilise: number, auj: string): Map<string, number> {
  const alea = creerAlea(GRAINE);
  const premier = auj.slice(0, 8) + '01';
  const nb = ecartJours(premier, auj) + 1;
  const jours = Array.from({ length: nb }, (_, i) => ajouterJours(premier, i));
  const m = new Map(jours.map((j) => [j, 0] as [string, number]));
  for (let i = 0; i < utilise; i += 1) {
    const j = jours[Math.floor(alea() * nb)] as string;
    m.set(j, (m.get(j) ?? 0) + 1);
  }
  return m;
}

function documentsDe(cgv: ScenarioAbonnement['cgv'], auj: string): { documents: DocumentContractuel[]; acceptations: Acceptation[] } {
  const doc = (version: number, jours: number): DocumentContractuel => ({
    type: 'cgv', version, approuveLe: ajouterJours(auj, jours), empreinte: (version === 1 ? 'c1' : 'c2').repeat(32), sources: ['source-fictive'],
  });
  const acceptation: Acceptation = { personne: PERSONNE, organisation: CLIENT, type: 'cgv', version: 1, accepteLe: ajouterJours(auj, -300) + 'T08:00:00Z' };
  const v1 = doc(1, -400);
  if (cgv === 'acceptees') return { documents: [v1], acceptations: [acceptation] };
  return { documents: [v1, doc(2, -10)], acceptations: [acceptation] };
}

function fileDeReprise(auj: string): PieceEnAttente[] {
  const alea = creerAlea(GRAINE);
  return Array.from({ length: NB_PIECES_REPRISE }, (_, i) => ({
    id: 'piece-fictive-' + String(i + 1).padStart(3, '0'),
    societe: SOCIETES_FICTIVES_ABONNEMENT[i % SOCIETES_FICTIVES_ABONNEMENT.length] as string,
    empreinte: Array.from({ length: 64 }, () => HEX[Math.floor(alea() * HEX.length)]).join(''),
    recueLe: auj + 'T08:' + String(i).padStart(2, '0') + ':00Z',
  }));
}

export function donneesDuScenario(scenario: ScenarioAbonnement, aujourdhui: string): DonneesScenario {
  const utilise = utiliseDuVolume(scenario.volume);
  return {
    etatVoulu: etatVouluDe(scenario.acces, aujourdhui),
    palierActuel: PALIERS_FICTIFS[0]?.code ?? '',
    piecesParJour: historique(utilise, aujourdhui),
    utilise,
    finContrat: finContratDe(scenario.finContrat, aujourdhui),
    ...documentsDe(scenario.cgv, aujourdhui),
    fileReprise: scenario.reprise === 'oui' ? fileDeReprise(aujourdhui) : [],
  };
}
