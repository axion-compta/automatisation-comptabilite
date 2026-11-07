// Ventes : indicateurs du mois. Les comptes et le préfixe des produits viennent de l'appelant.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture, StatutEcriture } from '../ecritures/modele.js';
import { ErreurVente, exigerDate, type ComptesVente, type LigneTvaVente } from './types.js';

export interface Indicateur {
  montant: Centimes;
  pieces: string[];
}

export interface Creance {
  clientId: string;
  resteDu: Centimes;
  enRetard: boolean;
}

export interface EntreeIndicateurs {
  mois: string;
  ecritures: readonly (Ecriture & { pieceId: string })[];
  lignesTva: readonly (LigneTvaVente & { statutEcriture: StatutEcriture })[];
  creances: readonly Creance[];
  comptes: ComptesVente;
  prefixeProduits: string;
  regimeConfirme: boolean;
  avecPropositions?: boolean;
}

export interface SortieIndicateurs {
  chiffreAffaires: Indicateur;
  aEncaisser: Indicateur;
  enRetard: Indicateur & { clients: number };
  tvaCollectee: Indicateur | { nonCalculee: 'regime_a_confirmer' };
  tvaEnAttente: Indicateur;
  provisoire: boolean;
}

const FORME_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;

function resultat(montant: Centimes, pieces: Set<string>): Indicateur {
  return { montant, pieces: [...pieces].sort() };
}

export function indicateursDuMois(e: EntreeIndicateurs): SortieIndicateurs {
  if (!FORME_MOIS.test(e.mois)) throw new ErreurVente('mois_invalide', 'Mois attendu au format AAAA-MM.');
  if (e.prefixeProduits === '') throw new ErreurVente('prefixe_invalide', 'Préfixe des comptes de produits manquant.');
  const provisoire = e.avecPropositions === true;
  const compte = (s: StatutEcriture): boolean => s === 'valide' || (provisoire && s === 'propose');
  const dansMois = (d: string): boolean => exigerDate(d, 'date').startsWith(e.mois);
  const jusquAuMois = (d: string): boolean => exigerDate(d, 'date').slice(0, e.mois.length) <= e.mois;

  let ca = centimes(0);
  const piecesCa = new Set<string>();
  let attente = centimes(0);
  const piecesAttente = new Set<string>();
  for (const ecr of e.ecritures) {
    if (!compte(ecr.statut)) continue;
    const duMois = dansMois(ecr.date);
    const cumul = jusquAuMois(ecr.date);
    for (const l of ecr.lignes) {
      if (duMois && l.compte.startsWith(e.prefixeProduits)) {
        ca = ajouter(ca, soustraire(l.credit, l.debit));
        piecesCa.add(ecr.pieceId);
      }
      if (cumul && l.compte === e.comptes.tvaEnAttente) {
        attente = ajouter(attente, soustraire(l.credit, l.debit));
        piecesAttente.add(ecr.pieceId);
      }
    }
  }

  let encaisser = centimes(0);
  let retard = centimes(0);
  const clientsEnRetard = new Set<string>();
  for (const cr of e.creances) {
    if (!Number.isSafeInteger(cr.resteDu) || cr.resteDu < 0) {
      throw new ErreurVente('montant_invalide', 'Reste dû invalide.');
    }
    encaisser = ajouter(encaisser, cr.resteDu);
    if (cr.enRetard) {
      retard = ajouter(retard, cr.resteDu);
      clientsEnRetard.add(cr.clientId);
    }
  }

  let tvaCollectee: SortieIndicateurs['tvaCollectee'] = { nonCalculee: 'regime_a_confirmer' };
  if (e.regimeConfirme) {
    let total = centimes(0);
    const pieces = new Set<string>();
    for (const t of e.lignesTva) {
      if (!compte(t.statutEcriture) || t.compte !== e.comptes.tvaCollectee) continue;
      if (t.dateExigibilite === null || !dansMois(t.dateExigibilite)) continue;
      const v = Math.abs(t.tvaCentimes) as Centimes;
      total = t.sens === 'avoir' ? soustraire(total, v) : ajouter(total, t.tvaCentimes);
      pieces.add(t.pieceId);
    }
    tvaCollectee = resultat(total, pieces);
  }

  return {
    chiffreAffaires: resultat(ca, piecesCa),
    aEncaisser: { montant: encaisser, pieces: [] },
    enRetard: { montant: retard, pieces: [], clients: clientsEnRetard.size },
    tvaCollectee,
    tvaEnAttente: resultat(attente, piecesAttente),
    provisoire,
  };
}
