import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { qualifierAcompte } from '../acompte.js';
import { ecritureFacture } from '../ecriture-facture.js';
import { controleSolde, ecritureImputation, type AcompteImpute } from '../imputation-acompte.js';
import { ErreurVente, type ComptesVente, type LigneVente, type PieceVente, type ProfilVente } from '../types.js';

const c = centimes;
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const ac = (id: string, ht: number, tva: number, tauxPdb = 1900, ttc = ht + tva): AcompteImpute => ({ id, ht: c(ht), tva: c(tva), ttc: c(ttc), tauxPdb });
const imputer = (acomptes: AcompteImpute[], casFacture: 'A' | 'B' = 'B', auxiliaire = 'CLIENT1') =>
  ecritureImputation({ id: 'imp-1', journal: 'OD', date: '2026-11-05', acomptes, casFacture, comptes, auxiliaire });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};
const resume = (r: ReturnType<typeof imputer>) => r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit]);

describe('imputation des acomptes sur la facture de solde', () => {
  it('v14-imputation-cas-b', () => {
    const r = imputer([ac('a1', 100000, 20000)]);
    expect(resume(r)).toEqual([['AVA', 100000, 0], ['ATT', 20000, 0], ['CLI', 0, 120000]]);
    expect(r.ecriture.lignes[2]?.auxiliaire).toBe('CLIENT1');
    expect(r.ecriture.statut).toBe('propose');
    expect(verifierEquilibre(r.ecriture).equilibree).toBe(true);
    expect(r.lignesTva).toEqual([
      { compte: 'ATT', tauxPdb: 1900, baseCentimes: -100000, tvaCentimes: -20000, codeTva: 'COLLECTEE', cas: 'B', sens: 'acompte', dateExigibilite: null, pieceId: 'imp-1' },
    ]);
  });
  it('imputation-cas-a', () => {
    const r = imputer([ac('a1', 100000, 20000)], 'A');
    expect(resume(r)).toEqual([['AVA', 100000, 0], ['COL', 20000, 0], ['CLI', 0, 120000]]);
    expect(r.lignesTva[0]).toMatchObject({ compte: 'COL', cas: 'A', dateExigibilite: '2026-11-05', tvaCentimes: -20000 });
  });
  it('deux-acomptes-deux-taux', () => {
    const entree = [ac('a2', 50000, 9500, 1900), ac('a1', 100000, 6000, 600)];
    const r = imputer(entree);
    expect(resume(r)).toEqual([['AVA', 150000, 0], ['ATT', 6000, 0], ['ATT', 9500, 0], ['CLI', 0, 165500]]);
    expect(r.lignesTva.map((l) => [l.tauxPdb, l.baseCentimes, l.tvaCentimes])).toEqual([[600, -100000, -6000], [1900, -50000, -9500]]);
    expect(resume(imputer([...entree].reverse()))).toEqual(resume(r));
    const meme = imputer([ac('a1', 100000, 6000, 600), ac('a2', 50000, 9500, 600)]);
    expect(meme.lignesTva).toHaveLength(1);
    expect(meme.lignesTva[0]).toMatchObject({ baseCentimes: -150000, tvaCentimes: -15500 });
  });
  it('acompte-sans-tva-aucune-ligne-de-tva', () => {
    const r = imputer([ac('a1', 100000, 0, 0)]);
    expect(resume(r)).toEqual([['AVA', 100000, 0], ['CLI', 0, 100000]]);
    expect(r.lignesTva[0]).toMatchObject({ tvaCentimes: 0 });
  });
  it('sans-auxiliaire-brouillon', () => {
    const r = imputer([ac('a1', 100000, 20000)], 'B', '');
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes[2]).not.toHaveProperty('auxiliaire');
  });
  it('controle-solde-exact', () => {
    expect(controleSolde({ totalTtc: c(600000), acomptesTtc: [c(120000)], soldeTtc: c(480000) })).toEqual({ ok: true, ecart: 0 });
    expect(controleSolde({ totalTtc: c(600000), acomptesTtc: [c(100000), c(20000)], soldeTtc: c(480000) }).ok).toBe(true);
  });
  it('controle-solde-ecart-un-centime-a14', () => {
    expect(controleSolde({ totalTtc: c(600000), acomptesTtc: [c(120000)], soldeTtc: c(480001) })).toEqual({ ok: false, ecart: -1, carte: 'A14' });
    expect(controleSolde({ totalTtc: c(600000), acomptesTtc: [c(120000)], soldeTtc: c(479999) })).toEqual({ ok: false, ecart: 1, carte: 'A14' });
  });
  it('acompte-superieur-a-la-facture-a14', () => {
    expect(controleSolde({ totalTtc: c(600000), acomptesTtc: [c(700000)], soldeTtc: c(0) })).toEqual({ ok: false, ecart: -100000, carte: 'A14' });
  });
  it('tva-jamais-comptee-deux-fois', () => {
    const acompte = qualifierAcompte({
      id: 'ac-1', journal: 'BQ', date: '2026-11-01', ttc: c(119000), confirmePar: 'personne-exemple', clientAuxiliaire: 'CLIENT1', tauxPdb: 1900,
      parametreExigibilite: { cle: 'cle.inventee', pays: 'FR', valeur: 'x', effet_debut: '2026-01-01', effet_fin: null, statut: 'valide', source: 'Source inventée', date_releve: '2026-06-01' },
      comptes,
    });
    const profil: ProfilVente = { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null };
    const piece: PieceVente = { id: 'f1', type: 'facture', origine: 'depot', numero: 'F-1', dateFacture: '2026-11-05', htCentimes: c(500000), tvaCentimes: c(95000), ttcCentimes: c(595000), statut: 'lue' };
    const ligne: LigneVente = { libelle: 'x', htCentimes: c(500000), tauxPdb: 1900, tvaLueCentimes: c(95000), nature: 'service', compteProduit: 'P706', codeTva: 'COLLECTEE' };
    const facture = ecritureFacture({ id: 'e1', journal: 'VT', piece, lignes: [ligne], profil, comptes, auxiliaire: 'CLIENT1' });
    const imp = imputer([ac('ac-1', 100000, 19000)]);
    const net = (compte: string): number => [...acompte.lignesTva, ...facture.lignesTva, ...imp.lignesTva].filter((l) => l.compte === compte).reduce((s, l) => s + l.tvaCentimes, 0);
    expect(net('COL')).toBe(19000);
    expect(net('ATT')).toBe(76000);
    expect(net('COL') + net('ATT')).toBe(95000);
    const credit = (e: { lignes: readonly { compte: string; debit: Centimes; credit: Centimes }[] }, compte: string): number => e.lignes.filter((l) => l.compte === compte).reduce((s, l) => s + l.credit - l.debit, 0);
    expect(credit(facture.ecriture ?? { lignes: [] }, 'ATT') + credit(imp.ecriture, 'ATT')).toBe(76000);
  });
  it('entrees-invalides', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      const m = mauvais as Centimes;
      expect(code(() => imputer([{ id: 'a', ht: m, tva: c(0), ttc: m, tauxPdb: 1900 }]))).toBe('montant_invalide');
      expect(code(() => imputer([{ id: 'a', ht: c(1), tva: m, ttc: c(1), tauxPdb: 1900 }]))).toBe('montant_invalide');
      expect(code(() => imputer([ac('a', 1, 0, mauvais)]))).toBe('taux_invalide');
      expect(code(() => controleSolde({ totalTtc: m, acomptesTtc: [c(1)], soldeTtc: c(0) }))).toBe('montant_invalide');
      expect(code(() => controleSolde({ totalTtc: c(1), acomptesTtc: [m], soldeTtc: c(0) }))).toBe('montant_invalide');
      expect(code(() => controleSolde({ totalTtc: c(1), acomptesTtc: [c(1)], soldeTtc: m }))).toBe('montant_invalide');
    }
    expect(code(() => imputer([]))).toBe('aucun_acompte');
    expect(code(() => controleSolde({ totalTtc: c(1), acomptesTtc: [], soldeTtc: c(1) }))).toBe('aucun_acompte');
    expect(code(() => imputer([ac('a', 100000, 20000, 1900, 120001)]))).toBe('acompte_incoherent');
    expect(code(() => imputer([ac('a', 100000, 20000, 1900, 119999)]))).toBe('acompte_incoherent');
    expect(code(() => imputer([ac('a', 1, 0)], 'C' as 'A'))).toBe('cas_invalide');
    expect(code(() => ecritureImputation({ id: 'i', journal: 'OD', date: '2026-02-30', acomptes: [ac('a', 1, 0)], casFacture: 'A', comptes, auxiliaire: 'X' }))).toBe('date_invalide');
    expect(code(() => imputer([ac('a', 0, 0)]))).toBe('autre');
  });
});
