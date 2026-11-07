import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Ecriture } from '../../ecritures/modele.js';
import { calculerAnnee } from '../ik-annee.js';
import { montantAnnuel, regularisation } from '../ik-annuel.js';
import { montantProvisoire } from '../ik-provisoire.js';
import { proposerEcritureDepense } from '../ecriture-depense.js';
import { proposerEcritureTrajet, proposerRegularisation } from '../ecriture-ik.js';
import { proposerEcriturePartPerso } from '../ecriture-part-perso.js';
import { doublonsDePiece, refuserDoublon, violations } from '../invariants.js';
import { peutEtreValide } from '../justificatifs.js';
import { repartirPiece, partRemboursable } from '../part-perso.js';
import { determinerPayeur, type EntreePayeur } from '../payeur.js';
import { choisirCompteCourant, compteDeLaPersonne, preparerRemboursement, proposerEcritureRemboursement } from '../remboursement.js';
import { passer } from '../statuts.js';
import { calculerTotaux } from '../totaux.js';
import { admissibilite, kmRetenus } from '../trajet.js';
import { traiterTvaFrais, type EntreeTvaFrais } from '../tva-frais.js';
import { BAREME, c, code, COMPTES, ENTETE, frais, LIGNE, LIGNES_BANQUE, MAJORATION, PARAM_TVA, personne, TRAJET, trajetAnnee, VEHICULE } from './cas-nf-donnees.js';

let rendues: Ecriture[] = [];
beforeEach(() => { rendues = []; });
// aucune-ecriture-valide-sans-personne : rien de ce que le noyau rend n'a le statut valide.
afterEach(() => { expect(rendues.filter((e) => e.statut === 'valide')).toEqual([]); });
const rendre = <T extends Ecriture | null>(e: T): T => { if (e !== null) rendues.push(e); return e; };
const lignes = (e: Ecriture | null): unknown[] => (e?.lignes ?? []).map((l) => [l.compte, l.debit, l.credit]);
const tvaDe = (extra: Partial<EntreeTvaFrais> = {}) => traiterTvaFrais({ nature: 'repas_affaires', tvaLue: c(600), ticketAuNomDeLaPersonne: false, justificatifPerdu: false, estIk: false, ...extra }, PARAM_TVA);
const payeur = (extra: Partial<EntreePayeur> = {}) => determinerPayeur({ ticket: { montantTtc: c(6400), date: '2026-03-10', fournisseur: 'Restaurant Exemple' }, lignes: [], cartesSociete: ['1234'], releveImporte: true, fenetreJours: 3, ...extra });
const provisoire = (cumul: number, electrique = false, km = kmRetenus(TRAJET)) => montantProvisoire({ kmRetenusDixiemes: km, cumulAvantDixiemes: cumul, ligne: LIGNE, majorationPourcent: MAJORATION, electrique });
const annee = [trajetAnnee('t-1', '2026-02-01', 4000), trajetAnnee('t-2', '2026-03-01', 12000), trajetAnnee('t-3', '2026-04-01', 1000)];

