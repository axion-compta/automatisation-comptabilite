import { describe, expect, it } from 'vitest';
import { casDeLaLigne, dateExigibilite } from '../schema.js';
import type { ProfilVente } from '../types.js';

const reel: ProfilVente = { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null };
const option: ProfilVente = { ...reel, optionDebitsDepuis: '2026-11-01' };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('schéma de vente', () => {
  it('bien-cas-a', () => {
    expect(casDeLaLigne(reel, 'bien', '2026-11-05')).toBe('A');
  });
  it('service-sans-option-cas-b', () => {
    expect(casDeLaLigne(reel, 'service', '2026-11-05')).toBe('B');
  });
  it('option-debits-le-jour-meme-cas-a', () => {
    expect(casDeLaLigne(option, 'service', '2026-11-01')).toBe('A');
    expect(casDeLaLigne(option, 'service', '2026-12-01')).toBe('A');
  });
  it('option-debits-la-veille-cas-b', () => {
    expect(casDeLaLigne(option, 'service', '2026-10-31')).toBe('B');
  });
  it('franchise-cas-c', () => {
    const f: ProfilVente = { ...reel, regimeTva: 'franchise' };
    expect(casDeLaLigne(f, 'bien', '2026-11-05')).toBe('C');
    expect(casDeLaLigne(f, 'service', '2026-11-05')).toBe('C');
  });
  it('livre-recettes-prime-sur-franchise', () => {
    for (const regimeTva of ['franchise', 'a_confirmer', 'reel'] as const) {
      const p: ProfilVente = { tenue: 'livre_recettes', regimeTva, optionDebitsDepuis: null };
      expect(casDeLaLigne(p, 'a_confirmer', '2026-11-05')).toBe('D');
    }
  });
  it('regime-a-confirmer-jamais-estime', () => {
    const p: ProfilVente = { ...reel, regimeTva: 'a_confirmer' };
    for (const n of ['bien', 'service', 'a_confirmer'] as const) expect(casDeLaLigne(p, n, '2026-11-05')).toBe('a_confirmer');
  });
  it('nature-a-confirmer', () => {
    expect(casDeLaLigne(reel, 'a_confirmer', '2026-11-05')).toBe('a_confirmer');
    expect(casDeLaLigne({ ...reel, regimeTva: 'franchise' }, 'a_confirmer', '2026-11-05')).toBe('C');
  });
  it('exigibilite-bien-date-de-livraison', () => {
    const r = dateExigibilite('A', 'bien', { dateFacture: '2026-11-03', dateOperation: '2026-10-28' });
    expect(r).toEqual({ date: '2026-10-28', dateOperationSupposee: false });
  });
  it('exigibilite-sans-date-operation-supposee', () => {
    expect(dateExigibilite('A', 'bien', { dateFacture: '2026-11-03' })).toEqual({ date: '2026-11-03', dateOperationSupposee: true });
    expect(dateExigibilite('A', 'service', { dateFacture: '2026-11-03', dateOperation: '2026-10-28' })).toEqual({
      date: '2026-11-03',
      dateOperationSupposee: false,
    });
  });
  it('exigibilite-encaissements-franchise-et-recettes', () => {
    const d = { dateFacture: '2026-11-03', dateEncaissement: '2026-11-20' };
    expect(dateExigibilite('B', 'service', d)).toEqual({ date: '2026-11-20', dateOperationSupposee: false });
    expect(dateExigibilite('B', 'service', { dateFacture: '2026-11-03' }).date).toBeNull();
    expect(dateExigibilite('C', 'bien', d).date).toBeNull();
    expect(dateExigibilite('D', 'service', d).date).toBeNull();
  });
  it('dates-invalides-refusees', () => {
    for (const mauvaise of ['', '2026-02-30']) {
      expect(code(() => casDeLaLigne(option, 'service', mauvaise))).toBe('date_invalide');
      expect(code(() => casDeLaLigne({ ...option, optionDebitsDepuis: mauvaise }, 'service', '2026-11-05'))).toBe('date_invalide');
      expect(code(() => dateExigibilite('A', 'bien', { dateFacture: mauvaise }))).toBe('date_invalide');
      expect(code(() => dateExigibilite('A', 'bien', { dateFacture: '2026-11-03', dateOperation: mauvaise }))).toBe('date_invalide');
      expect(code(() => dateExigibilite('B', 'service', { dateFacture: '2026-11-03', dateEncaissement: mauvaise }))).toBe('date_invalide');
      for (const cas of ['B', 'C', 'D'] as const) {
        expect(code(() => dateExigibilite(cas, 'bien', { dateFacture: mauvaise }))).toBe('date_invalide');
      }
      expect(code(() => casDeLaLigne(option, 'bien', mauvaise))).toBe('date_invalide');
      expect(code(() => casDeLaLigne({ ...option, regimeTva: 'franchise' }, 'bien', mauvaise))).toBe('date_invalide');
      expect(code(() => casDeLaLigne({ ...option, regimeTva: 'a_confirmer' }, 'bien', mauvaise))).toBe('date_invalide');
      expect(code(() => casDeLaLigne(option, 'a_confirmer', mauvaise))).toBe('date_invalide');
      expect(code(() => casDeLaLigne({ ...option, tenue: 'livre_recettes' }, 'bien', mauvaise))).toBe('date_invalide');
    }
    expect(code(() => casDeLaLigne(option, 'service', undefined as unknown as string))).toBe('date_invalide');
    expect(code(() => dateExigibilite('A', 'bien', { dateFacture: undefined as unknown as string }))).toBe('date_invalide');
  });
});
