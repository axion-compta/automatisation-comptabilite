import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { ecritureAvoir, type EntreeEcritureAvoir } from '../ecriture-avoir.js';
import { ecritureFacture } from '../ecriture-facture.js';
import { ErreurVente, type ComptesVente, type LigneVente, type PieceVente } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const piece = (ttc: number): PieceVente => ({
  id: 'av1', type: 'avoir', origine: 'depot', numero: 'AV-1', dateFacture: '2026-11-20',
  htCentimes: c(0), tvaCentimes: c(0), ttcCentimes: c(ttc), statut: 'lue',
});
const ligne = (ht: number, taux: number | null, tva: number, compte = 'P70'): LigneVente => ({
  libelle: 'x', htCentimes: c(ht), tauxPdb: taux, tvaLueCentimes: c(tva), nature: 'service', compteProduit: compte, codeTva: 'COLLECTEE',
});
const faire = (extra: Partial<EntreeEcritureAvoir> & { ttc?: number }) => {
  const { ttc, ...reste } = extra;
  return ecritureAvoir({
    id: 'e1', journal: 'VT', avoir: piece(ttc ?? 55000), lignes: [ligne(50000, 600, 5000, 'P706')],
    casParTaux: { 600: 'B' }, tvaEnAttenteParTaux: { 600: c(0) }, resteDuFacture: c(100000), comptes, auxiliaire: 'CLIENT1', ...reste,
  });
};
const resume = (r: ReturnType<typeof faire>) => r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit]);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('ecriture-avoir', () => {
  it('v16-avoir-cas-a', () => {
    const r = faire({ ttc: 105500, lignes: [ligne(100000, 600, 5500)], casParTaux: { 600: 'A' }, resteDuFacture: c(200000) });
    expect(resume(r)).toEqual([['P70', 100000, 0], ['COL', 5500, 0], ['CLI', 0, 105500]]);
    expect(r.ecriture.lignes[2]?.auxiliaire).toBe('CLIENT1');
    expect(r.ecriture).toMatchObject({ statut: 'propose', date: '2026-11-20', journal: 'VT', id: 'e1' });
    expect(r.cartes).toEqual([]);
    expect(r.lignesTva).toEqual([{ compte: 'COL', tauxPdb: 600, baseCentimes: 100000, tvaCentimes: 5500, codeTva: 'COLLECTEE', cas: 'A', sens: 'avoir', dateExigibilite: '2026-11-20', pieceId: 'av1' }]);
  });
  it('avoir-cas-b-facture-non-payee', () => {
    const r = faire({ tvaEnAttenteParTaux: { 600: c(20000) } });
    expect(resume(r)).toEqual([['P706', 50000, 0], ['ATT', 5000, 0], ['CLI', 0, 55000]]);
    expect(r.lignesTva).toEqual([{ compte: 'ATT', tauxPdb: 600, baseCentimes: 50000, tvaCentimes: 5000, codeTva: 'COLLECTEE', cas: 'B', sens: 'avoir', dateExigibilite: null, pieceId: 'av1' }]);
  });
  it('avoir-cas-b-payee-en-partie-exemple-spec', () => {
    const r = faire({ tvaEnAttenteParTaux: { 600: c(10000) }, resteDuFacture: c(110000) });
    expect(resume(r)).toEqual([['P706', 50000, 0], ['ATT', 5000, 0], ['CLI', 0, 55000]]);
    expect(r.cartes).toEqual([]);
  });
  it('avoir-cas-b-surplus-en-collectee', () => {
    const r = faire({ tvaEnAttenteParTaux: { 600: c(3000) } });
    expect(resume(r)).toEqual([['P706', 50000, 0], ['ATT', 3000, 0], ['COL', 2000, 0], ['CLI', 0, 55000]]);
    expect(r.lignesTva.map((l) => [l.compte, l.tvaCentimes, l.baseCentimes, l.dateExigibilite, l.cas])).toEqual([
      ['ATT', 3000, 30000, null, 'B'], ['COL', 2000, 20000, '2026-11-20', 'B'],
    ]);
  });
  it('avoir-cas-b-facture-payee', () => {
    const r = faire({ tvaEnAttenteParTaux: { 600: c(0) } });
    expect(resume(r)).toEqual([['P706', 50000, 0], ['COL', 5000, 0], ['CLI', 0, 55000]]);
    expect(r.lignesTva).toEqual([{ compte: 'COL', tauxPdb: 600, baseCentimes: 50000, tvaCentimes: 5000, codeTva: 'COLLECTEE', cas: 'B', sens: 'avoir', dateExigibilite: '2026-11-20', pieceId: 'av1' }]);
  });
  it('avoir-superieur-au-reste-du-a13', () => {
    const r = faire({ resteDuFacture: c(54999) });
    expect(r.cartes).toEqual(['A13']);
    expect(r.ecriture.statut).toBe('propose');
    expect(faire({ resteDuFacture: c(55000) }).cartes).toEqual([]);
    expect(faire({ resteDuFacture: c(0) }).cartes).toEqual(['A13']);
  });
  it('avoir-non-rattache-a12-brouillon', () => {
    const r = faire({ resteDuFacture: null });
    expect(r.cartes).toEqual(['A12']);
    expect(r.ecriture.statut).toBe('brouillon');
    expect(faire({ auxiliaire: '' }).ecriture.statut).toBe('brouillon');
    const sans = ecritureAvoir({ id: 'e1', journal: 'VT', avoir: piece(55000), lignes: [ligne(50000, 600, 5000)], casParTaux: { 600: 'A' }, tvaEnAttenteParTaux: {}, resteDuFacture: c(1), comptes });
    expect(sans.ecriture.statut).toBe('brouillon');
    expect(sans.ecriture.lignes.some((l) => l.auxiliaire !== undefined)).toBe(false);
    expect(faire({ ttc: 55001 }).cartes).toEqual(['A1']);
  });
  it('avoir-total-solde-le-client', () => {
    const lignes = [ligne(200000, 1900, 20000, 'P706')];
    const f = ecritureFacture({ id: 'f', journal: 'VT', piece: { ...piece(220000), type: 'facture', id: 'f1' }, lignes, profil: { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null }, comptes, auxiliaire: 'CLIENT1' });
    const a = faire({ ttc: 220000, lignes, casParTaux: { 1900: 'B' }, tvaEnAttenteParTaux: { 1900: c(20000) }, resteDuFacture: c(220000) });
    const net = (compte: string) => [f.ecriture, a.ecriture].flatMap((e) => e?.lignes ?? []).filter((l) => l.compte === compte).reduce((s, l) => s + l.debit - l.credit, 0);
    expect(net('CLI')).toBe(0);
    expect(net('ATT')).toBe(0);
    expect(net('P706')).toBe(0);
    expect(a.cartes).toEqual([]);
  });
  it('plusieurs-taux-et-comptes-ordre-stable', () => {
    const lignes = [ligne(100000, 1900, 19000, 'P2'), ligne(50000, 900, 4500, 'P1'), ligne(10000, 900, 900, 'P1'), ligne(7000, null, 0, 'P3')];
    const entree = { ttc: 191400, lignes, casParTaux: { 900: 'A', 1900: 'B' } as const, tvaEnAttenteParTaux: { 1900: c(5000) } };
    const r = faire(entree);
    expect(resume(r)).toEqual([['P1', 60000, 0], ['P2', 100000, 0], ['P3', 7000, 0], ['COL', 5400, 0], ['ATT', 5000, 0], ['COL', 14000, 0], ['CLI', 0, 191400]]);
    expect(r.lignesTva.map((l) => [l.tauxPdb, l.compte])).toEqual([[900, 'COL'], [1900, 'ATT'], [1900, 'COL']]);
    expect(faire({ ...entree, lignes: [...lignes].reverse() })).toEqual(r);
    expect(verifierEquilibre(r.ecriture).equilibree).toBe(true);
  });
  it('entrees-invalides', () => {
    for (const v of [-1, NaN, Infinity, 1.5]) {
      expect(code(() => faire({ lignes: [ligne(v, 600, 5000)] }))).toBe('montant_invalide');
      expect(code(() => faire({ lignes: [ligne(50000, 600, v)] }))).toBe('montant_invalide');
      expect(code(() => faire({ ttc: v }))).toBe('montant_invalide');
      expect(code(() => faire({ resteDuFacture: c(v) }))).toBe('montant_invalide');
      expect(code(() => faire({ tvaEnAttenteParTaux: { 600: c(v) } }))).toBe('montant_invalide');
      expect(code(() => faire({ lignes: [ligne(50000, v, 5000)] }))).toBe('taux_invalide');
    }
    expect(code(() => faire({ casParTaux: {} }))).toBe('taux_sans_cas');
    expect(code(() => faire({ casParTaux: { 600: 'C' as 'A' } }))).toBe('taux_sans_cas');
    expect(code(() => faire({ tvaEnAttenteParTaux: {} }))).toBe('montant_invalide');
    expect(code(() => faire({ lignes: [] }))).toBe('aucune_ligne');
    expect(code(() => faire({ lignes: [ligne(0, 600, 0)], ttc: 0 }))).toBe('montant_nul');
    expect(code(() => faire({ lignes: [ligne(50000, null, 5000)] }))).toBe('taux_invalide');
    expect(code(() => faire({ lignes: [{ ...ligne(50000, 600, 5000), compteProduit: '' }] }))).toBe('compte_produit_manquant');
    expect(code(() => faire({ avoir: { ...piece(55000), dateFacture: '2026-13-40' } }))).toBe('date_invalide');
  });
});
