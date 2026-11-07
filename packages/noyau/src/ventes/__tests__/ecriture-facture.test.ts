import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { ecritureFacture, lignesDeTva } from '../ecriture-facture.js';
import { ErreurVente, type ComptesVente, type LigneVente, type PieceVente, type ProfilVente } from '../types.js';

const c = centimes;
const reel: ProfilVente = { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null };
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const piece = (ttc: number, extra: Partial<PieceVente> = {}): PieceVente => ({
  id: 'p1', type: 'facture', origine: 'depot', numero: 'F-1', dateFacture: '2026-11-05',
  htCentimes: c(0), tvaCentimes: c(0), ttcCentimes: ttc as Centimes, statut: 'lue', ...extra,
});
const ligne = (ht: number, taux: number | null, tva: number, nature: LigneVente['nature'] = 'bien', compte = 'P70'): LigneVente => ({
  libelle: 'x', htCentimes: ht as Centimes, tauxPdb: taux, tvaLueCentimes: tva as Centimes, nature, compteProduit: compte, codeTva: 'COLLECTEE',
});
const faire = (lignes: LigneVente[], ttc: number, profil = reel, auxiliaire: string | null = 'CLIENT1', p = piece(ttc)) =>
  ecritureFacture({ id: 'e1', journal: 'VT', piece: p, lignes, profil, comptes, ...(auxiliaire === null ? {} : { auxiliaire }) });
