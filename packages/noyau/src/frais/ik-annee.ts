// IK d'une année : calcul de tous les trajets, par personne et véhicule, ordre date puis identifiant.
// Barème non validé : aucun montant (null), seulement les kilomètres.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { ligneDePuissance, type BaremeIk } from './bareme-ik.js';
import { montantProvisoire } from './ik-provisoire.js';
import { ErreurFrais } from './types.js';

export interface TrajetAnnee {
  fraisId: string;
  personneId: string;
  vehiculeId: string;
  date: string;
  kmRetenusDixiemes: number;
  electrique: boolean;
  puissanceCv: number;
}

export interface BaremeAnnee {
  statut: string;
  bareme?: BaremeIk;
  majorationPourcent?: number;
}

export interface CumulIk {
  personneId: string;
  vehiculeId: string;
  kmDixiemes: number;
  sommeProvisoires: Centimes;
}

export interface ResultatAnnee {
  montants: Map<string, Centimes | null>;
  cumuls: CumulIk[];
}

const STATUT_VALIDE = 'valide';
const LONGUEUR_ANNEE = 4;

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function controler(trajets: readonly TrajetAnnee[]): void {
  const ids = new Set<string>();
  const annees = new Set<string>();
  for (const t of trajets) {
    if (ids.has(t.fraisId)) throw invalide('Identifiant de frais en double.');
    ids.add(t.fraisId);
    annees.add(t.date.slice(0, LONGUEUR_ANNEE));
  }
  if (annees.size > 1) throw invalide('Trajets de plusieurs années civiles.');
}

export function calculerAnnee(trajets: readonly TrajetAnnee[], bareme: BaremeAnnee): ResultatAnnee {
  controler(trajets);
  const valide = bareme.statut === STATUT_VALIDE;
  if (valide && (!bareme.bareme || bareme.majorationPourcent === undefined)) throw invalide('Barème validé sans valeurs.');
  const ordre = [...trajets].sort((a, b) => comparer(a.date, b.date) || comparer(a.fraisId, b.fraisId));
  const montants = new Map<string, Centimes | null>();
  const cumuls = new Map<string, CumulIk>();
  for (const t of ordre) {
    if (!Number.isSafeInteger(t.kmRetenusDixiemes) || t.kmRetenusDixiemes <= 0) throw invalide('Kilomètres : entier strictement positif.');
    const cle = JSON.stringify([t.personneId, t.vehiculeId]);
    const cumul = cumuls.get(cle) ?? { personneId: t.personneId, vehiculeId: t.vehiculeId, kmDixiemes: 0, sommeProvisoires: centimes(0) };
    let montant: Centimes | null = null;
    if (valide && bareme.bareme && bareme.majorationPourcent !== undefined) {
      montant = montantProvisoire({
        kmRetenusDixiemes: t.kmRetenusDixiemes,
        cumulAvantDixiemes: cumul.kmDixiemes,
        ligne: ligneDePuissance(bareme.bareme, t.puissanceCv),
        majorationPourcent: bareme.majorationPourcent,
        electrique: t.electrique,
      }).montant;
      cumul.sommeProvisoires = ajouter(cumul.sommeProvisoires, montant);
    }
    cumul.kmDixiemes += t.kmRetenusDixiemes;
    cumuls.set(cle, cumul);
    montants.set(t.fraisId, montant);
  }
  return { montants, cumuls: [...cumuls.values()] };
}
