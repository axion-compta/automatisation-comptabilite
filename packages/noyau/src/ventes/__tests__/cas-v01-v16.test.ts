// Cas chiffrés V01 à V16 (spec 10, fichier 06) rejoués sur les fonctions pures, enchaînées comme le fera le serveur.
// Taux INVENTÉS en points de base : T6 = 600, T9 = 900, T19 = 1 900. Montants en centimes.
// Correspondance : V08 et V13 sont recalculés au taux T19 (HT 333,33 → attendue 63,33, lue 64,00 ; TTC 1 190,00 → HT 1 000,00, TVA 190,00).
// V14 : HT 5 000,00, TVA 950,00, TTC 5 950,00, acompte 1 190,00, client reste 4 760,00. V12 : seuil inventé.
// Cas V10 et V11 : franchise sans TVA, puis franchise avec TVA portée par erreur (carte A16).
import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../../../../parametres/src/au-jour.js';
import { centimes, type Centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import type { LigneALettrer } from '../../ecritures/lettrage.js';
import { qualifierAcompte } from '../acompte.js';
import { controleTotaux, controleTvaParTaux } from '../controles-piece.js';
import { ecritureAvoir } from '../ecriture-avoir.js';
import { ecritureEncaissement } from '../ecriture-encaissement.js';
import { ecritureFacture, type ResultatEcritureFacture } from '../ecriture-facture.js';
import { controleSolde, ecritureImputation } from '../imputation-acompte.js';
import { caEncaisseAnnee, depassementSeuil, ligneLivreRecettes } from '../livre-recettes.js';
import type { ComptesVente, LigneVente, PieceVente, ProfilVente } from '../types.js';

const c = (n: number): Centimes => centimes(n);
const T6 = 600;
const T9 = 900;
const T19 = 1900;
const comptes: ComptesVente = { client: '411', tvaCollectee: '445710', tvaEnAttente: '445740', avancesClients: '419100', banque: '512' };
const reel: ProfilVente = { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null };
const piece = (ht: number, tva: number, extra: Partial<PieceVente> = {}): PieceVente => ({
  id: 'f1', type: 'facture', origine: 'depot', numero: 'F-1', dateFacture: '2026-11-03', htCentimes: c(ht), tvaCentimes: c(tva), ttcCentimes: c(ht + tva), statut: 'validee', ...extra,
});
const ligne = (ht: number, tva: number, tauxPdb: number | null, nature: LigneVente['nature'], compteProduit: string): LigneVente => ({
  libelle: 'Prestation inventée', htCentimes: c(ht), tauxPdb, tvaLueCentimes: c(tva), nature, compteProduit, codeTva: 'COLLECTEE',
});
const facturer = (p: PieceVente, lignes: LigneVente[], profil = reel): ResultatEcritureFacture =>
  ecritureFacture({ id: 'ec-f1', journal: 'VE', piece: p, lignes, profil, comptes, auxiliaire: 'CLIENT1' });
const resume = (e: Ecriture | null) => (e?.lignes ?? []).map((l) => [l.compte, l.debit, l.credit]);
const solde = (compte: string, ecritures: Ecriture[]): number =>
  ecritures.flatMap((e) => e.lignes).filter((l) => l.compte === compte).reduce((s, l) => s + l.credit - l.debit, 0);
const initial = (r: ResultatEcritureFacture) => r.lignesTva.map((t) => ({ tauxPdb: t.tauxPdb as number, tvaInitiale: c(t.tvaCentimes), baseInitiale: c(t.baseCentimes), tvaDejaExigible: c(0), baseDejaExigible: c(0) }));

// Encaissements successifs sur une facture de cas B ; renvoie écritures, lignes de TVA et lettrage de chaque paiement.
function encaisser(facture: ResultatEcritureFacture, ttc: number, paiements: number[], dejaEncaisse = 0) {
  const parTaux = initial(facture);
  const ecritures: Ecriture[] = [];
  const tva: number[][] = [];
  const bases: number[][] = [];
  const lettrages: { code: string; partiel: boolean; reste: number }[] = [];
  let cumul = dejaEncaisse;
  let lettre: string | undefined;
  paiements.forEach((p, i) => {
    const ligneClient: LigneALettrer = { id: 'f1-1', compte: '411', auxiliaire: 'CLIENT1', debit: c(ttc - dejaEncaisse), credit: c(0), ...(lettre === undefined ? {} : { lettre }) };
    const r = ecritureEncaissement({
      id: `ec-e${i + 1}`, journal: 'BQ', date: `2026-12-0${i + 1}`, montant: c(p), comptes, codesLettrageExistants: [],
      facture: { id: 'f1', auxiliaire: 'CLIENT1', cas: 'B', ttc: c(ttc), dejaEncaisse: c(cumul), parTaux: parTaux.map((t) => ({ ...t })), ligneClient },
    });
    r.lignesTva.forEach((t) => {
      const k = parTaux.findIndex((x) => x.tauxPdb === t.tauxPdb);
      const x = parTaux[k]!;
      parTaux[k] = { ...x, tvaDejaExigible: c(x.tvaDejaExigible + t.tvaCentimes), baseDejaExigible: c(x.baseDejaExigible + t.baseCentimes) };
    });
    ecritures.push(r.ecriture);
    tva.push(r.lignesTva.map((t) => t.tvaCentimes));
    bases.push(r.lignesTva.map((t) => t.baseCentimes));
    lettrages.push({ code: r.lettrage.code, partiel: r.lettrage.partiel, reste: r.lettrage.reste });
    lettre = r.lettrage.code;
    cumul += p;
  });
  return { ecritures, tva, bases, lettrages };
}

const paramValide: ParametreLegal = { cle: 'cle.inventee.acompte', pays: 'FR', valeur: 'x', effet_debut: '2026-01-01', effet_fin: null, statut: 'valide', source: 'Source inventée', date_releve: '2026-06-01' };

describe('cas chiffrés V01 à V16', () => {
  it('v01', () => {
    const r = facturer(piece(100000, 5500, { dateOperation: '2026-11-02' }), [ligne(100000, 5500, T6, 'bien', '707')]);
    expect(resume(r.ecriture)).toEqual([['411', 105500, 0], ['707', 0, 100000], ['445710', 0, 5500]]);
    expect(r.lignesTva).toEqual([{ compte: '445710', tauxPdb: T6, baseCentimes: 100000, tvaCentimes: 5500, codeTva: 'COLLECTEE', cas: 'A', sens: 'vente', dateExigibilite: '2026-11-02', pieceId: 'f1' }]);
    expect(r.cartes).toEqual([]);
    expect(r.ecriture?.statut).toBe('propose');
  });
  it('v02', () => {
    const r = facturer(piece(200000, 20000), [ligne(200000, 20000, T9, 'service', '706')]);
    expect(resume(r.ecriture)).toEqual([['411', 220000, 0], ['706', 0, 200000], ['445740', 0, 20000]]);
    expect(r.lignesTva).toEqual([{ compte: '445740', tauxPdb: T9, baseCentimes: 200000, tvaCentimes: 20000, codeTva: 'COLLECTEE', cas: 'B', sens: 'vente', dateExigibilite: null, pieceId: 'f1' }]);
    expect(r.cartes).toEqual([]);
  });
  it('v03', () => {
    const f = facturer(piece(200000, 20000), [ligne(200000, 20000, T9, 'service', '706')]);
    const e = encaisser(f, 220000, [220000]);
    expect(resume(e.ecritures[0] ?? null)).toEqual([['512', 220000, 0], ['411', 0, 220000], ['445740', 20000, 0], ['445710', 0, 20000]]);
    expect(e.tva).toEqual([[20000]]);
    expect(e.bases).toEqual([[200000]]);
    expect(e.lettrages).toEqual([{ code: 'A', partiel: false, reste: 0 }]);
    const tout = [f.ecriture as Ecriture, ...e.ecritures];
    expect(solde('445740', tout)).toBe(0);
    expect(solde('411', tout)).toBe(0);
    expect(solde('445710', tout)).toBe(20000);
  });
  it('v04', () => {
    const f = facturer(piece(200000, 20000), [ligne(200000, 20000, T9, 'service', '706')]);
    const e = encaisser(f, 220000, [110000, 110000]);
    expect(e.tva).toEqual([[10000], [10000]]);
    expect(e.bases).toEqual([[100000], [100000]]);
    expect(e.lettrages).toEqual([{ code: 'A', partiel: true, reste: 110000 }, { code: 'A', partiel: false, reste: 0 }]);
    expect(solde('445740', [f.ecriture as Ecriture, ...e.ecritures])).toBe(0);
    expect(solde('445740', [f.ecriture as Ecriture, ...e.ecritures.slice(0, 1)])).toBe(10000);
    expect(solde('411', [f.ecriture as Ecriture, ...e.ecritures])).toBe(0);
  });
  it('v05', () => {
    const f = facturer(piece(200000, 20000), [ligne(200000, 20000, T9, 'service', '706')]);
    const e = encaisser(f, 220000, [73333, 73333, 73334]);
    expect(e.tva).toEqual([[6667], [6667], [6666]]);
    expect(e.bases.flat().reduce((s, b) => s + b, 0)).toBe(200000);
    expect(e.lettrages.map((l) => l.partiel)).toEqual([true, true, false]);
    expect(solde('445740', [f.ecriture as Ecriture, ...e.ecritures])).toBe(0);
    expect(solde('445710', e.ecritures)).toBe(20000);
  });
  it('v06', () => {
    const option: ProfilVente = { ...reel, optionDebitsDepuis: '2026-10-01' };
    const apres = facturer(piece(200000, 20000, { dateOperation: '2026-11-02' }), [ligne(200000, 20000, T9, 'service', '706')], option);
    expect(resume(apres.ecriture)).toEqual([['411', 220000, 0], ['706', 0, 200000], ['445710', 0, 20000]]);
    expect(apres.lignesTva[0]).toMatchObject({ cas: 'A', dateExigibilite: '2026-11-03' });
    const avant = facturer(piece(200000, 20000, { dateOperation: '2026-09-02' }), [ligne(200000, 20000, T9, 'service', '706')], option);
    expect(resume(avant.ecriture)[2]).toEqual(['445740', 0, 20000]);
    expect(avant.lignesTva[0]).toMatchObject({ cas: 'B', dateExigibilite: null });
  });
  it('v07', () => {
    const f = facturer(piece(150000, 20000), [ligne(100000, 10000, T9, 'service', '706'), ligne(50000, 10000, T19, 'service', '706')]);
    expect(resume(f.ecriture)).toEqual([['411', 170000, 0], ['706', 0, 150000], ['445740', 0, 10000], ['445740', 0, 10000]]);
    expect(f.lignesTva.map((t) => [t.tauxPdb, t.baseCentimes, t.tvaCentimes])).toEqual([[T9, 100000, 10000], [T19, 50000, 10000]]);
    const e = encaisser(f, 170000, [85000]);
    expect(e.tva).toEqual([[5000, 5000]]);
    expect(e.bases).toEqual([[50000, 25000]]);
    expect(solde('445740', [f.ecriture as Ecriture, ...e.ecritures])).toBe(10000);
  });
  it('v08', () => {
    const f = facturer(piece(33333, 6400), [ligne(33333, 6400, T19, 'service', '706')]);
    expect(controleTotaux({ ht: c(33333), tva: c(6400), ttc: c(39733) })).toEqual({ ok: true, ecart: 0 });
    const [r] = controleTvaParTaux([{ tauxPdb: T19, baseCentimes: c(33333), tvaLueCentimes: c(6400) }], [T6, T9, T19]);
    expect(r).toMatchObject({ tauxPdb: T19, tvaAttendue: 6333, tvaRetenue: 6400, ecart: 67, anomalie: 'A2' });
    expect(resume(f.ecriture)).toEqual([['411', 39733, 0], ['706', 0, 33333], ['445740', 0, 6400]]);
    expect(f.lignesTva[0]?.tvaCentimes).toBe(6400);
  });
  it('v09', () => {
    const f = facturer(piece(80000, 0), [ligne(80000, 0, null, 'service', '706')], { tenue: 'livre_recettes', regimeTva: 'franchise', optionDebitsDepuis: null });
    expect(f).toMatchObject({ ecriture: null, lignesTva: [], motif: 'livre_recettes' });
    const l = ligneLivreRecettes({ dateEncaissement: '2026-11-10', client: 'Client Inventé', montant: c(80000), mode: 'virement', numeroFacture: 'F-1' });
    expect(l).toMatchObject({ dateEncaissement: '2026-11-10', montant: 80000, numeroFacture: 'F-1' });
    expect(caEncaisseAnnee([l], 2026)).toBe(80000);
    expect(caEncaisseAnnee([l], 2027)).toBe(0);
  });
  it('v10', () => {
    const r = facturer(piece(50000, 0), [ligne(50000, 0, null, 'service', '706')], { tenue: 'partie_double', regimeTva: 'franchise', optionDebitsDepuis: null });
    expect(resume(r.ecriture)).toEqual([['411', 50000, 0], ['706', 0, 50000]]);
    expect(r.lignesTva).toEqual([]);
    expect(r.cartes).toEqual([]);
  });
  it('v11', () => {
    const r = facturer(piece(50000, 2500), [ligne(50000, 2500, T6, 'service', '706')], { tenue: 'partie_double', regimeTva: 'franchise', optionDebitsDepuis: null });
    expect(r).toMatchObject({ ecriture: null, lignesTva: [], cartes: ['A16'], motif: 'tva_en_franchise_a_verifier' });
  });
  it('v12', () => {
    const seuil = { valeur: c(4000000), statut: 'valide' as const };
    const r = depassementSeuil({ caAvant: c(3950000), montant: c(80000), seuil });
    expect(r).toEqual({ depasse: true, propositionChangementRegime: true, aVerifier: false, parametreAbsent: false });
    expect(depassementSeuil({ caAvant: c(3920000), montant: c(80000), seuil }).propositionChangementRegime).toBe(false);
    const f = facturer(piece(80000, 0), [ligne(80000, 0, null, 'service', '706')], { tenue: 'livre_recettes', regimeTva: 'franchise', optionDebitsDepuis: null });
    expect(f.ecriture).toBeNull();
  });
  it('v13', () => {
    const r = qualifierAcompte({ id: 'ac-1', journal: 'BQ', date: '2026-11-05', ttc: c(119000), confirmePar: 'personne-exemple', clientAuxiliaire: 'CLIENT1', tauxPdb: T19, parametreExigibilite: paramValide, comptes });
    expect(r.etat).toBe('propose');
    expect(resume(r.ecriture)).toEqual([['512', 119000, 0], ['419100', 0, 100000], ['445710', 0, 19000]]);
    expect(r.lignesTva).toEqual([{ compte: '445710', tauxPdb: T19, baseCentimes: 100000, tvaCentimes: 19000, codeTva: 'COLLECTEE', cas: 'B', sens: 'acompte', dateExigibilite: '2026-11-05', pieceId: 'ac-1' }]);
    expect(qualifierAcompte({ id: 'ac-2', journal: 'BQ', date: '2026-11-05', ttc: c(119000), tauxPdb: T19, parametreExigibilite: paramValide, comptes })).toMatchObject({ etat: 'a_qualifier', ecriture: null });
  });
  it('v14', () => {
    const ac = qualifierAcompte({ id: 'ac-1', journal: 'BQ', date: '2026-11-05', ttc: c(119000), confirmePar: 'personne-exemple', clientAuxiliaire: 'CLIENT1', tauxPdb: T19, parametreExigibilite: paramValide, comptes });
    const f = facturer(piece(500000, 95000), [ligne(500000, 95000, T19, 'service', '706')]);
    const imp = ecritureImputation({ id: 'imp-1', journal: 'OD', date: '2026-11-20', acomptes: [{ id: 'ac-1', ht: c(100000), tva: c(19000), ttc: c(119000), tauxPdb: T19 }], casFacture: 'B', comptes, auxiliaire: 'CLIENT1' });
    expect(resume(imp.ecriture)).toEqual([['419100', 100000, 0], ['445740', 19000, 0], ['411', 0, 119000]]);
    const tout = [ac.ecriture as Ecriture, f.ecriture as Ecriture, imp.ecriture];
    expect(-solde('411', tout)).toBe(476000);
    expect(solde('419100', tout)).toBe(0);
    expect(solde('445710', tout)).toBe(19000);
    expect(solde('445740', tout)).toBe(76000);
    expect(controleSolde({ totalTtc: c(595000), acomptesTtc: [c(119000)], soldeTtc: c(476000) })).toEqual({ ok: true, ecart: 0 });
  });
  it('v15', () => {
    const f = facturer(piece(500000, 95000), [ligne(500000, 95000, T19, 'service', '706')]);
    const imp = ecritureImputation({ id: 'imp-1', journal: 'OD', date: '2026-11-20', acomptes: [{ id: 'ac-1', ht: c(100000), tva: c(19000), ttc: c(119000), tauxPdb: T19 }], casFacture: 'B', comptes, auxiliaire: 'CLIENT1' });
    const r = ecritureEncaissement({
      id: 'ec-e1', journal: 'BQ', date: '2026-12-01', montant: c(476000), comptes, codesLettrageExistants: [],
      facture: { id: 'f1', auxiliaire: 'CLIENT1', cas: 'B', ttc: c(595000), dejaEncaisse: c(119000), parTaux: [{ tauxPdb: T19, tvaInitiale: c(95000), baseInitiale: c(500000), tvaDejaExigible: c(19000), baseDejaExigible: c(100000) }], ligneClient: { id: 'f1-1', compte: '411', auxiliaire: 'CLIENT1', debit: c(476000), credit: c(0) } },
    });
    expect(resume(r.ecriture)).toEqual([['512', 476000, 0], ['411', 0, 476000], ['445740', 76000, 0], ['445710', 0, 76000]]);
    expect(r.lignesTva.map((t) => [t.baseCentimes, t.tvaCentimes, t.dateExigibilite])).toEqual([[400000, 76000, '2026-12-01']]);
    expect(r.resteDu).toBe(0);
    expect(r.cartes).toEqual([]);
    const tout = [f.ecriture as Ecriture, imp.ecriture, r.ecriture];
    expect(solde('445740', tout)).toBe(0);
    expect(solde('411', tout)).toBe(0);
  });
  it('v16', () => {
    const f = facturer(piece(10000, 550), [ligne(10000, 550, T6, 'bien', '707')]);
    const avoir = piece(10000, 550, { id: 'av1', type: 'avoir', numero: 'AV-1', dateFacture: '2026-11-15', factureOrigineId: 'f1' });
    const r = ecritureAvoir({ id: 'ec-a1', journal: 'VE', avoir, lignes: [ligne(10000, 550, T6, 'bien', '707')], casParTaux: { [T6]: 'A' }, tvaEnAttenteParTaux: {}, resteDuFacture: c(10550), comptes, auxiliaire: 'CLIENT1' });
    expect(resume(r.ecriture)).toEqual([['707', 10000, 0], ['445710', 550, 0], ['411', 0, 10550]]);
    expect(r.lignesTva).toEqual([{ compte: '445710', tauxPdb: T6, baseCentimes: 10000, tvaCentimes: 550, codeTva: 'COLLECTEE', cas: 'A', sens: 'avoir', dateExigibilite: '2026-11-15', pieceId: 'av1' }]);
    expect(r.cartes).toEqual([]);
    const tout = [f.ecriture as Ecriture, r.ecriture];
    expect(solde('411', tout)).toBe(0);
    expect(solde('445710', tout)).toBe(0);
    expect(solde('707', tout)).toBe(0);
  });
});
