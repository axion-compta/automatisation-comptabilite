// Jeu fictif des frais à graine fixe (V3-MOT-061). Aucune donnée réelle ; barème inventé, sans lien avec un barème réel.
import { creerAlea, GRAINE } from './generateur.js';

export interface PersonneFrais { id: string; nom: string; email: string; role: 'associee' | 'dirigeant' }
export interface VehiculeFrais {
  id: string;
  personneId: string;
  immatriculation: string;
  puissanceCv: number;
  energie: 'thermique' | 'hybride' | 'hydrogene' | 'electrique';
  proprietaire: 'personne' | 'conjoint' | 'societe' | 'location';
  categorie: 'voiture' | 'deux_roues';
}
export interface FraisFictif {
  id: string;
  personneId: string;
  nature: 'depense' | 'trajet';
  categorieDepense?: string | undefined;
  dateDepense: string;
  libelle: string;
  montantTtc: number;
  tva: number;
  pieceId?: string | undefined;
  payeur: 'societe' | 'personne' | 'a_confirmer';
  sourcePayeur?: 'banque' | 'declaration' | 'ia';
  ligneBanqueId?: string;
  statut: string;
  justificatifPerdu: boolean;
  motifSansJustificatif?: string;
  partPersoTtc: number;
  destination?: 'remboursement' | 'compte_courant';
  version: number;
}
export interface TrajetFictif {
  fraisId: string;
  vehiculeId: string;
  depart: string;
  arrivee: string;
  motif: string;
  kmSaisisDixiemes: number;
  allerRetour: boolean;
}
export interface LigneBanqueFictive { id: string; carteId: string; date: string; libelle: string; montantCentimes: number }
export interface CarteSocieteFictive { id: string; libelle: string }
export interface ParametreFictif {
  cle: string;
  pays: string;
  valeur: string;
  effet_debut: string;
  effet_fin: string | null;
  statut: 'valide' | 'a_verifier';
  source: string;
  date_releve: string;
}
export interface JeuFrais {
  version: 1;
  personnes: PersonneFrais[];
  vehicules: VehiculeFrais[];
  frais: FraisFictif[];
  trajets: TrajetFictif[];
  lignesBanque: LigneBanqueFictive[];
  cartesSociete: CarteSocieteFictive[];
  parametres: ParametreFictif[];
}

const SOURCE = 'barème fictif de test';
// Barème inventé : deux puissances, trois tranches chacune ; dernière borne nulle = sans limite.
const BAREME = JSON.stringify({
  puissances: [
    { cv: 4, tranches: [{ jusqua_km: 4000, taux: '0,500', fixe: '0' }, { jusqua_km: 16000, taux: '0,300', fixe: '800' }, { jusqua_km: null, taux: '0,360', fixe: '0' }] },
    { cv: 6, tranches: [{ jusqua_km: 4000, taux: '0,617', fixe: '0' }, { jusqua_km: 16000, taux: '0,375', fixe: '988' }, { jusqua_km: null, taux: '0,430', fixe: '0' }] },
  ],
});

