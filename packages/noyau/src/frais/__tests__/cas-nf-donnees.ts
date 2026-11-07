// Banc NF-01 à NF-20. Valeurs INVENTÉES (rien de réel), montants attendus calculés à la main, en centimes.
// Cas de la spec → valeurs transposées → attendu :
// NF-01 repas 66,00 TTC (60,00 HT + 6,00 TVA), part déductible pleine → E1 : D 6000 + D 600 / C 6600
// NF-02 à NF-06 payeur : ligne de banque / carte connue sans relevé / déclaration avec relevé / conflit (cas M) / relevé manquant
// NF-07 à NF-09 IK : 100 km à 0,400 = 40,00 ; électrique +10 % = 44,00 ; à cheval sur la borne (50 km + 50 km) = 32,50
// NF-10 annuel continu à la borne : 1 612,50, écart 0 · NF-11 saut à la seconde borne : 5 100,00 − 4 900,00 = +200,00
// NF-12 barème à vérifier : aucun montant · NF-13 véhicule de la société refusé · NF-14 justificatif perdu : TTC 48,00 en charge
// NF-15 110,00 TTC dont 55,00 perso → D 50,00 + D 5,00 + D 55,00 / C 110,00 · NF-16 remboursement 98,60 · NF-17 compte courant associé
// NF-18 même pièce deux fois refusée · NF-19 totaux 12,60 / 45,00 / 64,00 · NF-20 ticket au nom de la personne : TVA 0 déduite
import { centimes, type Centimes } from '../../argent/index.js';
import { ligneDePuissance, lireBaremeIk } from '../bareme-ik.js';
import type { LigneBanqueSociete } from '../correspondance-banque.js';
import type { Personne } from '../remboursement.js';
import type { ParametreTva } from '../tva-frais.js';
import { ErreurFrais, type ComptesFrais, type Frais, type Trajet, type Vehicule } from '../types.js';

export const c = (n: number): Centimes => centimes(n);
export const code = (f: () => unknown): string => {
  try { f(); } catch (e) { if (e instanceof ErreurFrais) return e.code; throw e; }
  return 'aucune';
};
export const COMPTES: ComptesFrais = { chargeParNature: { repas_affaires: '625100' }, chargeIk: '625800', tvaDeductible: '445660', comptePersonne: '455100', banque: '512000' };
export const ENTETE = { id: 'e-1', journal: 'ACH', date: '2026-03-10' };
export const PART_PLEINE = 10000;
export const PARAM_TVA: ParametreTva = { statut: 'valide', partPointsDeBase: PART_PLEINE };
export const MAJORATION = 10;
const tr = (jusqua: number | null, taux: string, fixe: string): object => ({ jusqua_km: jusqua, taux, fixe });
export const LIGNE = ligneDePuissance(lireBaremeIk(JSON.stringify({ puissances: [{ cv: 4, tranches: [tr(4000, '0,400', '0'), tr(16000, '0,250', '600'), tr(null, '0,300', '0')] }] })), 4);
export const BAREME = { puissances: [LIGNE] };
export const frais = (extra: Partial<Frais> = {}): Frais => ({
  id: 'f-1', personneId: 'per-1', nature: 'depense', categorieDepense: 'repas_affaires', dateDepense: '2026-03-10', libelle: 'Repas client fictif',
  montantTtc: c(6600), tva: c(600), pieceId: 'pc-1', payeur: 'personne', statut: 'valide', justificatifPerdu: false, partPersoTtc: c(0), version: 1, ...extra,
});
export const personne = (qualite: Personne['qualite']): Personne => ({ id: 'per-1', qualite });
export const LIGNES_BANQUE: LigneBanqueSociete[] = [{ id: 'lb-1', date: '2026-03-10', montant: c(6400), sens: 'debit', libelle: 'RESTAURANT EXEMPLE', compte: '512000' }];
export const VEHICULE: Vehicule = { id: 'v-1', personneId: 'per-1', puissanceCv: 4, energie: 'thermique', proprietaire: 'personne', categorie: 'voiture', carteGrisePieceId: 'cg-1' };
export const TRAJET: Trajet = { fraisId: 'f-t1', vehiculeId: 'v-1', depart: 'Ville A', arrivee: 'Ville B', motif: 'visite client fictive', kmSaisisDixiemes: 500, allerRetour: true };
export const trajetAnnee = (fraisId: string, date: string, km: number) => ({ fraisId, personneId: 'per-1', vehiculeId: 'v-1', date, kmRetenusDixiemes: km * 10, electrique: false, puissanceCv: 4 });
