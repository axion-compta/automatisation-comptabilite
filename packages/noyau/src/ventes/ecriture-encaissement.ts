// Ventes : écriture d'un encaissement relié à une facture (banque, client, TVA encaissée) et lettrage du compte client.
import { centimes, type Centimes } from '../argent/index.js';
import { lettrer, prochainCode, type LigneALettrer, type ResultatLettrage } from '../ecritures/lettrage.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { lignesDeTva } from './ecriture-facture.js';
import { partEncaissee, type TauxEncaisse } from './encaissement.js';
import { ErreurVente, exigerDate, type Anomalie, type ComptesVente, type LigneTvaVente } from './types.js';

export interface FactureAEncaisser {
  id: string;
  auxiliaire: string;
  cas: 'A' | 'B' | 'C';
  ttc: Centimes;
  dejaEncaisse: Centimes;
  parTaux: readonly TauxEncaisse[];
  ligneClient: LigneALettrer;
}
export interface EntreeEcritureEncaissement {
  id: string;
  journal: string;
  date: string;
  montant: Centimes;
  facture: FactureAEncaisser;
  comptes: ComptesVente;
  codesLettrageExistants: readonly string[];
}
export interface ResultatEcritureEncaissement {
  ecriture: Ecriture;
  lignesTva: LigneTvaVente[];
  lettrage: ResultatLettrage;
  resteDu: Centimes;
  cartes: Anomalie[];
}

const zero = centimes(0);

export function ecritureEncaissement(entree: EntreeEcritureEncaissement): ResultatEcritureEncaissement {
  const { facture, comptes, montant, date } = entree;
  if (facture.cas !== 'A' && facture.cas !== 'B' && facture.cas !== 'C') throw new ErreurVente('cas_invalide', 'Cas A, B ou C attendu.');
  exigerDate(date, 'date');
  const part = partEncaissee({ ttcFacture: facture.ttc, dejaEncaisse: facture.dejaEncaisse, paiement: montant, parTaux: facture.parTaux });

  const lignesTva = facture.cas === 'B'
    ? lignesDeTva(part.parTaux.filter((p) => p.tva !== 0 || p.base !== 0).map((p) => ({
      compte: comptes.tvaCollectee, tauxPdb: p.tauxPdb, baseCentimes: p.base, tvaCentimes: p.tva, codeTva: 'COLLECTEE', cas: 'B', dateExigibilite: date, pieceId: facture.id,
    })))
    : [];

  const libelle = `Encaissement ${facture.id}`;
  const lignes: LigneEcriture[] = [
    { compte: comptes.banque, libelle, debit: montant, credit: zero },
    { compte: comptes.client, auxiliaire: facture.auxiliaire, libelle, debit: zero, credit: montant },
  ];
  for (const t of lignesTva) {
    if (t.tvaCentimes === 0) continue;
    lignes.push({ compte: comptes.tvaEnAttente, libelle, debit: t.tvaCentimes, credit: zero });
    lignes.push({ compte: comptes.tvaCollectee, libelle, debit: zero, credit: t.tvaCentimes });
  }
  const ecriture: Ecriture = { id: entree.id, journal: entree.journal, date, statut: 'propose', lignes };
  verifierEcriture(ecriture);

  const resteDu = Math.max(0, facture.ttc - facture.dejaEncaisse - montant) as Centimes;
  const lignePaiement: LigneALettrer = { id: `${entree.id}-1`, compte: comptes.client, auxiliaire: facture.auxiliaire, debit: zero, credit: montant };
  const lettre = lettrer([facture.ligneClient, lignePaiement], prochainCode(entree.codesLettrageExistants));
  const cartes: Anomalie[] = part.tropPercu > 0 ? ['A18'] : [];
  return { ecriture, lignesTva, lettrage: { ...lettre, partiel: resteDu > 0 }, resteDu, cartes };
}
