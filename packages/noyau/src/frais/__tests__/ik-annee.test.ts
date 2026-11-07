import { describe, expect, it } from 'vitest';
import { lireBaremeIk } from '../bareme-ik.js';
import { calculerAnnee } from '../ik-annee.js';
import { ErreurFrais } from '../types.js';

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

const tr = (jusqua: number | null, taux: string, fixe: string) => ({ jusqua_km: jusqua, taux, fixe });
const p4 = { cv: 4, tranches: [tr(4000, '0,500', '0'), tr(16000, '0,300', '800'), tr(null, '0,360', '0')] };
const BAREME = lireBaremeIk(JSON.stringify({ puissances: [p4] }));
const VALIDE = { statut: 'valide', bareme: BAREME, majorationPourcent: 10 };
const A_VERIFIER = { statut: 'a_verifier' };

const t = (fraisId: string, km: number, o: Partial<{ personneId: string; vehiculeId: string; date: string }> = {}) => ({
  fraisId,
  personneId: 'p1',
  vehiculeId: 'v1',
  date: '2026-03-01',
  kmRetenusDixiemes: km * 10,
  electrique: false,
  puissanceCv: 4,
  ...o,
});

describe('calculerAnnee (barème inventé)', () => {
  it('nf12-bareme-a-verifier-aucun-montant', () => {
    const r = calculerAnnee([t('a', 50), t('b', 30)], A_VERIFIER);
    expect(r.montants.get('a')).toBeNull();
    expect(r.montants.get('b')).toBeNull();
    expect(r.cumuls).toEqual([{ personneId: 'p1', vehiculeId: 'v1', kmDixiemes: 800, sommeProvisoires: 0 }]);
  });

  it('nf12-statut-non-valide-aucun-montant-meme-avec-bareme', () => {
    for (const statut of ['a_verifier', 'rejete', '']) {
      const r = calculerAnnee([t('a', 50), t('b', 30)], { statut, bareme: BAREME, majorationPourcent: 10 });
      expect(r.montants.get('a')).toBeNull();
      expect(r.montants.get('b')).toBeNull();
      expect(r.cumuls).toEqual([{ personneId: 'p1', vehiculeId: 'v1', kmDixiemes: 800, sommeProvisoires: 0 }]);
    }
  });

  it('km-invalides-refuses-en-a-verifier', () => {
    for (const km of [Number.NaN, Number.POSITIVE_INFINITY, 12.5, 0, -10]) {
      const trajet = { ...t('a', 5), kmRetenusDixiemes: km };
      expect(code(() => calculerAnnee([trajet], A_VERIFIER))).toBe('entree_invalide');
    }
  });

  it('nf12-puis-valide-tout-calcule', () => {
    const liste = [t('a', 50), t('b', 30)];
    expect(calculerAnnee(liste, A_VERIFIER).montants.get('a')).toBeNull();
    const r = calculerAnnee(liste, VALIDE);
    expect(r.montants.get('a')).toBe(2500);
    expect(r.montants.get('b')).toBe(1500);
    expect(r.cumuls[0]?.sommeProvisoires).toBe(4000);
  });

  it('ordre-d-entree-sans-effet', () => {
    const liste = [t('a', 50, { date: '2026-01-05' }), t('b', 4000, { date: '2026-02-05' }), t('c', 30, { date: '2026-03-05' })];
    const r1 = calculerAnnee(liste, VALIDE);
    const r2 = calculerAnnee([...liste].reverse(), VALIDE);
    expect([...r2.montants]).toEqual([...r1.montants]);
    expect(r2.cumuls).toEqual(r1.cumuls);
  });

  it('cumul-par-vehicule', () => {
    const r = calculerAnnee([t('a', 3990), t('b', 20, { vehiculeId: 'v2', date: '2026-04-01' })], VALIDE);
    expect(r.montants.get('b')).toBe(1000);
    expect(r.cumuls).toHaveLength(2);
  });

  it('cumul-par-personne', () => {
    const r = calculerAnnee([t('a', 3990), t('b', 20, { personneId: 'p2', date: '2026-04-01' })], VALIDE);
    expect(r.montants.get('b')).toBe(1000);
    expect(r.cumuls.map((c) => c.personneId).sort()).toEqual(['p1', 'p2']);
  });

  it('meme-date-tri-par-id', () => {
    const r = calculerAnnee([t('b', 3990), t('a', 20)], VALIDE);
    expect(r.montants.get('a')).toBe(1000);
    expect(r.montants.get('b')).toBe(199300);
  });

  it('deux-annees-refusees', () => {
    expect(code(() => calculerAnnee([t('a', 5), t('b', 5, { date: '2027-01-01' })], VALIDE))).toBe('entree_invalide');
  });

  it('id-en-double-refuse', () => {
    expect(code(() => calculerAnnee([t('a', 5), t('a', 6, { date: '2026-05-01' })], VALIDE))).toBe('entree_invalide');
  });

  it('somme-des-provisoires-dans-le-cumul', () => {
    const r = calculerAnnee([t('a', 50), t('b', 3960), t('c', 10)], VALIDE);
    const somme = [...r.montants.values()].reduce<number>((s, m) => s + (m ?? 0), 0);
    expect(r.cumuls[0]?.sommeProvisoires).toBe(somme);
    expect(r.cumuls[0]?.kmDixiemes).toBe(40200);
  });

  it('liste-vide-et-valide-sans-bareme', () => {
    expect(calculerAnnee([], VALIDE).cumuls).toEqual([]);
    expect(calculerAnnee([], VALIDE).montants.size).toBe(0);
    expect(code(() => calculerAnnee([t('a', 5)], { statut: 'valide' }))).toBe('entree_invalide');
  });
});
