// Cas chiffrés V17 à V30 (spec 10, fichier 06) rejoués sur les fonctions pures. Taux et dates de paramètre INVENTÉS ; montants en centimes.
// V23 (Sirene et VIES) et V30 (aucune route d'émission) ne sont pas rejoués ici.
import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import type { StatutEcriture } from '../../ecritures/modele.js';
import type { ParametreLegal } from '../../../../parametres/src/au-jour.js';
import { qualifierAcompte } from '../acompte.js';
import { balanceAgee } from '../balance-agee.js';
import { aCreer, cleDedoublonnage, dedoublonner } from '../dedoublonnage.js';
import { aEmettreParPlateforme } from '../emission-electronique.js';
import { ecritureEncaissement } from '../ecriture-encaissement.js';
import { importer } from '../import-pieces.js';
import { indicateursDuMois } from '../indicateurs.js';
import { periodeDeTva } from '../periode.js';
import { rattacherAvoir } from '../rattachement-avoir.js';
import { analyserSeries, type PieceSerie } from '../series.js';
import type { ComptesVente } from '../types.js';

const c = (n: number): Centimes => centimes(n);
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const T9 = 900;
const T19 = 1900;
const MAX_TROUS = 10;
const BORNES = [30, 60, 90];
const SIREN = '123456782';
const piece = (id: string, numero: string, dateFacture = '2026-11-03', ttc = 1200): PieceSerie => ({ id, numero, dateFacture, ttc: c(ttc) });
const serie = (pieces: PieceSerie[]) => analyserSeries(pieces, { maxTrous: MAX_TROUS })[0] as ReturnType<typeof analyserSeries>[number];

