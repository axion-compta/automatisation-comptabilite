// Banc du profil 2 : cas P13 à P18 et P22 à P25 de la spec 09 (05-cas-de-test.md), chiffres de la spec. Sociétés fictives.
import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ajouterValeur } from '../../champs.js';
import { apercuChangement, changerDateCloture } from '../../changements.js';
import { dateEffetOption, exigibilitePour, type RegleEffetOption } from '../../fiscal/exigibilite.js';
import { evaluerMicroComptable, type SeuilsMicroComptable } from '../../fiscal/micro-comptable.js';
import { etatFranchiseCreation, type PeriodeCreation } from '../../fiscal/prorata-creation.js';
import type { LigneImposition } from '../../fiscal/imposition.js';
import { bloqueALaDate, verifierPerimetre, type ReponsesPerimetre, type ReglesPerimetre } from '../../perimetre.js';
import { profilAu } from '../../profil-au.js';
import { enFormation, periodeDePiece, traitementPieceAvantImmatriculation, verifierDates, type DatesSociete } from '../../trois-dates.js';
import type { ChampProfil } from '../../types.js';
import { PRORATA_A_VERIFIER, param2 } from './parametres-de-test-2.js';

const c = (n: number): Centimes => centimes(n);
const SOC = 'soc-atelier-fictif';
const REGLES: ReglesPerimetre = { formesHorsPerimetre: ['SA'], prefixesPostauxExclus: ['20'] };
const reponses = (r: Partial<ReponsesPerimetre>): ReponsesPerimetre => ({
  formeLue: 'SARL',
  cotee: false,
  commissaireAuxComptes: 'non',
  paie: false,
  plusieursPays: false,
  codePostalSiege: '75001',
  ...r,
});