const resume = (r: ReturnType<typeof faire>) => r.ecriture?.lignes.map((l) => [l.compte, l.debit, l.credit]);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('ecriture-facture', () => {
  it('v01-cas-a-biens', () => {
    const r = faire([ligne(100000, 600, 5500)], 105500);
    expect(resume(r)).toEqual([['CLI', 105500, 0], ['P70', 0, 100000], ['COL', 0, 5500]]);
    expect(r.ecriture?.lignes[0]?.auxiliaire).toBe('CLIENT1');
    expect(r.ecriture?.statut).toBe('propose');
    expect(r.ecriture?.date).toBe('2026-11-05');
    expect(r.cartes).toEqual([]);
    expect(r.lignesTva).toEqual([{ compte: 'COL', tauxPdb: 600, baseCentimes: 100000, tvaCentimes: 5500, codeTva: 'COLLECTEE', cas: 'A', sens: 'vente', dateExigibilite: '2026-11-05', pieceId: 'p1' }]);
  });

  it('v02-cas-b-services', () => {
    const r = faire([ligne(200000, 1900, 20000, 'service', 'P706')], 220000);
    expect(resume(r)).toEqual([['CLI', 220000, 0], ['P706', 0, 200000], ['ATT', 0, 20000]]);
    expect(r.lignesTva[0]).toMatchObject({ cas: 'B', compte: 'ATT', dateExigibilite: null });
  });

  it('v07-deux-taux-cas-b', () => {
    const r = faire([ligne(100000, 900, 10000, 'service', 'P706'), ligne(50000, 1900, 10000, 'service', 'P706')], 170000);
    expect(resume(r)).toEqual([['CLI', 170000, 0], ['P706', 0, 150000], ['ATT', 0, 10000], ['ATT', 0, 10000]]);
    expect(r.lignesTva.map((l) => l.tauxPdb)).toEqual([900, 1900]);
  });

  it('mixte-biens-services-une-ecriture', () => {
    const lignes = [ligne(100000, 600, 6000), ligne(50000, 1900, 9500, 'service', 'P706')];
    const r = faire(lignes, 165500);
    expect(resume(r)).toEqual([['CLI', 165500, 0], ['P70', 0, 100000], ['P706', 0, 50000], ['COL', 0, 6000], ['ATT', 0, 9500]]);
    expect(r.lignesTva.map((l) => l.cas)).toEqual(['A', 'B']);
    expect(faire([...lignes].reverse(), 165500)).toEqual(r);
  });

  it('v06-option-debits', () => {
    const option = { ...reel, optionDebitsDepuis: '2026-11-01' };
    const r = faire([ligne(100000, 1900, 19000, 'service', 'P706')], 119000, option);
    expect(resume(r)).toEqual([['CLI', 119000, 0], ['P706', 0, 100000], ['COL', 0, 19000]]);
    expect(r.lignesTva[0]).toMatchObject({ cas: 'A', dateExigibilite: '2026-11-05' });
    const avant = faire([ligne(100000, 1900, 19000, 'service', 'P706')], 119000, option, 'C', piece(119000, { dateOperation: '2026-10-01' }));
    expect(avant.lignesTva[0]?.cas).toBe('B');
  });

  it('franchise-sans-tva', () => {
    const f: ProfilVente = { ...reel, regimeTva: 'franchise' };
    const r = faire([ligne(30000, null, 0), ligne(20000, null, 0, 'service', 'P2')], 50000, f);
    expect(resume(r)).toEqual([['CLI', 50000, 0], ['P2', 0, 20000], ['P70', 0, 30000]]);
    expect(r.lignesTva).toEqual([]);
    expect(r.motif).toBeUndefined();
  });

  it('franchise-tva-portee-pas-d-ecriture-a16', () => {
    const f: ProfilVente = { ...reel, regimeTva: 'franchise' };
    const r = faire([ligne(30000, 600, 1800)], 31800, f);
    expect(r.ecriture).toBeNull();
    expect(r.cartes).toEqual(['A16']);
    expect(r.motif).toBe('tva_en_franchise_a_verifier');
    expect(r.lignesTva).toEqual([]);
  });

  it('livre-recettes-pas-d-ecriture', () => {
    const r = faire([ligne(30000, null, 0)], 30000, { ...reel, tenue: 'livre_recettes' });
    expect(r).toEqual({ ecriture: null, lignesTva: [], cartes: [], motif: 'livre_recettes' });
  });

  it('regime-a-confirmer-pas-d-ecriture', () => {
    const r = faire([ligne(30000, 600, 1800)], 31800, { ...reel, regimeTva: 'a_confirmer' });
    expect(r).toEqual({ ecriture: null, lignesTva: [], cartes: [], motif: 'regime_a_confirmer' });
  });

  it('nature-a-confirmer-brouillon', () => {
    const r = faire([ligne(100000, 1900, 19000, 'a_confirmer')], 119000);
    expect(r.ecriture?.statut).toBe('brouillon');
    expect(r.lignesTva[0]?.cas).toBe('B');
  });

  it('client-absent-brouillon', () => {
    for (const aux of [null, '']) {
      const r = faire([ligne(100000, 600, 5500)], 105500, reel, aux);
      expect(r.ecriture?.statut).toBe('brouillon');
      expect(r.ecriture?.lignes[0]?.auxiliaire).toBeUndefined();
    }
  });

  it('ttc-lu-different-carte-a1', () => {
    const r = faire([ligne(100000, 600, 5500)], 105600);
    expect(r.cartes).toEqual(['A1']);
    expect(resume(r)).toEqual([['CLI', 105500, 0], ['P70', 0, 100000], ['COL', 0, 5500]]);
  });

  it('entrees-invalides', () => {
    const ok = ligne(100000, 600, 5500);
    const mal = (l: LigneVente): string | undefined => code(() => faire([l], 105500));
    expect(mal(ligne(-1, 600, 5500))).toBe('montant_invalide');
    expect(mal(ligne(Number.NaN, 600, 5500))).toBe('montant_invalide');
    expect(mal(ligne(Number.POSITIVE_INFINITY, 600, 5500))).toBe('montant_invalide');
    expect(mal(ligne(150.5, 600, 5500))).toBe('montant_invalide');
    expect(mal(ligne(100000, 600, -5))).toBe('montant_invalide');
    expect(mal(ligne(100000, 600, Number.NaN))).toBe('montant_invalide');
    expect(mal(ligne(100000, Number.NaN, 5500))).toBe('taux_invalide');
    expect(mal(ligne(100000, -600, 5500))).toBe('taux_invalide');
    expect(mal({ libelle: 'x', htCentimes: ok.htCentimes, tauxPdb: 600, tvaLueCentimes: ok.tvaLueCentimes, nature: 'bien', codeTva: 'COLLECTEE' })).toBe('compte_produit_manquant');
    expect(mal(ligne(0, null, 0))).toBe('montant_nul');
    expect(code(() => faire([], 0))).toBe('aucune_ligne');
    expect(code(() => faire([ok], Number.NaN))).toBe('montant_invalide');
    expect(code(() => faire([ok], 105500, reel, 'C', piece(105500, { dateFacture: 'x' })))).toBe('date_invalide');
  });

  it('lignes-de-tva-fusionne', () => {
    const g = { compte: 'COL', tauxPdb: 600, baseCentimes: c(100), tvaCentimes: c(6), codeTva: 'COLLECTEE' as const, cas: 'A' as const, dateExigibilite: '2026-11-05', pieceId: 'p' };
    const r = lignesDeTva([g, { ...g, baseCentimes: c(50), tvaCentimes: c(3) }, { ...g, tauxPdb: null }, { ...g, dateExigibilite: null }], 'avoir');
    expect(r).toHaveLength(3);
    expect(r.every((l) => l.sens === 'avoir')).toBe(true);
    expect(r.find((l) => l.tauxPdb === 600 && l.dateExigibilite !== null)).toMatchObject({ baseCentimes: 150, tvaCentimes: 9 });
    expect(lignesDeTva([g])[0]?.sens).toBe('vente');
  });

  it('equilibre-boucle', () => {
    let graine = 12345;
    const suivant = (n: number): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % n;
    };
    const taux = [null, 600, 900, 1900];
    const natures: LigneVente['nature'][] = ['bien', 'service', 'a_confirmer'];
    for (let i = 0; i < 500; i++) {
      const lignes: LigneVente[] = [];
      for (let k = 0; k <= suivant(4); k++) {
        lignes.push(ligne(suivant(100000) + 1, taux[suivant(4)] ?? null, suivant(20000), natures[suivant(3)] ?? 'bien', `P${String(suivant(3))}`));
      }
      const lus = lignes.reduce((s, l) => s + l.htCentimes + l.tvaLueCentimes, 0);
      const r = faire(lignes, lus);
      expect(r.cartes).toEqual([]);
      expect(r.ecriture).not.toBeNull();
      expect(verifierEquilibre(r.ecriture!).equilibree).toBe(true);
      const credTva = r.ecriture!.lignes.filter((l) => l.compte === 'COL' || l.compte === 'ATT').reduce((s, l) => s + l.credit, 0);
      expect(credTva).toBe(lignes.reduce((s, l) => s + l.tvaLueCentimes, 0));
      expect(r.lignesTva.reduce((s, l) => s + l.tvaCentimes, 0)).toBe(credTva);
    }
  });
});
