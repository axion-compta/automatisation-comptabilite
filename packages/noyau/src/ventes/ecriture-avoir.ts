// Ventes : écriture d'un avoir (cas A et B), inverse au prorata de la facture. Montants d'entrée positifs.
import { ajouter, centimes, repartir, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { lignesDeTva, type GroupeTva } from './ecriture-facture.js';
import { ErreurVente, exigerDate, type Anomalie, type ComptesVente, type LigneTvaVente, type LigneVente, type PieceVente } from './types.js';

export interface EntreeEcritureAvoir {
  id: string;
  journal: string;
  avoir: PieceVente;
  lignes: readonly LigneVente[];
  casParTaux: Record<number, 'A' | 'B'>;
  tvaEnAttenteParTaux: Record<number, Centimes>;
  resteDuFacture: Centimes | null;
  comptes: ComptesVente;
  auxiliaire?: string;
}
export interface ResultatEcritureAvoir {
  ecriture: Ecriture;
  lignesTva: LigneTvaVente[];
  cartes: Anomalie[];
}

const zero = centimes(0);
const positif = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;
const exigerMontant = (v: number): Centimes => {
  if (!positif(v)) throw new ErreurVente('montant_invalide', 'Montant invalide.');
  return v as Centimes;
};
const tri = <T extends string | number>(a: T, b: T): number => (a === b ? 0 : a < b ? -1 : 1);

function valider(e: EntreeEcritureAvoir): void {
  if (e.lignes.length === 0) throw new ErreurVente('aucune_ligne', 'Aucune ligne à écrire.');
  exigerDate(e.avoir.dateFacture, 'dateFacture');
  exigerMontant(e.avoir.ttcCentimes);
  if (e.resteDuFacture !== null) exigerMontant(e.resteDuFacture);
  for (const l of e.lignes) {
    exigerMontant(l.htCentimes);
    exigerMontant(l.tvaLueCentimes);
    if (l.tauxPdb === null ? l.tvaLueCentimes !== 0 : !positif(l.tauxPdb)) throw new ErreurVente('taux_invalide', 'Taux lu invalide.');
    if (l.compteProduit === undefined || l.compteProduit === '') throw new ErreurVente('compte_produit_manquant', 'Compte de produit absent : une personne le choisit.');
  }
}

export function ecritureAvoir(entree: EntreeEcritureAvoir): ResultatEcritureAvoir {
  valider(entree);
  const { avoir, comptes } = entree;
  const produits = new Map<string, Centimes>();
  const parTaux = new Map<number, { base: Centimes; tva: Centimes }>();
  for (const l of entree.lignes) {
    produits.set(l.compteProduit as string, ajouter(produits.get(l.compteProduit as string) ?? zero, l.htCentimes));
    if (l.tauxPdb === null) continue;
    const t = parTaux.get(l.tauxPdb) ?? { base: zero, tva: zero };
    parTaux.set(l.tauxPdb, { base: ajouter(t.base, l.htCentimes), tva: ajouter(t.tva, l.tvaLueCentimes) });
  }

  const groupes: GroupeTva[] = [];
  const groupe = (tauxPdb: number, cas: 'A' | 'B', compte: string, base: Centimes, tva: Centimes, date: string | null): void => {
    groupes.push({ compte, tauxPdb, baseCentimes: base, tvaCentimes: tva, codeTva: 'COLLECTEE', cas, dateExigibilite: date, pieceId: avoir.id });
  };
  for (const [taux, t] of [...parTaux].sort((a, b) => tri(a[0], b[0]))) {
    const cas = Object.hasOwn(entree.casParTaux, taux) ? entree.casParTaux[taux] : undefined;
    if (cas !== 'A' && cas !== 'B') throw new ErreurVente('taux_sans_cas', 'Cas A ou B absent pour ce taux.');
    if (cas === 'A') {
      groupe(taux, 'A', comptes.tvaCollectee, t.base, t.tva, avoir.dateFacture);
      continue;
    }
    if (!Object.hasOwn(entree.tvaEnAttenteParTaux, taux)) throw new ErreurVente('montant_invalide', 'TVA en attente absente pour ce taux.');
    const enAttente = exigerMontant(entree.tvaEnAttenteParTaux[taux] as number);
    const attente = Math.min(t.tva, enAttente) as Centimes;
    const collectee = (t.tva - attente) as Centimes;
    if (attente === 0 || collectee === 0) {
      if (attente === 0) groupe(taux, 'B', comptes.tvaCollectee, t.base, collectee, avoir.dateFacture);
      else groupe(taux, 'B', comptes.tvaEnAttente, t.base, attente, null);
      continue;
    }
    const [baseCollectee, baseAttente] = repartir(t.base, [collectee, attente]) as [Centimes, Centimes];
    groupe(taux, 'B', comptes.tvaCollectee, baseCollectee, collectee, avoir.dateFacture);
    groupe(taux, 'B', comptes.tvaEnAttente, baseAttente, attente, null);
  }
  const lignesTva = lignesDeTva(groupes, 'avoir');

  let total = zero;
  for (const m of produits.values()) total = ajouter(total, m);
  for (const t of lignesTva) total = ajouter(total, t.tvaCentimes);
  if (total === 0) throw new ErreurVente('montant_nul', 'Avoir à montant nul.');

  const libelle = `Avoir ${avoir.numero}`;
  const debit = (compte: string, montant: Centimes): LigneEcriture => ({ compte, libelle, debit: montant, credit: zero });
  const aux = entree.auxiliaire === undefined || entree.auxiliaire === '' ? undefined : entree.auxiliaire;
  const lignes: LigneEcriture[] = [];
  for (const [compte, m] of [...produits].sort((a, b) => tri(a[0], b[0]))) if (m !== 0) lignes.push(debit(compte, m));
  for (const t of lignesTva) if (t.tvaCentimes !== 0) lignes.push(debit(t.compte, t.tvaCentimes));
  lignes.push({ compte: comptes.client, ...(aux === undefined ? {} : { auxiliaire: aux }), libelle, debit: zero, credit: total });

  const ecriture: Ecriture = { id: entree.id, journal: entree.journal, date: avoir.dateFacture, statut: aux === undefined || entree.resteDuFacture === null ? 'brouillon' : 'propose', lignes };
  verifierEcriture(ecriture);
  const cartes: Anomalie[] = [];
  if (avoir.ttcCentimes !== total) cartes.push('A1');
  if (entree.resteDuFacture === null) cartes.push('A12');
  else if (total > entree.resteDuFacture) cartes.push('A13');
  return { ecriture, lignesTva, cartes };
}