describe('cas V17 à V30 de la spec 10', () => {
  it('v17-avoir-sans-reference-a-rattacher', () => {
    const f = (id: string, numero: string, clientId: string, ttc: number) => ({ id, numero, clientId, ttc: c(ttc), resteDu: c(ttc) });
    const factures = [f('f1', 'F-2026-0101', 'cli-a', 12000), f('f2', 'F-2026-0102', 'cli-b', 5000)];
    expect(rattacherAvoir({ ttc: c(8000), clientId: 'cli-c' }, factures)).toEqual({ factureId: null, par: null, cartes: ['A12'] });
    expect(rattacherAvoir({ ttc: c(8000) }, factures).cartes).toEqual(['A12']);
    expect(rattacherAvoir({ ttc: c(8000), clientId: 'cli-c', referenceLue: 'F-2026-0101' }, factures).factureId).toBe('f1');
  });

  it('v18-trou-0042-avant-et-apres-depot', () => {
    const avant = serie([piece('a', 'F-2026-0041'), piece('c', 'F-2026-0043')]);
    expect(avant).toMatchObject({ serie: 'F-2026-', trous: [42], dernierOrdreVu: 43 });
    const apres = serie([piece('a', 'F-2026-0041'), piece('c', 'F-2026-0043'), piece('b', 'F-2026-0042')]);
    expect(apres.trous).toEqual([]);
  });

  it('v19-meme-numero-montants-differents', () => {
    const r = serie([piece('b', 'F-0005', '2026-11-03', 2400), piece('a', 'F-0005', '2026-11-03', 1200)]);
    expect(r.doublons).toEqual([{ ordre: 5, ids: ['a', 'b'] }]);
    expect(serie([piece('a', 'F-0005'), piece('b', 'F-0005')]).doublons).toEqual([]);
  });

  it('v20-deux-canaux-une-seule-piece', () => {
    const cle = cleDedoublonnage({ sirenVendeur: SIREN, numero: 'F-2026-0047', dateFacture: '2026-11-03', ttc: c(12000) }) as string;
    const r = dedoublonner([
      { id: 'plateforme', recuLe: '2026-11-04T08:00:00Z', cle },
      { id: 'depot', recuLe: '2026-11-03T08:00:00Z', cle },
    ]);
    expect(r).toEqual({ gardees: ['depot'], doublons: [{ id: 'plateforme', doublonDe: 'depot' }] });
  });

  it('v21-date-qui-recule', () => {
    const r = serie([piece('a', 'F-0001', '2026-11-10'), piece('b', 'F-0002', '2026-11-09'), piece('c', 'F-0003', '2026-11-11')]);
    expect(r.datesQuiReculent).toEqual([{ avant: 'a', apres: 'b' }]);
  });

  it('v22-cinq-mille-dont-dix-sans-numero-puis-reimport', () => {
    const opt = { sirenSociete: SIREN, separateurDecimal: ',', formatDate: 'AAAA-MM-JJ' } as const;
    let graine = 7;
    const suivant = (): number => (graine = (graine * 16807) % 2147483647);
    const objets = Array.from({ length: 5000 }, (_, i) => {
      const ht = 1 + (suivant() % 900);
      return { numero: i % 500 === 0 ? '' : `F-${String(i)}`, date: '2026-11-03', client: 'Client Fictif', ht: `${String(ht)},00`, tva: '0,00', ttc: `${String(ht)},00` };
    });
    const debut = Date.now();
    const premier = importer(new Set(), objets, opt);
    expect(premier.creees).toHaveLength(4990);
    expect(premier.rejets).toHaveLength(10);
    expect(premier.rejets.every((x) => x.raison === 'numero_absent')).toBe(true);
    const cles = new Set(premier.creees.map((p) => p.cle as string));
    const second = importer(cles, objets, opt);
    expect(second.creees).toEqual([]);
    expect(second.dejaPresentes).toBe(4990);
    expect(Date.now() - debut).toBeLessThan(2000);
    expect(aCreer(cles, [{ cle: [...cles][0] as string }])).toEqual([]);
  });

  it('v24-balance-agee-deux-tranches-et-ecart-d-un-centime', () => {
    const cr = (factureId: string, resteDu: number, echeance: string) => ({ factureId, clientId: 'cli-a', resteDu: c(resteDu), echeance, dateFacture: '2026-01-05' });
    const creances = [cr('f1', 220000, '2026-11-20'), cr('f2', 120000, '2026-10-16')];
    const r = balanceAgee({ creances, dateReference: '2026-11-30', bornesJours: BORNES, solde411: c(340000) });
    expect(r.tranches.map((t) => t.total)).toEqual([220000, 120000, 0, 0]);
    expect(r.total).toBe(340000);
    expect(r.ecart).toBe(0);
    expect(r.alerte).toBeUndefined();
    const ecart = balanceAgee({ creances, dateReference: '2026-11-30', bornesJours: BORNES, solde411: c(340001) });
    expect(ecart.alerte).toBe('A19');
  });

  it('v25-trop-percu-carte-a18-jamais-un-produit', () => {
    const ligneClient = { id: 'f1-1', compte: 'CLI', auxiliaire: 'CLIENT1', debit: c(100000), credit: c(0) };
    const r = ecritureEncaissement({
      id: 'e1', journal: 'BQ', date: '2026-11-20', montant: c(120000), comptes, codesLettrageExistants: [],
      facture: { id: 'f1', auxiliaire: 'CLIENT1', cas: 'A', ttc: c(100000), dejaEncaisse: c(0), parTaux: [], ligneClient },
    });
    expect(r.cartes).toEqual(['A18']);
    expect(r.ecriture.lignes.some((l) => l.compte.startsWith('7'))).toBe(false);
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['BQ', 120000, 0], ['CLI', 0, 120000]]);
  });

  it('v26-acompte-non-confirme-a-qualifier-zero-produit', () => {
    const parametre: ParametreLegal = { cle: 'cle.inventee.acompte', pays: 'FR', valeur: 'x', effet_debut: '2026-01-01', effet_fin: null, statut: 'valide', source: 'Source inventée', date_releve: '2026-06-01' };
    const base = { id: 'ac-1', journal: 'BQ', date: '2026-11-05', ttc: c(119000), tauxPdb: T19, parametreExigibilite: parametre, comptes };
    const r = qualifierAcompte({ ...base, clientAuxiliaire: 'CLI-EXEMPLE' });
    expect(r).toMatchObject({ etat: 'a_qualifier', ecriture: null, lignesTva: [] });
    const confirme = qualifierAcompte({ ...base, confirmePar: 'personne-exemple', clientAuxiliaire: 'CLI-EXEMPLE' });
    expect(confirme.etat).toBe('propose');
    expect(confirme.ecriture?.lignes.some((l) => l.compte.startsWith('7'))).toBe(false);
  });

  it('v27-signal-plateforme-agreee-a-partir-de-la-date-du-parametre', () => {
    const DATE = '2031-03-01';
    const entree = { paysClient: 'FR', natureClient: 'professionnel', origine: 'depot', parametre: { valeur: DATE, statut: 'valide' } } as const;
    expect(aEmettreParPlateforme({ ...entree, dateFacture: '2031-02-28' }).signal).toBe(false);
    expect(aEmettreParPlateforme({ ...entree, dateFacture: DATE })).toEqual({ signal: true, aVerifier: false, parametreAbsent: false });
    expect(aEmettreParPlateforme({ ...entree, dateFacture: DATE, origine: 'plateforme_agreee' }).signal).toBe(false);
  });

  it('v28-exigibilite-du-28-10-octobre-depose-carte', () => {
    expect(periodeDeTva({ dateExigibilite: '2026-10-28', periodesDeposees: ['2026-09'] })).toEqual({ periode: '2026-10', aDeclarerSurPeriodeOuverte: false });
    expect(periodeDeTva({ dateExigibilite: '2026-10-28', periodesDeposees: ['2026-09', '2026-10'] })).toEqual({ periode: '2026-10', aDeclarerSurPeriodeOuverte: true });
  });

  it('v29-chiffre-d-affaires-d-octobre-900-et-deux-pieces', () => {
    const ec = (id: string, pieceId: string, date: string, debit: number, credit: number) => ({
      id, pieceId, journal: 'VE', date, statut: 'valide' as StatutEcriture, lignes: [{ compte: 'P7', libelle: 'x', debit: c(debit), credit: c(credit) }],
    });
    const base = { mois: '2026-10', ecritures: [ec('e1', 'V01', '2026-10-05', 0, 100000), ec('e2', 'V16', '2026-10-20', 10000, 0)], lignesTva: [], creances: [], comptes, prefixeProduits: 'P', regimeConfirme: true };
    const r = indicateursDuMois(base);
    expect(r.chiffreAffaires).toEqual({ montant: 90000, pieces: ['V01', 'V16'] });
    expect(r.provisoire).toBe(false);
    const tva = { compte: 'COL', tauxPdb: T9, baseCentimes: c(0), tvaCentimes: c(90), codeTva: 'COLLECTEE' as const, cas: 'A' as const, sens: 'vente' as const, pieceId: 'V01', statutEcriture: 'valide' as StatutEcriture };
    const nov = indicateursDuMois({ ...base, lignesTva: [{ ...tva, dateExigibilite: '2026-11-02' }] });
    expect(nov.tvaCollectee).toEqual({ montant: 0, pieces: [] });
  });

  it.todo('v23 : Sirene et VIES, bloqué par L10-T53');
  it.todo('v30 : couvert par L10-T42');
});
