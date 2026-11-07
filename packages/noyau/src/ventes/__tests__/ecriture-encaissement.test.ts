import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { ErreurLettrage, type LigneALettrer } from '../../ecritures/lettrage.js';
import { ecritureEncaissement, type EntreeEcritureEncaissement } from '../ecriture-encaissement.js';
import { ErreurVente, type ComptesVente } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const taux = (tva: number, base: number, deja = 0, tauxPdb = 1900) => ({ tauxPdb, tvaInitiale: c(tva), baseInitiale: c(base), tvaDejaExigible: c(deja), baseDejaExigible: c(deja * 10) });
const ligneClient = (debit: number, extra: Partial<LigneALettrer> = {}): LigneALettrer => ({ id: 'f1-1', compte: 'CLI', auxiliaire: 'CLIENT1', debit: c(debit), credit: c(0), ...extra });
const entree = (montant: number, cas: 'A' | 'B' | 'C' = 'B', extra: Partial<EntreeEcritureEncaissement['facture']> = {}, ttc = 220000): EntreeEcritureEncaissement => ({
  id: 'e1', journal: 'BQ', date: '2026-11-20', montant: c(montant), comptes, codesLettrageExistants: [],
  facture: { id: 'f1', auxiliaire: 'CLIENT1', cas, ttc: c(ttc), dejaEncaisse: c(0), parTaux: [taux(20000, 200000)], ligneClient: ligneClient(ttc), ...extra },
});
const resume = (e: EntreeEcritureEncaissement) => ecritureEncaissement(e).ecriture.lignes.map((l) => [l.compte, l.debit, l.credit]);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente || e instanceof ErreurLettrage ? e.code : 'autre';
  }
  return undefined;
};

