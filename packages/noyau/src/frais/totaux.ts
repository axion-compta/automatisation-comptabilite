// Trois totaux de frais toujours séparés : à rembourser, en attente, exclus (jamais additionnés).
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import { ErreurFrais, type Frais } from './types.js';

export interface TotauxFrais {
  aRembourser: Centimes;
  enAttente: Centimes;
  exclus: Centimes;
  /** Kilomètres (dixièmes) des trajets dont le montant n'est pas connu : jamais convertis en euros. */
  kmSansMontant: number;
}

type Categorie = 'aRembourser' | 'enAttente' | 'exclus';

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function entier(valeur: number, nom: string): number {
  if (!Number.isSafeInteger(valeur) || valeur < 0) throw invalide(nom + ' invalide : entier positif ou nul attendu.');
  return valeur;
}

function categorie(f: Frais): Categorie | null {
  if (f.payeur === 'a_confirmer') return null;
  if (f.statut === 'exclu_paye_societe' || f.statut === 'perso' || f.statut === 'refuse') return 'exclus';
  if (f.payeur !== 'personne') return null;
  if (f.statut === 'valide') return f.remboursementId === undefined && f.destination !== 'compte_courant' ? 'aRembourser' : null;
  if (f.statut === 'a_completer' || f.statut === 'propose') return 'enAttente';
  return null;
}

export function calculerTotaux(
  frais: readonly Frais[],
  montantsTrajets: ReadonlyMap<string, Centimes | null>,
  kmTrajets: ReadonlyMap<string, number>,
): TotauxFrais {
  const t = { aRembourser: centimes(0), enAttente: centimes(0), exclus: centimes(0) };
  let km = 0;
  for (const f of frais) {
    const cat = categorie(f);
    if (cat === null) continue;
    if (f.nature === 'trajet') {
      const m = montantsTrajets.get(f.id);
      if (m === undefined) throw invalide('Montant du trajet absent : ' + f.id);
      if (m === null) {
        km += entier(kmTrajets.get(f.id) ?? Number.NaN, 'Kilomètres');
        continue;
      }
      t[cat] = ajouter(t[cat], centimes(entier(m, 'Montant')));
      continue;
    }
    const brut = entier(f.montantTtc, 'Montant');
    const net = soustraire(centimes(brut), centimes(entier(f.partPersoTtc, 'Part personnelle')));
    if (net < 0) throw invalide('Part personnelle supérieure au montant : ' + f.id);
    t[cat] = ajouter(t[cat], net);
  }
  return { ...t, kmSansMontant: km };
}
