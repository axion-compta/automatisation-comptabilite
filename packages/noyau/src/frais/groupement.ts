// Écriture groupée par personne et par mois : lignes additionnées par (compte, sens), pièces conservées.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { ErreurFrais } from './types.js';

export interface EcritureDeFrais {
  fraisId: string;
  pieceId?: string;
  personneId: string;
  ecriture: Ecriture;
}

export interface EnteteGroupe {
  id: string;
  journal: string;
  date: string;
}

export interface Groupe {
  ecriture: Ecriture;
  fraisIds: string[];
  pieceIds: string[];
}

const LONGUEUR_MOIS = 7;

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function controler(entrees: readonly EcritureDeFrais[]): void {
  const premiere = entrees[0];
  if (premiere === undefined) throw invalide('Aucune écriture à grouper.');
  const mois = premiere.ecriture.date.slice(0, LONGUEUR_MOIS);
  for (const e of entrees) {
    if (e.personneId !== premiere.personneId) throw invalide('Une seule personne par groupe.');
    if (e.ecriture.date.slice(0, LONGUEUR_MOIS) !== mois) throw invalide('Un seul mois par groupe.');
    if (e.ecriture.statut !== 'propose') throw invalide('Seules des écritures proposées sont groupées.');
  }
}

interface Cumul {
  compte: string;
  debit: boolean;
  montant: Centimes;
  libelle: string;
  auxiliaires: Set<string | undefined>;
}

function cumuler(entrees: readonly EcritureDeFrais[]): Cumul[] {
  const cumuls = new Map<string, Cumul>();
  for (const l of entrees.flatMap((e) => e.ecriture.lignes)) {
    const debit = l.debit !== 0;
    const cle = (debit ? 'D' : 'C') + l.compte;
    const montant = debit ? l.debit : l.credit;
    const existant = cumuls.get(cle);
    if (existant === undefined) {
      cumuls.set(cle, { compte: l.compte, debit, montant, libelle: l.libelle, auxiliaires: new Set([l.auxiliaire]) });
    } else {
      existant.montant = ajouter(existant.montant, montant);
      existant.auxiliaires.add(l.auxiliaire);
      if (comparer(l.libelle, existant.libelle) < 0) existant.libelle = l.libelle;
    }
  }
  return [...cumuls.values()];
}

function enLigne(k: Cumul): LigneEcriture {
  const zero = centimes(0);
  const [aux] = k.auxiliaires.size === 1 ? k.auxiliaires : [undefined];
  const base = { compte: k.compte, libelle: k.libelle, debit: k.debit ? k.montant : zero, credit: k.debit ? zero : k.montant };
  return aux === undefined ? base : { ...base, auxiliaire: aux };
}

/** Débits puis crédits, par numéro de compte : l'ordre d'entrée n'a aucun effet. */
export function grouperParMois(entrees: readonly EcritureDeFrais[], entete: EnteteGroupe): Groupe {
  controler(entrees);
  const lignes = cumuler(entrees)
    .sort((a, b) => Number(b.debit) - Number(a.debit) || comparer(a.compte, b.compte))
    .map(enLigne);
  const ecriture: Ecriture = { id: entete.id, journal: entete.journal, date: entete.date, statut: 'propose', lignes };
  verifierEcriture(ecriture);
  return {
    ecriture,
    fraisIds: entrees.map((e) => e.fraisId).sort(comparer),
    pieceIds: [...new Set(entrees.flatMap((e) => (e.pieceId === undefined ? [] : [e.pieceId])))].sort(comparer),
  };
}
