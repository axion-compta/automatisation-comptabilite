// Jeu comptable fictif à graine fixe (V3-DEM-004). Aucune donnée réelle (V3-PRI-017).
import { creerAlea, GRAINE } from './generateur.js';

export interface ExerciceCompta {
  id: string;
  libelle: string;
  debut: string;
  fin: string;
  statut: 'ouvert' | 'cloture';
}

export interface CompteCompta {
  numero: string;
  libelle: string;
  classe: number;
}

export interface TiersCompta {
  code: string;
  nom: string;
  type: 'client' | 'fournisseur';
  email: string;
}

export interface LigneCompta {
  compte: string;
  auxiliaire?: string;
  libelle: string;
  debitCentimes: number;
  creditCentimes: number;
}

export interface EcritureCompta {
  id: string;
  journal: string;
  date: string;
  statut: 'validee' | 'brouillon';
  lignes: LigneCompta[];
}

export interface SocieteCompta {
  profil: 'pleine' | 'vide';
  exercices: ExerciceCompta[];
  plan: CompteCompta[];
  tiers: TiersCompta[];
  ecritures: EcritureCompta[];
}

export interface JeuCompta {
  version: 1;
  societes: SocieteCompta[];
}

const NOMS = ['Lemoine Rénovation', 'Immobilière Marceau', 'Boulangerie Rivoire', 'Garage Fontaine', 'Atelier Bertin'];

const COMPTES: Array<[string, string]> = [
  ['101000', 'Capital'],
  ['106000', 'Réserves'],
  ['120000', 'Résultat de l’exercice'],
  ['164000', 'Emprunts'],
  ['205000', 'Logiciels'],
  ['218000', 'Matériel'],
  ['281800', 'Amortissements du matériel'],
  ['310000', 'Marchandises'],
  ['401000', 'Fournisseurs'],
  ['411000', 'Clients'],
  ['421000', 'Personnel'],
  ['445660', 'TVA déductible'],
  ['445710', 'TVA collectée'],
  ['512000', 'Banque'],
  ['530000', 'Caisse'],
  ['601000', 'Achats de matières'],
  ['606000', 'Achats non stockés'],
  ['613000', 'Locations'],
  ['622000', 'Honoraires'],
  ['626000', 'Frais postaux'],
  ['641000', 'Rémunérations'],
  ['661000', 'Charges d’intérêts'],
  ['701000', 'Ventes de produits'],
  ['706000', 'Prestations de services'],
  ['761000', 'Produits financiers'],
];

const JOURNAUX = ['VE', 'AC', 'BQ', 'OD'];
const NB_VALIDEES = 40;
const NB_BROUILLONS = 3;

function pad(n: number, largeur: number): string {
  return String(n).padStart(largeur, '0');
}

function exercices(profil: 'pleine' | 'vide'): ExerciceCompta[] {
  const ouvert: ExerciceCompta = { id: 'EX2026', libelle: 'Exercice 2026', debut: '2026-01-01', fin: '2026-12-31', statut: 'ouvert' };
  if (profil === 'vide') return [ouvert];
  return [{ id: 'EX2025', libelle: 'Exercice 2025', debut: '2025-01-01', fin: '2025-12-31', statut: 'cloture' }, ouvert];
}

function societePleine(graine: number): SocieteCompta {
  const alea = creerAlea(graine);
  const entier = (max: number): number => Math.floor(alea() * max);
  const plan = COMPTES.map(([numero, libelle]) => ({ numero, libelle, classe: Number(numero[0]) }));
  const tiers: TiersCompta[] = [];
  for (let i = 1; i <= 6; i++) {
    tiers.push({ code: `CLI${pad(i, 3)}`, nom: NOMS[(i - 1) % NOMS.length] as string, type: 'client', email: `client${i}@exemple.fr` });
  }
  for (let i = 1; i <= 6; i++) {
    tiers.push({ code: `FOU${pad(i, 3)}`, nom: NOMS[(i + 1) % NOMS.length] as string, type: 'fournisseur', email: `fournisseur${i}@exemple.fr` });
  }
  const ecritures: EcritureCompta[] = [];
  for (let i = 0; i < NB_VALIDEES + NB_BROUILLONS; i++) {
    const journal = JOURNAUX[i % JOURNAUX.length] as string;
    const annee = i % 2 === 0 ? 2025 : 2026;
    const date = `${annee}-${pad(1 + entier(12), 2)}-${pad(1 + entier(28), 2)}`;
    const montant = (1 + entier(500000)) * 100 + entier(100);
    const client = `CLI${pad(1 + entier(6), 3)}`;
    const fournisseur = `FOU${pad(1 + entier(6), 3)}`;
    let lignes: LigneCompta[];
    if (journal === 'VE') {
      lignes = [
        { compte: '411000', auxiliaire: client, libelle: 'Facture client', debitCentimes: montant, creditCentimes: 0 },
        { compte: '706000', libelle: 'Prestation', debitCentimes: 0, creditCentimes: montant },
      ];
    } else if (journal === 'AC') {
      lignes = [
        { compte: '606000', libelle: 'Achat', debitCentimes: montant, creditCentimes: 0 },
        { compte: '401000', auxiliaire: fournisseur, libelle: 'Facture fournisseur', debitCentimes: 0, creditCentimes: montant },
      ];
    } else if (journal === 'BQ') {
      lignes = [
        { compte: '512000', libelle: 'Règlement', debitCentimes: montant, creditCentimes: 0 },
        { compte: '411000', auxiliaire: client, libelle: 'Encaissement client', debitCentimes: 0, creditCentimes: montant },
      ];
    } else {
      lignes = [
        { compte: '613000', libelle: 'Régularisation', debitCentimes: montant, creditCentimes: 0 },
        { compte: '530000', libelle: 'Régularisation', debitCentimes: 0, creditCentimes: montant },
      ];
    }
    ecritures.push({ id: `ECR${pad(i + 1, 3)}`, journal, date, statut: i < NB_VALIDEES ? 'validee' : 'brouillon', lignes });
  }
  return { profil: 'pleine', exercices: exercices('pleine'), plan, tiers, ecritures };
}

export function genererCompta(graine: number = GRAINE): JeuCompta {
  return {
    version: 1,
    societes: [societePleine(graine), { profil: 'vide', exercices: exercices('vide'), plan: [], tiers: [], ecritures: [] }],
  };
}

function trier(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trier);
  if (valeur !== null && typeof valeur === 'object') {
    const source = valeur as Record<string, unknown>;
    const sortie: Record<string, unknown> = {};
    for (const cle of Object.keys(source).sort()) sortie[cle] = trier(source[cle]);
    return sortie;
  }
  return valeur;
}

// JSON stable : clés triées, deux espaces, fin de ligne.
export function serialiserCompta(jeu: JeuCompta): string {
  return `${JSON.stringify(trier(jeu), null, 2)}\n`;
}
