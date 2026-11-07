// Ventes : délettrage d'un encaissement. Le lettrage d'origine n'est jamais effacé : on ajoute une annulation.
// En cas B, seule la TVA encaissée est contre-passée, à la date de correction ; l'écriture bancaire reste.
import { centimes, soustraire, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { ErreurVente, exigerDate, type ComptesVente, type LigneTvaVente } from './types.js';

export interface EntreeDelettrage {
  lettrageId: string;
  idAnnulation: string;
  idEcriture: string;
  journal: string;
  dateCorrection: string;
  motif: string;
  lignesTvaEncaissement: readonly LigneTvaVente[];
  comptes: ComptesVente;
}
export interface AnnulationLettrage { id: string; annuleLettrageId: string; motif: string; date: string }
export interface ResultatDelettrage { annulation: AnnulationLettrage; ecriture: Ecriture | null; lignesTva: LigneTvaVente[] }

const zero = centimes(0);
const vide = (t: unknown): boolean => typeof t !== 'string' || t.trim() === '';

export function delettrer(entree: EntreeDelettrage): ResultatDelettrage {
  const { comptes, dateCorrection, motif } = entree;
  if (vide(motif)) throw new ErreurVente('motif_obligatoire', 'Un motif est obligatoire pour délettrer.');
  exigerDate(dateCorrection, 'dateCorrection');
  if (vide(entree.lettrageId) || vide(entree.idAnnulation) || vide(entree.idEcriture)) throw new ErreurVente('identifiant_obligatoire', 'Identifiant manquant.');

  const lignesTva = entree.lignesTvaEncaissement.map((l): LigneTvaVente => ({
    ...l, baseCentimes: soustraire(zero, centimes(l.baseCentimes)), tvaCentimes: soustraire(zero, centimes(l.tvaCentimes)), dateExigibilite: dateCorrection,
  }));
  const libelle = `Délettrage ${entree.lettrageId}`;
  const lignes: LigneEcriture[] = [];
  for (const l of entree.lignesTvaEncaissement) {
    if (l.tvaCentimes === 0) continue;
    const montant: Centimes = l.tvaCentimes;
    lignes.push({ compte: comptes.tvaCollectee, libelle, debit: montant, credit: zero });
    lignes.push({ compte: comptes.tvaEnAttente, libelle, debit: zero, credit: montant });
  }
  const annulation: AnnulationLettrage = { id: entree.idAnnulation, annuleLettrageId: entree.lettrageId, motif, date: dateCorrection };
  if (lignes.length === 0) return { annulation, ecriture: null, lignesTva };
  const ecriture: Ecriture = { id: entree.idEcriture, journal: entree.journal, date: dateCorrection, statut: 'brouillon', type: 'correction', motif, lignes };
  verifierEcriture(ecriture);
  return { annulation, ecriture, lignesTva };
}