describe('banc NF (barème, parts et comptes inventés)', () => {
  it('nf-01', () => {
    expect(tvaDe()).toMatchObject({ code: 'DEDUCTIBLE', deductible: 600, nonDeductible: 0 });
    const e = rendre(proposerEcritureDepense(frais(), tvaDe(), COMPTES, ENTETE));
    expect(lignes(e)).toEqual([['625100', 6000, 0], ['445660', 600, 0], ['455100', 0, 6600]]);
    expect(e.statut).toBe('propose');
    expect(code(() => passer(frais({ statut: 'propose' }), 'valide'))).toBe('transition_interdite');
  });
  it('nf-02', () => {
    const r = payeur({ lignes: LIGNES_BANQUE });
    expect(r).toMatchObject({ payeur: 'societe', source: 'banque', statut: 'exclu_paye_societe', regle: 1, conflit: false, ligneBanqueId: 'lb-1' });
    expect(code(() => proposerEcritureDepense(frais({ payeur: 'societe', statut: 'exclu_paye_societe' }), tvaDe(), COMPTES, ENTETE))).toBe('frais_paye_societe');
  });
  it('nf-03', () => {
    expect(payeur({ ticket: { montantTtc: c(6400), date: '2026-03-10', quatreChiffres: '1234' }, releveImporte: false })).toMatchObject({ payeur: 'societe', statut: 'a_completer', regle: 2, attente: 'releve_manquant' });
  });
  it('nf-04', () => {
    expect(payeur({ declaration: 'personne' })).toMatchObject({ payeur: 'personne', source: 'declaration', statut: 'propose', regle: 3 });
  });
  it('nf-05', () => {
    expect(payeur({ declaration: 'personne', lignes: LIGNES_BANQUE })).toMatchObject({ payeur: 'societe', source: 'banque', conflit: true, ligneBanqueId: 'lb-1' });
  });
  it('nf-06', () => {
    const r = payeur({ declaration: 'personne', releveImporte: false });
    expect(r).toMatchObject({ payeur: 'a_confirmer', statut: 'a_completer', regle: 4, attente: 'releve_manquant' });
    expect(code(() => proposerEcritureDepense(frais({ payeur: 'a_confirmer', statut: 'a_completer' }), tvaDe(), COMPTES, ENTETE))).toBe('entree_invalide');
  });
  it('nf-07', () => {
    const p = provisoire(0);
    expect(p.montant).toBe(4000);
    expect(lignes(rendre(proposerEcritureTrajet(p.montant, COMPTES, { ...ENTETE, libelle: 'IK' })))).toEqual([['625800', 4000, 0], ['455100', 0, 4000]]);
  });
  it('nf-08', () => {
    expect(provisoire(0, true).montant).toBe(4400);
    expect(provisoire(0, false).montant).toBe(4000);
  });
  it('nf-09', () => {
    const p = provisoire(39500);
    expect(p.montant).toBe(3250);
    expect(p.parts).toEqual([{ kmDixiemes: 500, tauxMilliemes: 400 }, { kmDixiemes: 500, tauxMilliemes: 250 }]);
  });
  it('nf-10', () => {
    const { cumuls } = calculerAnnee([trajetAnnee('t-1', '2026-02-01', 4000), trajetAnnee('t-2', '2026-03-01', 50)], { statut: 'valide', bareme: BAREME, majorationPourcent: MAJORATION });
    expect(cumuls[0]?.sommeProvisoires).toBe(161250);
    const annuel = montantAnnuel({ cumulDixiemes: 40500, ligne: LIGNE, majorationPourcent: MAJORATION, electrique: false });
    expect(annuel).toBe(161250);
    expect(regularisation(annuel, [c(160000), c(1250)])).toBe(0);
    expect(rendre(proposerRegularisation(c(0), COMPTES, { ...ENTETE, libelle: 'IK' }))).toBeNull();
  });
  it('nf-11', () => {
    const { montants, cumuls } = calculerAnnee(annee, { statut: 'valide', bareme: BAREME, majorationPourcent: MAJORATION });
    expect([...montants.values()]).toEqual([160000, 300000, 30000]);
    expect(cumuls[0]?.sommeProvisoires).toBe(490000);
    const annuel = montantAnnuel({ cumulDixiemes: 170000, ligne: LIGNE, majorationPourcent: MAJORATION, electrique: false });
    expect(annuel).toBe(510000);
    const ecart = regularisation(annuel, [...montants.values()].map((m) => c(m ?? 0)));
    expect(ecart).toBe(20000);
    expect(lignes(rendre(proposerRegularisation(ecart, COMPTES, { ...ENTETE, libelle: 'IK' })))).toEqual([['625800', 20000, 0], ['455100', 0, 20000]]);
  });
  it('nf-12', () => {
    const avant = calculerAnnee(annee, { statut: 'a_verifier' });
    expect([...avant.montants.values()]).toEqual([null, null, null]);
    expect(rendre(proposerEcritureTrajet(avant.montants.get('t-1') ?? null, COMPTES, { ...ENTETE, libelle: 'IK' }))).toBeNull();
    expect(violations(frais({ nature: 'trajet' }), { baremeAVerifier: true, montantTrajet: c(100) })).toEqual(['inv5_montant_sur_bareme_a_verifier']);
    expect(violations(frais({ nature: 'trajet' }), { baremeAVerifier: true, montantTrajet: null })).toEqual([]);
    const apres = calculerAnnee(annee, { statut: 'valide', bareme: BAREME, majorationPourcent: MAJORATION });
    expect(apres.montants.get('t-1')).toBe(160000);
  });
  it('nf-13', () => {
    expect(admissibilite(TRAJET, { ...VEHICULE, proprietaire: 'societe' })).toEqual({ etat: 'refuse', code: 'vehicule_societe' });
    expect(admissibilite(TRAJET, VEHICULE)).toEqual({ etat: 'calculable' });
  });
  it('nf-14', () => {
    const perdu = frais({ pieceId: '', justificatifPerdu: true, motifSansJustificatif: 'ticket perdu en déplacement', montantTtc: c(4800), tva: c(800), statut: 'propose' });
    expect(peutEtreValide(perdu, {}, { roleHabilite: false })).toEqual({ ok: false, code: 'justificatif_manquant' });
    expect(peutEtreValide(perdu, {}, { roleHabilite: true })).toEqual({ ok: true, tvaForceeAZero: true, motifEcriture: 'ticket perdu en déplacement' });
    const tva = tvaDe({ tvaLue: c(800), justificatifPerdu: true });
    expect(tva).toMatchObject({ code: 'SANS_PIECE', deductible: 0, nonDeductible: 800 });
    const e = rendre(proposerEcritureDepense({ ...perdu, statut: 'valide' }, tva, COMPTES, ENTETE));
    expect(lignes(e)).toEqual([['625100', 4800, 0], ['455100', 0, 4800]]);
    expect(e.sansPieceMotif).toBe('ticket perdu en déplacement');
  });
  it('nf-15', () => {
    const piece = { ttc: c(11000), tva: c(1000), partPersoTtc: c(5500) };
    const rep = repartirPiece(piece);
    expect(rep.societe).toEqual({ ttc: 5500, ht: 5000, tva: 500 });
    expect(partRemboursable(rep, 'societe')).toBe(0);
    const r = proposerEcriturePartPerso(piece, { ...COMPTES, compteCharge: '625100' }, { ...ENTETE, soldePersonneAvant: c(5500) });
    rendre(r.ecriture);
    expect(lignes(r.ecriture)).toEqual([['625100', 5000, 0], ['445660', 500, 0], ['455100', 5500, 0], ['512000', 0, 11000]]);
    expect(r.compteDebiteur).toBe(false);
    expect(proposerEcriturePartPerso(piece, { ...COMPTES, compteCharge: '625100' }, { ...ENTETE, soldePersonneAvant: c(0) }).compteDebiteur).toBe(true);
    expect(code(() => preparerRemboursement(personne('associe'), [frais({ payeur: 'societe', statut: 'exclu_paye_societe' })], ['f-1']))).toBe('entree_invalide');
  });
  it('nf-16', () => {
    const lot = [frais(), frais({ id: 'f-2', montantTtc: c(1260), tva: c(0) }), frais({ id: 'f-3', montantTtc: c(2000), tva: c(0) })];
    const p = preparerRemboursement(personne('associe'), lot, ['f-1', 'f-2', 'f-3']);
    expect(p.montant).toBe(9860);
    expect(code(() => preparerRemboursement(personne('associe'), lot, ['f-1', 'f-2', 'f-3'], c(9861)))).toBe('remboursement_superieur');
    const e = rendre(proposerEcritureRemboursement(p.montant, { id: 'lb-9', montant: c(9860), date: '2026-03-15' }, { comptePersonne: '455100', banque: '512000' }, { id: 'e-3', journal: 'BQ' }));
    expect(lignes(e)).toEqual([['455100', 9860, 0], ['512000', 0, 9860]]);
    expect(code(() => proposerEcritureRemboursement(p.montant, { id: 'lb-9', montant: c(9859), date: '2026-03-15' }, { comptePersonne: '455100', banque: '512000' }, { id: 'e-3', journal: 'BQ' }))).toBe('entree_invalide');
  });
  it('nf-17', () => {
    expect(code(() => choisirCompteCourant(personne('associe')))).toBe('aucune');
    expect(code(() => choisirCompteCourant(personne('dirigeant_non_associe')))).toBe('compte_courant_reserve_associes');
    const comptes = { associe: '455100', nonAssocie: '467000' };
    expect([compteDeLaPersonne(personne('associe'), comptes), compteDeLaPersonne(personne('dirigeant_non_associe'), comptes)]).toEqual(['455100', '467000']);
    expect(code(() => compteDeLaPersonne(personne('salarie'), comptes))).toBe('entree_invalide');
    const laisse = frais({ destination: 'compte_courant' });
    expect(passer(laisse, 'en_compte_courant').statut).toBe('en_compte_courant');
    expect(calculerTotaux([laisse], new Map(), new Map()).aRembourser).toBe(0);
  });
  it('nf-18', () => {
    const existants = [frais()];
    expect(code(() => refuserDoublon(existants, frais({ id: 'f-2' })))).toBe('doublon_piece');
    expect(doublonsDePiece([...existants, frais({ id: 'f-2' })])).toEqual([{ pieceId: 'pc-1', fraisIds: ['f-1', 'f-2'] }]);
    expect(code(() => refuserDoublon(existants, frais({ id: 'f-3', pieceId: 'pc-2' })))).toBe('aucune');
  });
  it('nf-19', () => {
    const lot = [frais({ id: 'f-1', montantTtc: c(6400), payeur: 'societe', statut: 'exclu_paye_societe' }), frais({ id: 'f-2', montantTtc: c(4500), pieceId: '', statut: 'a_completer' }), frais({ id: 'f-3', montantTtc: c(1260) })];
    expect(calculerTotaux(lot, new Map(), new Map())).toEqual({ aRembourser: 1260, enAttente: 4500, exclus: 6400, kmSansMontant: 0 });
  });
  it('nf-20', () => {
    const nom = tvaDe({ ticketAuNomDeLaPersonne: true });
    expect(nom).toMatchObject({ code: 'NON_DEDUCTIBLE_NOM', deductible: 0, nonDeductible: 600, bloquePreparationTva: false });
    expect(lignes(rendre(proposerEcritureDepense(frais(), nom, COMPTES, ENTETE)))).toEqual([['625100', 6600, 0], ['455100', 0, 6600]]);
    for (const parametre of [{ ...PARAM_TVA, statut: 'a_verifier' as const }, undefined]) {
      expect(traiterTvaFrais({ nature: 'repas_affaires', tvaLue: c(600), ticketAuNomDeLaPersonne: false, justificatifPerdu: false, estIk: false }, parametre)).toMatchObject({ code: 'A_VERIFIER', deductible: 0, bloquePreparationTva: true });
    }
  });
});