describe('ecriture-encaissement', () => {
  it('v03-encaissement-total-cas-b', () => {
    const r = ecritureEncaissement(entree(220000));
    expect(resume(entree(220000))).toEqual([['BQ', 220000, 0], ['CLI', 0, 220000], ['ATT', 20000, 0], ['COL', 0, 20000]]);
    expect(r.ecriture).toMatchObject({ id: 'e1', journal: 'BQ', date: '2026-11-20', statut: 'propose' });
    expect(r.ecriture.lignes[1]?.auxiliaire).toBe('CLIENT1');
    expect(r.lignesTva).toEqual([{ compte: 'COL', tauxPdb: 1900, baseCentimes: 200000, tvaCentimes: 20000, codeTva: 'COLLECTEE', cas: 'B', sens: 'vente', dateExigibilite: '2026-11-20', pieceId: 'f1' }]);
    expect(r.lettrage).toMatchObject({ code: 'A', partiel: false, reste: 0 });
    expect(r.lettrage.liens.map((l) => l.ligneId)).toEqual(['f1-1', 'e1-1']);
    expect(r.resteDu).toBe(0);
    expect(r.cartes).toEqual([]);
  });
  it('v04-encaissement-partiel-lettrage-partiel', () => {
    const r = ecritureEncaissement(entree(110000));
    expect(resume(entree(110000))).toEqual([['BQ', 110000, 0], ['CLI', 0, 110000], ['ATT', 10000, 0], ['COL', 0, 10000]]);
    expect(r.lignesTva[0]).toMatchObject({ baseCentimes: 100000, tvaCentimes: 10000 });
    expect(r.lettrage).toMatchObject({ partiel: true, reste: 110000 });
    expect(r.resteDu).toBe(110000);
    const second = ecritureEncaissement(entree(110000, 'B', { dejaEncaisse: c(110000), parTaux: [taux(20000, 200000, 10000)] }));
    expect(second.resteDu).toBe(0);
    expect(second.lettrage.partiel).toBe(false);
    expect(second.lignesTva[0]).toMatchObject({ tvaCentimes: 10000 });
    expect(ecritureEncaissement({ ...entree(110000), codesLettrageExistants: ['A', 'B'] }).lettrage.code).toBe('C');
  });
  it('cas-a-sans-ligne-de-tva', () => {
    const r = ecritureEncaissement(entree(220000, 'A'));
    expect(resume(entree(220000, 'A'))).toEqual([['BQ', 220000, 0], ['CLI', 0, 220000]]);
    expect(r.lignesTva).toEqual([]);
    expect(r.resteDu).toBe(0);
  });
  it('franchise-sans-ligne-de-tva', () => {
    const r = ecritureEncaissement(entree(50000, 'C', { parTaux: [] }));
    expect(r.ecriture.lignes).toHaveLength(2);
    expect(r.lignesTva).toEqual([]);
    expect(r.resteDu).toBe(170000);
    expect(r.lettrage.partiel).toBe(true);
  });
  it('v25-trop-percu-a18-sans-produit', () => {
    const e = entree(120000, 'A', { ttc: c(100000), ligneClient: ligneClient(100000) }, 100000);
    const r = ecritureEncaissement(e);
    expect(resume(e)).toEqual([['BQ', 120000, 0], ['CLI', 0, 120000]]);
    expect(r.cartes).toEqual(['A18']);
    expect(r.ecriture.lignes.some((l) => l.compte.startsWith('7'))).toBe(false);
    expect(r.resteDu).toBe(0);
    expect(r.lettrage.partiel).toBe(false);
    const b = ecritureEncaissement(entree(230000));
    expect(b.cartes).toEqual(['A18']);
    expect(b.lignesTva[0]).toMatchObject({ tvaCentimes: 20000 });
  });
  it('lettrage-ne-modifie-pas-les-lignes', () => {
    const ligne = Object.freeze(ligneClient(220000));
    const e = entree(220000, 'B', { ligneClient: ligne });
    const avant = JSON.stringify(e);
    ecritureEncaissement(e);
    expect(JSON.stringify(e)).toBe(avant);
    expect(ligne).toEqual(ligneClient(220000));
  });
  it('auxiliaire-different-refuse', () => {
    expect(code(() => ecritureEncaissement(entree(220000, 'B', { ligneClient: ligneClient(220000, { auxiliaire: 'AUTRE' }) })))).toBe('comptes_differents');
    expect(code(() => ecritureEncaissement(entree(220000, 'B', { ligneClient: ligneClient(220000, { compte: 'XXX' }) })))).toBe('comptes_differents');
    expect(code(() => ecritureEncaissement(entree(220000, 'B', { ligneClient: ligneClient(220000, { lettre: 'A' }) })))).toBe('deja_lettree');
    expect(code(() => ecritureEncaissement(entree(220000, 'B', { auxiliaire: 'AUTRE' })))).toBe('comptes_differents');
  });
  it('montant-invalide-refuse', () => {
    for (const m of [0, -1, 1.5, NaN, Infinity]) expect(code(() => ecritureEncaissement(entree(m)))).toBe('paiement_invalide');
    for (const d of [-1, 1.5, NaN]) expect(code(() => ecritureEncaissement(entree(1000, 'B', { dejaEncaisse: c(d) })))).toBe('deja_encaisse_invalide');
    expect(code(() => ecritureEncaissement(entree(1000, 'B', { dejaEncaisse: c(220000) })))).toBe('deja_solde');
    expect(code(() => ecritureEncaissement(entree(1000, 'B', { ttc: c(0) })))).toBe('ttc_invalide');
    expect(code(() => ecritureEncaissement({ ...entree(1000), date: '2026-02-30' }))).toBe('date_invalide');
    expect(code(() => ecritureEncaissement(entree(1000, 'D' as 'A')))).toBe('cas_invalide');
  });
  it('equilibre-boucle', () => {
    let s = 20261107;
    const suite = (n: number): number => {
      s = (s * 48271) % 2147483647;
      return s % n;
    };
    for (let i = 0; i < 300; i += 1) {
      const ttc = 1000 + suite(900000);
      const deja = suite(ttc);
      const montant = 1 + suite(ttc + 1000);
      const tva = suite(ttc);
      const cas = (['A', 'B', 'C'] as const)[suite(3)] as 'A' | 'B' | 'C';
      const parTaux = cas === 'B' ? [taux(tva, ttc - tva)] : [];
      const r = ecritureEncaissement(entree(montant, cas, { ttc: c(ttc), dejaEncaisse: c(deja), parTaux, ligneClient: ligneClient(ttc) }, ttc));
      expect(verifierEquilibre(r.ecriture).equilibree).toBe(true);
      expect(r.resteDu).toBe(Math.max(0, ttc - deja - montant));
    }
  });
});