export function genererFrais(graine: number = GRAINE): JeuFrais {
  if (!Number.isSafeInteger(graine)) throw new RangeError('La graine doit être un entier.');
  const alea = creerAlea(graine);
  const entier = (min: number, max: number): number => min + Math.floor(alea() * (max - min + 1));
  const personnes: PersonneFrais[] = [
    { id: 'PER-01', nom: 'Camille Vasseur', email: 'camille.vasseur@exemple.fr', role: 'associee' },
    { id: 'PER-02', nom: 'Gaspard Lenormand', email: 'gaspard.lenormand@exemple.fr', role: 'dirigeant' },
  ];
  const veh = (n: number, e: VehiculeFrais['energie'], p: VehiculeFrais['proprietaire'], cv: number): VehiculeFrais => ({
    id: `VEH-0${n}`, personneId: 'PER-01', immatriculation: `XX-00${n - 1}-XX`, puissanceCv: cv, energie: e, proprietaire: p, categorie: 'voiture',
  });
  const vehicules = [veh(1, 'thermique', 'personne', 4), veh(2, 'electrique', 'personne', 6), veh(3, 'hybride', 'societe', 6), veh(4, 'thermique', 'location', 4)];
  const f = (n: number, ttc: number, o: Partial<FraisFictif>): FraisFictif => ({
    id: `FRA-${String(n).padStart(3, '0')}`, personneId: 'PER-01', nature: 'depense', categorieDepense: 'repas_affaires', dateDepense: '2025-03-12',
    libelle: `Dépense fictive ${n}`, montantTtc: ttc, tva: Math.floor(ttc / 6), pieceId: `PIE-${String(n).padStart(3, '0')}`, payeur: 'personne',
    statut: 'brouillon', justificatifPerdu: false, partPersoTtc: 0, version: 1, ...o,
  });
  const tr = (n: number, date: string, statut: string, ttc: number): FraisFictif =>
    f(n, ttc, { nature: 'trajet', categorieDepense: undefined, dateDepense: date, statut, pieceId: undefined, tva: 0, libelle: `Trajet fictif ${n}` });
  const frais: FraisFictif[] = [
    f(1, 6400, { categorieDepense: 'carburant', payeur: 'societe', sourcePayeur: 'banque', ligneBanqueId: 'LIB-001', statut: 'exclu_paye_societe' }),
    f(2, 4500, { pieceId: undefined, sourcePayeur: 'declaration', justificatifPerdu: true, statut: 'a_completer' }),
    f(3, 1260, { categorieDepense: 'parking', sourcePayeur: 'declaration', statut: 'valide' }),
    f(4, 2000 + entier(0, 999), {}),
    f(5, 3000 + entier(0, 999), { statut: 'propose' }),
    f(6, 4000 + entier(0, 999), { statut: 'rembourse', destination: 'remboursement' }),
    f(7, 5000 + entier(0, 999), { statut: 'en_compte_courant', destination: 'compte_courant' }),
    f(8, 1260, { pieceId: 'PIE-003', statut: 'refuse' }),
    f(9, 2500 + entier(0, 999), { statut: 'perso' }),
    f(10, 3500 + entier(0, 999), { payeur: 'a_confirmer', sourcePayeur: 'ia', statut: 'a_completer' }),
    f(11, 1800 + entier(0, 999), { pieceId: undefined, justificatifPerdu: true, motifSansJustificatif: 'Ticket perdu, paiement confirmé par le restaurateur fictif.', statut: 'valide' }),
    f(12, 6000 + entier(0, 999), { partPersoTtc: 1500, statut: 'propose' }),
    tr(13, '2025-04-08', 'valide', 0),
    tr(14, '2026-02-10', 'propose', 0),
    tr(15, '2025-05-20', 'a_completer', 0),
    tr(16, '2025-06-03', 'brouillon', 0),
  ];
  const lieux = ['Atelier Bertin', 'Garage Fontaine', 'Boulangerie Rivoire', 'Immobilière Marceau'];
  const trajets: TrajetFictif[] = [13, 14, 15, 16].map((n, i) => ({
    fraisId: `FRA-0${n}`, vehiculeId: `VEH-0${i + 1}`, depart: 'Siège fictif', arrivee: lieux[i] as string, motif: 'Rendez-vous client fictif',
    kmSaisisDixiemes: entier(50, 4000), allerRetour: i % 2 === 0,
  }));
  const param = (cle: string, valeur: string, annee: number, statut: ParametreFictif['statut']): ParametreFictif => ({
    cle, pays: 'FR', valeur, effet_debut: `${annee}-01-01`, effet_fin: `${annee + 1}-01-01`, statut, source: SOURCE, date_releve: `${annee}-01-02`,
  });
  return {
    version: 1,
    personnes,
    vehicules,
    frais,
    trajets,
    lignesBanque: [{ id: 'LIB-001', carteId: 'CAR-01', date: '2025-03-12', libelle: 'Station Fontaine fictive', montantCentimes: -6400 }],
    cartesSociete: [{ id: 'CAR-01', libelle: 'Carte société fictive' }],
    parametres: [
      param('bareme_ik_voiture', BAREME, 2025, 'valide'),
      param('bareme_ik_voiture', BAREME, 2026, 'a_verifier'),
      param('bareme_ik_majoration_electrique', '10', 2025, 'valide'),
      param('bareme_ik_majoration_electrique', '10', 2026, 'a_verifier'),
    ],
  };
}

function trier(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trier);
  if (valeur !== null && typeof valeur === 'object') {
    const source = valeur as Record<string, unknown>;
    const sortie: Record<string, unknown> = {};
    for (const cle of Object.keys(source).sort()) if (source[cle] !== undefined) sortie[cle] = trier(source[cle]);
    return sortie;
  }
  return valeur;
}
// JSON stable : clés triées, deux espaces, fin de ligne.
export function serialiserFrais(jeu: JeuFrais): string {
  return `${JSON.stringify(trier(jeu), null, 2)}\n`;
}
