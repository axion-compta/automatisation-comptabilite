import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import type { StatutEcriture } from '../../ecritures/modele.js';
import { indicateursDuMois } from '../indicateurs.js';
import type { ComptesVente, LigneTvaVente } from '../types.js';

const comptes: ComptesVente = { client: 'C1', tvaCollectee: 'T1', tvaEnAttente: 'T2', avancesClients: 'A1', banque: 'B1' };
const P = 'P';
const c = (n: number): Centimes => centimes(n);
const ec = (id: string, pieceId: string, date: string, statut: StatutEcriture, compte: string, debit: number, credit: number) => ({
  id,
  pieceId,
  journal: 'VE',
  date,
  statut,
  lignes: [{ compte, libelle: 'x', debit: c(debit), credit: c(credit) }],
});
const tva = (pieceId: string, dateExigibilite: string | null, tvaCentimes: number, statutEcriture: StatutEcriture = 'valide', sens: LigneTvaVente['sens'] = 'vente', compte = 'T1') => ({
  compte,
  tauxPdb: 900,
  baseCentimes: c(0),
  tvaCentimes: c(tvaCentimes),
  codeTva: 'COLLECTEE' as const,
  cas: 'A' as const,
  sens,
  dateExigibilite,
  pieceId,
  statutEcriture,
});
const base = { mois: '2026-10', ecritures: [], lignesTva: [], creances: [], comptes, prefixeProduits: P, regimeConfirme: true };
const run = (o: Partial<Parameters<typeof indicateursDuMois>[0]> = {}) => indicateursDuMois({ ...base, ...o });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('indicateurs ventes', () => {
  it('v29-chiffre-d-affaires-net-des-avoirs', () => {
    const ecritures = [ec('e2', 'V16', '2026-10-20', 'valide', 'P7', 12000, 0), ec('e1', 'V01', '2026-10-05', 'valide', 'P7', 0, 100000), ec('e0', 'V00', '2026-09-30', 'valide', 'P7', 0, 5000), ec('e9', 'V09', '2026-11-01', 'valide', 'P7', 0, 7000), ec('ex', 'V10', '2026-10-06', 'valide', 'Z7', 0, 300)];
    const r = run({ ecritures });
    expect(r.chiffreAffaires).toEqual({ montant: 88000, pieces: ['V01', 'V16'] });
    expect(run({ ecritures: [...ecritures].reverse() }).chiffreAffaires).toEqual(r.chiffreAffaires);
    expect(r.provisoire).toBe(false);
    const net = run({ ecritures: [ec('a', 'V01', '2026-10-05', 'valide', 'P7', 0, 100000), ec('b', 'V16', '2026-10-20', 'valide', 'P7', 10000, 0)] });
    expect(net.chiffreAffaires).toEqual({ montant: 90000, pieces: ['V01', 'V16'] });
  });

  it('brouillons-exclus', () => {
    const r = run({ ecritures: [ec('a', 'V1', '2026-10-05', 'brouillon', 'P7', 0, 500), ec('b', 'V2', '2026-10-05', 'propose', 'P7', 0, 700), ec('c', 'V3', '2026-10-05', 'brouillon', 'T2', 0, 900)], lignesTva: [tva('V1', '2026-10-05', 90, 'brouillon'), tva('V2', '2026-10-05', 60, 'propose')], avecPropositions: true });
    expect(r.chiffreAffaires).toEqual({ montant: 700, pieces: ['V2'] });
    expect(r.tvaEnAttente).toEqual({ montant: 0, pieces: [] });
    expect(r.tvaCollectee).toEqual({ montant: 60, pieces: ['V2'] });
    const sans = run({ ecritures: [ec('a', 'V1', '2026-10-05', 'brouillon', 'P7', 0, 500)] });
    expect(sans.chiffreAffaires).toEqual({ montant: 0, pieces: [] });
  });

  it('avec-propositions-provisoire', () => {
    const ecritures = [ec('a', 'V1', '2026-10-05', 'valide', 'P7', 0, 1000), ec('b', 'V2', '2026-10-06', 'propose', 'P7', 0, 400)];
    const lignesTva = [tva('V1', '2026-10-05', 90), tva('V2', '2026-10-06', 36)];
    const sans = run({ ecritures, lignesTva });
    expect(sans.provisoire).toBe(false);
    expect(sans.chiffreAffaires).toEqual({ montant: 1000, pieces: ['V1'] });
    expect(run({ ecritures, lignesTva, avecPropositions: false }).provisoire).toBe(false);
    const avec = run({ ecritures: [ecritures[1]!, ecritures[0]!], lignesTva, avecPropositions: true });
    expect(avec.provisoire).toBe(true);
    expect(avec.chiffreAffaires).toEqual({ montant: 1400, pieces: ['V1', 'V2'] });
    expect(avec.tvaCollectee).toEqual({ montant: 126, pieces: ['V1', 'V2'] });
  });

  it('tva-par-date-d-exigibilite-pas-date-d-ecriture', () => {
    const lignesTva = [tva('V28', '2026-11-03', 190), tva('V30', '2026-10-31', 100), tva('V31', '2026-10-01', 50), tva('V32', '2026-09-30', 70), tva('V33', null, 80), tva('V34', '2026-10-10', 40, 'valide', 'vente', 'Z9'), tva('V35', '2026-10-12', 30, 'valide', 'avoir'), tva('V36', '2026-10-13', -20, 'valide', 'avoir')];
    const ecritures = [ec('e', 'V28', '2026-10-15', 'valide', 'T1', 0, 190)];
    const r = run({ lignesTva, ecritures });
    expect(r.tvaCollectee).toEqual({ montant: 100, pieces: ['V30', 'V31', 'V35', 'V36'] });
    expect(run({ lignesTva: [...lignesTva].reverse(), ecritures }).tvaCollectee).toEqual(r.tvaCollectee);
    expect(run({ mois: '2026-11', lignesTva }).tvaCollectee).toEqual({ montant: 190, pieces: ['V28'] });
    expect(code(() => run({ lignesTva: [tva('V1', '2026-13-01', 1)] }))).toBe('date_invalide');
    expect(code(() => run({ ecritures: [ec('e', 'V1', 'hier', 'valide', 'P7', 0, 1)] }))).toBe('date_invalide');
  });

  it('regime-non-confirme-aucun-montant', () => {
    const r = run({ regimeConfirme: false, lignesTva: [tva('V1', '2026-10-05', 90)] });
    expect(r.tvaCollectee).toEqual({ nonCalculee: 'regime_a_confirmer' });
    expect('montant' in r.tvaCollectee).toBe(false);
    expect('montant' in run().tvaCollectee).toBe(true);
  });

  it('en-retard-somme-et-clients-distincts', () => {
    const creances = [
      { clientId: 'k2', resteDu: c(500), enRetard: true },
      { clientId: 'k1', resteDu: c(300), enRetard: true },
      { clientId: 'k1', resteDu: c(200), enRetard: true },
      { clientId: 'k3', resteDu: c(900), enRetard: false },
    ];
    const r = run({ creances });
    expect(r.enRetard).toEqual({ montant: 1000, pieces: [], clients: 2 });
    expect(r.aEncaisser).toEqual({ montant: 1900, pieces: [] });
    expect(run({ creances: [...creances].reverse() }).enRetard).toEqual(r.enRetard);
    for (const resteDu of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -100]) {
      expect(code(() => run({ creances: [{ clientId: 'k', resteDu: resteDu as Centimes, enRetard: false }] }))).toBe('montant_invalide');
    }
  });

  it('tva-en-attente-solde', () => {
    const ecritures = [ec('a', 'V1', '2026-08-05', 'valide', 'T2', 0, 900), ec('b', 'V2', '2026-10-31', 'valide', 'T2', 200, 0), ec('c', 'V3', '2026-11-01', 'valide', 'T2', 0, 5000), ec('d', 'V4', '2026-10-06', 'valide', 'P7', 0, 300)];
    expect(run({ ecritures }).tvaEnAttente).toEqual({ montant: 700, pieces: ['V1', 'V2'] });
    expect(run({ ecritures: [...ecritures].reverse() }).tvaEnAttente.montant).toBe(700);
  });

  it('ecran-vide-zeros', () => {
    const r = run();
    expect(r).toEqual({
      chiffreAffaires: { montant: 0, pieces: [] },
      aEncaisser: { montant: 0, pieces: [] },
      enRetard: { montant: 0, pieces: [], clients: 0 },
      tvaCollectee: { montant: 0, pieces: [] },
      tvaEnAttente: { montant: 0, pieces: [] },
      provisoire: false,
    });
    expect(Object.is(r.chiffreAffaires.montant, 0)).toBe(true);
    expect(code(() => run({ prefixeProduits: '' }))).toBe('prefixe_invalide');
  });

  it('mois-invalide', () => {
    for (const mois of ['2026-13', '2026-1', '', '2026-00', '26-10', '2026-10-01', ' 2026-10', '2026-10\n']) {
      expect(code(() => run({ mois }))).toBe('mois_invalide');
    }
    for (const mois of ['2026-01', '2026-12']) expect(code(() => run({ mois }))).toBeUndefined();
  });
});
