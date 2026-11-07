import { describe, expect, it } from 'vitest';
import {
  type ContexteCasSur,
  type ParametresCasSur,
  type Proposition,
  ErreurCasSur,
  estCasSur,
} from '../cas-sur.js';

const params: ParametresCasSur = { montantMaxCentimes: 50000, validationsMinFournisseur: 3 };

const ctxVide = (): ContexteCasSur => ({
  validationsParFournisseurEtCompte: new Map([['f1|606', 5]]),
  anomaliesOuvertes: new Set<string>(),
  fournisseurHorsUnion: new Set<string>(),
});

const sure = (id: string, montant = 1200): Proposition => ({
  id,
  nature: 'piece',
  confiance: 'sur',
  champsDouteux: 0,
  fournisseurId: 'f1',
  compteCharge: '606',
  montantTtcCentimes: montant,
  tvaEnDoute: false,
});

describe('estCasSur', () => {
  it('c1-trente-propositions-exactement-douze-sures', () => {
    const ctx = ctxVide();
    ctx.anomaliesOuvertes = new Set(['fa']);
    ctx.fournisseurHorsUnion = new Set(['fh']);
    const liste: Proposition[] = [];
    for (let i = 0; i < 12; i += 1) liste.push(sure('s' + String(i), 1200 + i * 4000));
    // 18 non sûres, 3 de chaque cause.
    for (let i = 0; i < 3; i += 1) {
      liste.push({ ...sure('n' + String(i)), nature: 'paiement' });
      liste.push({ ...sure('d' + String(i)), confiance: 'doute' });
      liste.push({ ...sure('v' + String(i)), fournisseurId: 'f2' });
      liste.push({ ...sure('a' + String(i)), fournisseurId: 'fa' });
      liste.push({ ...sure('h' + String(i)), fournisseurId: 'fh' });
      liste.push({ ...sure('t' + String(i)), tvaEnDoute: true });
    }
    expect(liste).toHaveLength(30);
    expect(liste.filter((p) => estCasSur(p, ctx, params).sur)).toHaveLength(12);
    expect(estCasSur(sure('max', 49999), ctx, params).sur).toBe(true);
  });

  it('c1-montant-50-000-pile-non-sur', () => {
    const r = estCasSur(sure('m', 50000), ctxVide(), params);
    expect(r).toEqual({ sur: false, raisons: ['montant_au_seuil_ou_plus'] });
    expect(estCasSur(sure('m', 49999), ctxVide(), params).sur).toBe(true);
  });

  it('c2-troisieme-validation-passe-deuxieme-non', () => {
    const avec = (n: number): ContexteCasSur => ({
      ...ctxVide(),
      validationsParFournisseurEtCompte: new Map([['f1|606', n]]),
    });
    expect(estCasSur(sure('p'), avec(2), params)).toEqual({ sur: false, raisons: ['fournisseur_peu_valide'] });
    expect(estCasSur(sure('p'), avec(3), params).sur).toBe(true);
    // Validé 5 fois sur un AUTRE compte : ne compte pas.
    expect(estCasSur({ ...sure('p'), compteCharge: '613' }, ctxVide(), params).raisons).toEqual(['fournisseur_peu_valide']);
  });

  it('c2-hors-union-jamais-sur-raison-affichee', () => {
    const ctx = { ...ctxVide(), fournisseurHorsUnion: new Set(['f1']) };
    expect(estCasSur(sure('h'), ctx, params)).toEqual({ sur: false, raisons: ['fournisseur_hors_union'] });
  });

  it('cinq-natures-jamais-sures-meme-confiance-sure', () => {
    const natures = [
      'paiement', 'virement', 'prelevement', 'remboursement', 'declaration', 'cloture', 'fin_annee', 'suppression', 'envoi',
    ] as const;
    for (const nature of natures) {
      const r = estCasSur({ ...sure('x'), nature }, ctxVide(), params);
      expect(r.sur).toBe(false);
      expect(r.raisons).toEqual(['nature_jamais_sure']);
    }
  });

  it('toutes-les-raisons-listees', () => {
    const ctx: ContexteCasSur = {
      validationsParFournisseurEtCompte: new Map(),
      anomaliesOuvertes: new Set(['f9']),
      fournisseurHorsUnion: new Set(['f9']),
    };
    const p: Proposition = {
      ...sure('x', 50000), nature: 'envoi', confiance: 'probable', fournisseurId: 'f9', compteCharge: null, tvaEnDoute: true,
    };
    expect(estCasSur(p, ctx, params).raisons).toEqual([
      'nature_jamais_sure', 'lecture_douteuse', 'anomalie_ouverte', 'montant_au_seuil_ou_plus',
      'fournisseur_hors_union', 'tva_en_doute', 'compte_absent',
    ]);
  });

  it('montant-negatif-valeur-absolue', () => {
    expect(estCasSur(sure('a', -49999), ctxVide(), params).sur).toBe(true);
    expect(estCasSur(sure('a', -50000), ctxVide(), params).sur).toBe(false);
  });

  it('anomalie sur la pièce elle-même ; champ douteux seul', () => {
    const ctx = { ...ctxVide(), anomaliesOuvertes: new Set(['pz']) };
    expect(estCasSur(sure('pz'), ctx, params).raisons).toEqual(['anomalie_ouverte']);
    expect(estCasSur({ ...sure('q'), champsDouteux: 1 }, ctxVide(), params).raisons).toEqual(['lecture_douteuse']);
  });

  it('fournisseur null : peu validé ; compte null : compte absent', () => {
    expect(estCasSur({ ...sure('q'), fournisseurId: null }, ctxVide(), params)).toEqual({
      sur: false, raisons: ['fournisseur_peu_valide'],
    });
    expect(estCasSur({ ...sure('q'), compteCharge: null }, ctxVide(), params)).toEqual({
      sur: false, raisons: ['compte_absent'],
    });
  });

  it('paramètres invalides : refus', () => {
    const mauvais = [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const v of mauvais) {
      expect(() => estCasSur(sure('q'), ctxVide(), { ...params, montantMaxCentimes: v })).toThrow(ErreurCasSur);
      expect(() => estCasSur(sure('q'), ctxVide(), { ...params, validationsMinFournisseur: v })).toThrow(ErreurCasSur);
    }
  });

  it('proposition invalide : refus', () => {
    for (const v of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => estCasSur(sure('q', v), ctxVide(), params)).toThrow(ErreurCasSur);
    }
    expect(() => estCasSur({ ...sure('q'), champsDouteux: -1 }, ctxVide(), params)).toThrow(
      expect.objectContaining({ code: 'proposition_invalide' }),
    );
  });
});
