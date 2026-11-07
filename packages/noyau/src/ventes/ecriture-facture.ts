// Ventes : écriture d'une facture lue (cas A, B, C ; D = aucune écriture).
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture, type StatutEcriture } from '../ecritures/modele.js';
import { casDeLaLigne, dateExigibilite, type CasLigne } from './schema.js';
import { ErreurVente, exigerDate, type Anomalie, type CasSchema, type ComptesVente, type LigneTvaVente, type LigneVente, type PieceVente, type ProfilVente } from './types.js';

export type GroupeTva = Omit<LigneTvaVente, 'sens'>;
export type MotifSansEcriture = 'livre_recettes' | 'tva_en_franchise_a_verifier' | 'regime_a_confirmer';
export interface EntreeEcritureFacture {
  id: string;
  journal: string;
  piece: PieceVente;
  lignes: readonly LigneVente[];
  profil: ProfilVente;
  comptes: ComptesVente;
  auxiliaire?: string;
}
export interface ResultatEcritureFacture {
  ecriture: Ecriture | null;
  lignesTva: LigneTvaVente[];
  cartes: Anomalie[];
  motif?: MotifSansEcriture;
}

const zero = centimes(0);

function ordre<T extends string | number | null>(a: T, b: T): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a < b ? -1 : 1;
}

export function lignesDeTva(groupes: readonly GroupeTva[], sens: LigneTvaVente['sens'] = 'vente'): LigneTvaVente[] {
  const fusion = new Map<string, LigneTvaVente>();
  for (const g of groupes) {
    const cle = [g.cas, String(g.tauxPdb), String(g.dateExigibilite), g.compte].join('|');
    const deja = fusion.get(cle);
    if (deja === undefined) fusion.set(cle, { ...g, sens });
    else fusion.set(cle, { ...deja, baseCentimes: ajouter(deja.baseCentimes, g.baseCentimes), tvaCentimes: ajouter(deja.tvaCentimes, g.tvaCentimes) });
  }
  return [...fusion.values()].sort((a, b) => ordre(a.cas, b.cas) || ordre(a.tauxPdb, b.tauxPdb) || ordre(a.dateExigibilite, b.dateExigibilite));
}

function exigerMontant(v: number): Centimes {
  if (!Number.isSafeInteger(v) || v < 0) throw new ErreurVente('montant_invalide', 'Montant lu invalide.');
  return centimes(v);
}

function valider(entree: EntreeEcritureFacture): void {
  if (entree.lignes.length === 0) throw new ErreurVente('aucune_ligne', 'Aucune ligne à écrire.');
  exigerDate(entree.piece.dateFacture, 'dateFacture');
  exigerMontant(entree.piece.ttcCentimes);
  for (const l of entree.lignes) {
    exigerMontant(l.htCentimes);
    exigerMontant(l.tvaLueCentimes);
    if (l.tauxPdb !== null && (!Number.isSafeInteger(l.tauxPdb) || l.tauxPdb < 0)) {
      throw new ErreurVente('taux_invalide', 'Taux lu invalide.');
    }
    if (l.compteProduit === undefined || l.compteProduit === '') {
      throw new ErreurVente('compte_produit_manquant', 'Compte de produit absent : une personne le choisit.');
    }
  }
}

function sommer(valeurs: Iterable<Centimes>): Centimes {
  let s = zero;
  for (const v of valeurs) s = ajouter(s, v);
  return s;
}

function additionner(m: Map<string, Centimes>, cle: string, v: Centimes): void {
  m.set(cle, ajouter(m.get(cle) ?? zero, v));
}

function casEcrit(profil: ProfilVente, l: LigneVente, operation: string): Exclude<CasLigne, 'a_confirmer'> {
  const cas = casDeLaLigne(profil, l.nature, operation);
  return cas === 'a_confirmer' ? (casDeLaLigne(profil, 'service', operation) as CasSchema) : cas;
}

export function ecritureFacture(entree: EntreeEcritureFacture): ResultatEcritureFacture {
  valider(entree);
  const { piece, lignes, profil, comptes } = entree;
  const sans = (motif: MotifSansEcriture, cartes: Anomalie[] = []): ResultatEcritureFacture => ({ ecriture: null, lignesTva: [], cartes, motif });
  if (profil.tenue === 'livre_recettes') return sans('livre_recettes');
  if (profil.regimeTva === 'a_confirmer') return sans('regime_a_confirmer');

  const operation = piece.dateOperation ?? piece.dateFacture;
  const cas = lignes.map((l) => casEcrit(profil, l, operation));
  if (cas[0] === 'C' && lignes.some((l) => l.tvaLueCentimes !== 0)) return sans('tva_en_franchise_a_verifier', ['A16']);

  const produits = new Map<string, Centimes>();
  const groupes: GroupeTva[] = [];
  lignes.forEach((l, i) => {
    const c = cas[i] as CasSchema;
    additionner(produits, l.compteProduit as string, l.htCentimes);
    if (c === 'C') return;
    const date = dateExigibilite(c, l.nature, { dateFacture: piece.dateFacture, ...(piece.dateOperation === undefined ? {} : { dateOperation: piece.dateOperation }) });
    const compte = c === 'A' ? comptes.tvaCollectee : comptes.tvaEnAttente;
    groupes.push({ compte, tauxPdb: l.tauxPdb, baseCentimes: l.htCentimes, tvaCentimes: l.tvaLueCentimes, codeTva: l.codeTva, cas: c, dateExigibilite: date.date, pieceId: piece.id });
  });
  const lignesTva = lignesDeTva(groupes);

  const tva = new Map<string, Centimes>();
  const compteDe = new Map<string, string>();
  for (const t of lignesTva) {
    const cle = `${t.cas}|${String(t.tauxPdb)}`;
    compteDe.set(cle, t.compte);
    additionner(tva, cle, t.tvaCentimes);
  }
  const total = ajouter(sommer(produits.values()), sommer(tva.values()));
  if (total === 0) throw new ErreurVente('montant_nul', 'Facture à montant nul.');

  const libelle = `Facture ${piece.numero}`;
  const credit = (compte: string, montant: Centimes): LigneEcriture => ({ compte, libelle, debit: zero, credit: montant });
  const aux = entree.auxiliaire === undefined || entree.auxiliaire === '' ? undefined : entree.auxiliaire;
  const lignesEcr: LigneEcriture[] = [{ compte: comptes.client, ...(aux === undefined ? {} : { auxiliaire: aux }), libelle, debit: total, credit: zero }];
  for (const [compte, m] of [...produits].sort((a, b) => ordre(a[0], b[0]))) if (m !== 0) lignesEcr.push(credit(compte, m));
  for (const [cle, m] of [...tva]) if (m !== 0) lignesEcr.push(credit(compteDe.get(cle) as string, m));

  const brouillon = aux === undefined || lignes.some((l) => l.nature === 'a_confirmer');
  const statut: StatutEcriture = brouillon ? 'brouillon' : 'propose';
  const ecriture: Ecriture = { id: entree.id, journal: entree.journal, date: piece.dateFacture, statut, lignes: lignesEcr };
  verifierEcriture(ecriture);
  const cartes: Anomalie[] = piece.ttcCentimes === total ? [] : ['A1'];
  return { ecriture, lignesTva, cartes };
}