describe('banc profil 2', () => {
  it('P13', () => {
    const ecrituresValidees = [{ id: 'e1', date: '2026-12-15' }, { id: 'e2', date: '2027-01-10' }];
    const objets = {
      brouillons: [{ id: 'b1', date: '2026-12-20' }, { id: 'b2', date: '2027-01-05' }, { id: 'b3', date: '2027-02-05' }],
      declarations: [{ periode: { debut: '2027-01-01', fin: '2027-01-31' }, deposee: false }],
      echeances: [{ id: 'ech1', date: '2027-02-19', dependDe: ['tva.regime'] }, { id: 'ech2', date: '2027-02-19', dependDe: ['autre'] }],
      ecrituresValidees,
    };
    const avant = JSON.stringify(objets);
    const a = apercuChangement({ cle: 'tva.regime', effetDebut: '2027-01-01' }, objets);
    expect(a.ecrituresValideesTouchees).toBe(0);
    expect(a.brouillonsRecalcules).toBe(2);
    expect(a.declarationsRecalculees).toEqual([{ debut: '2027-01-01', fin: '2027-01-31' }]);
    expect(a.echeancesDeplacees).toEqual(['ech1']);
    expect(JSON.stringify(objets)).toBe(avant);
    const deposee = { ...objets, declarations: [{ periode: { debut: '2027-01-01', fin: '2027-01-31' }, deposee: true }] };
    expect(apercuChangement({ cle: 'tva.regime', effetDebut: '2027-01-01' }, deposee)).toMatchObject({ refus: 'periode_deposee', regularisationProposee: true, ecrituresValideesTouchees: 0 });
  });

  it('P14', () => {
    const regle = param2<{ regle: RegleEffetOption }>('tva.option_debits.effet').regle;
    expect(dateEffetOption('2026-10-20', { regle, statutParametre: 'valide' })).toEqual({ effetDebut: '2026-11-01', aVerifier: false });
    expect(dateEffetOption('2026-10-20', { regle, statutParametre: 'a_verifier' }).aVerifier).toBe(true);
    const facture = (dateOperation: string) =>
      exigibilitePour({ nature: 'service', dateOperation, optionDebitsEffet: '2026-11-01', exigibiliteConfirmeePar: 'personne-un', vendDesServices: true });
    expect(facture('2026-10-25')).toBe('encaissement');
    expect(facture('2026-10-31')).toBe('encaissement');
    expect(facture('2026-11-01')).toBe('debits');
  });

  it('P15', () => {
    expect(verifierPerimetre(reponses({ commissaireAuxComptes: 'oui' }), REGLES)).toMatchObject({ bloque: true, motifs: ['commissaire_aux_comptes'] });
    const doute = verifierPerimetre(reponses({ commissaireAuxComptes: 'je_ne_sais_pas' }), REGLES);
    expect(doute).toMatchObject({ bloque: false, questionsAvantCloture: ['commissaire_aux_comptes'] });
    expect(verifierPerimetre(reponses({}), REGLES).bloque).toBe(false);
  });

  it('P16', () => {
    const ajaccio = verifierPerimetre(reponses({ codePostalSiege: '20000' }), REGLES);
    expect(ajaccio).toMatchObject({ bloque: true, motifs: ['siege_exclu'] });
    expect(verifierPerimetre(reponses({ codePostalSiege: '21000' }), REGLES).bloque).toBe(false);
    const historique = [{ effetDebut: '2020-01-01', codePostal: '75001' }, { effetDebut: '2027-01-01', codePostal: '20000' }];
    expect(bloqueALaDate(historique, '2026-12-31', REGLES)).toBe(false);
    expect(bloqueALaDate(historique, '2027-01-01', REGLES)).toBe(true);
  });

  it('P17', () => {
    expect(verifierPerimetre(reponses({ formeLue: 'SA' }), REGLES)).toMatchObject({ bloque: true, motifs: ['forme_hors_perimetre'] });
    expect(verifierPerimetre(reponses({ formeLue: 'SAS' }), REGLES).bloque).toBe(false);
  });

  it('P18', () => {
    const s = param2<{ bilan: number; ca: number; effectif: number; criteres: number }>('micro_comptable.seuils');
    const seuils: SeuilsMicroComptable = { bilanMax: c(s.bilan), caMax: c(s.ca), effectifMax: s.effectif, criteresRequis: s.criteres };
    const taille = (bilan: number, ca: number, effectif: number) => ({ totalBilanCentimes: c(bilan), caNetCentimes: c(ca), effectifMoyen: effectif, source: 'exercice_clos' as const });
    const r = evaluerMicroComptable(taille(30000000, 95000000, 8), seuils);
    expect(r).toMatchObject({ microComptable: true, nonDepasses: 2, criteres: [true, false, true], dispensesProposees: true, regleDureeAVerifier: true });
    expect(evaluerMicroComptable(taille(50000000, 95000000, 8), seuils).microComptable).toBe(false);
    expect(evaluerMicroComptable({ ...taille(0, 0, 0), source: 'je_ne_sais_pas' }, seuils).microComptable).toBeNull();
  });

  it('P22', () => {
    const dates: DatesSociete = { depotCapital: '2026-06-10', immatriculation: '2026-06-25', debutActivite: '2026-07-01', exerciceDebut: '2026-07-01', exerciceFin: '2027-06-30' };
    expect(verifierDates(dates)).toEqual({ valide: true, motifs: [] });
    expect(enFormation(dates)).toBe(false);
    expect(enFormation({ ...dates, immatriculation: null })).toBe(true);
    expect(periodeDePiece(dates, '2026-06-09')).toBe('avant_depot');
    expect(periodeDePiece(dates, '2026-06-20')).toBe('avant_immatriculation');
    expect(periodeDePiece(dates, '2026-06-25')).toBe('avant_exercice');
    expect(periodeDePiece(dates, '2026-07-01')).toBe('exercice');
    const achat = traitementPieceAvantImmatriculation({ dansEtatDesActes: false, decisionDeReprise: null });
    expect(achat).toEqual({ reprise: 'a_verifier', chargePermise: false, tvaDeductiblePermise: false, carte: 'reprise_a_verifier' });
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: true, decisionDeReprise: null })).toMatchObject({ reprise: 'oui', chargePermise: true });
    expect(verifierDates({ ...dates, immatriculation: '2026-06-09' }).motifs).toEqual(['immatriculation_avant_depot']);
  });

  it('P23', () => {
    const base = { exerciceEnCours: { debut: '2026-01-01', fin: '2026-12-31', datesFigees: true }, nouvelleFinJourMois: '06-30', dureeMinMois: 6, dureeMaxMois: 24 };
    expect(changerDateCloture(base)).toEqual({ exerciceEnCours: { debut: '2026-01-01', fin: '2026-12-31' }, exerciceSuivant: { debut: '2027-01-01', fin: '2027-06-30' } });
    const libre = changerDateCloture({ ...base, exerciceEnCours: { ...base.exerciceEnCours, datesFigees: false } });
    expect(libre).toEqual({ exerciceEnCours: { debut: '2026-01-01', fin: '2026-06-30' }, exerciceSuivant: null });
    expect(() => changerDateCloture({ ...base, dureeMinMois: 7 })).toThrow('duree_exercice_hors_bornes');
  });

  it('P24', () => {
    const v = (valeur: string, effetDebut: string) => ({ societeId: SOC, cle: 'forme', valeur, origine: 'document' as const, confiance: 'sur' as const, effetDebut });
    const champs = [v('SARL', '2020-01-01'), v('SAS', '2027-03-01')].reduce<readonly ChampProfil[]>((h, n) => ajouterValeur(h, n, '2027-02-01'), []);
    const ligne = (effetDebut: string, effetFin: string | null, impot: 'IS' | 'IR'): LigneImposition => ({ societeId: SOC, effetDebut, effetFin, impot, categorie: 'BIC', regime: 'reel_simplifie', motif: 'essai', statut: 'confirme' });
    const imposition = [ligne('2020-01-01', '2027-03-01', 'IS'), ligne('2027-03-01', null, 'IS')];
    const au = (date: string) => profilAu({ champs, imposition }, SOC, date);
    expect(au('2027-02-28').champs['forme']?.valeur).toBe('SARL');
    expect(au('2027-03-01').champs['forme']?.valeur).toBe('SAS');
    expect(au('2027-03-01').imposition?.effetDebut).toBe('2027-03-01');
    expect(au('2027-02-28').imposition?.effetDebut).toBe('2020-01-01');
  });

  it('P25', () => {
    const periode: PeriodeCreation = { debutActivite: '2026-07-01', finAnnee: '2026-12-31' };
    const regle = param2<{ joursAnnee: number; finIncluse: boolean }>('tva.franchise.prorata_creation');
    const s = param2<{ base: number; majore: number }>('tva.franchise.seuil.services');
    const seuils = { seuilBase: c(s.base), seuilMajore: c(s.majore) };
    const etat = (ca: number) => etatFranchiseCreation(c(ca), periode, regle, { ...seuils, statutParametre: 'sur' });
    expect(etat(2000000)).toEqual({ niveau: 'entre_base_et_majore', aVerifier: false, caAnnualiseAffiche: null, sortieProposeeLe: '2027-01-01' });
    expect(etat(2100000)).toEqual({ niveau: 'au_dessus_majore', aVerifier: false, caAnnualiseAffiche: null, sortieProposeeLe: null });
    expect(etat(1000000).niveau).toBe('sous_base');
    const incertain = etatFranchiseCreation(c(2000000), periode, regle, { ...seuils, statutParametre: PRORATA_A_VERIFIER.statut === 'a_verifier' ? 'a_verifier' : 'sur' });
    expect(incertain.aVerifier).toBe(true);
  });
});
