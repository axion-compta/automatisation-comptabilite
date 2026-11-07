import { describe, expect, it } from 'vitest';
import { ErreurSource, indicateurSources, qualifierDecision, type Source } from '../sources.js';

const piece: Source = { type: 'piece', pieceId: 'p1', page: 1, zone: 'total' };
const regle: Source = { type: 'regle', code: 'R1', version: '2026.1' };
const histo: Source = { type: 'historique', ecritureId: 'e1' };
const param: Source = { type: 'parametre', cle: 'taux_x', dateEffet: '2026-01-01' };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurSource) return e.code;
    throw e;
  }
  return undefined;
}

describe('sources', () => {
  it('sans-source-hypothese', () => {
    expect(qualifierDecision({ sources: [], confiance: 'sur' }).hypothese).toBe(true);
    expect(qualifierDecision({ sources: [piece], confiance: 'sur' }).hypothese).toBe(false);
    for (const s of [regle, histo, param]) {
      expect(qualifierDecision({ sources: [s], confiance: 'sur' }).hypothese).toBe(false);
    }
  });

  it('confiance-plafonnee-a-verifier', () => {
    for (const c of ['sur', 'probable', 'a_verifier'] as const) {
      expect(qualifierDecision({ sources: [], confiance: c }).confiance).toBe('a_verifier');
    }
    expect(qualifierDecision({ sources: [regle], confiance: 'sur' }).confiance).toBe('sur');
    expect(qualifierDecision({ sources: [regle], confiance: 'probable' }).confiance).toBe('probable');
    expect(qualifierDecision({ sources: [regle], confiance: 'a_verifier' }).confiance).toBe('a_verifier');
  });

  it('hypothese-hors-lot-vert', () => {
    expect(qualifierDecision({ sources: [], confiance: 'sur' }).lotVertPermis).toBe(false);
    expect(qualifierDecision({ sources: [histo], confiance: 'sur' }).lotVertPermis).toBe(true);
    expect(qualifierDecision({ sources: [histo], confiance: 'a_verifier' }).lotVertPermis).toBe(false);
  });

  it('indicateur-197-sur-200', () => {
    const decisions = Array.from({ length: 200 }, (_, i) => ({
      id: 'd' + String(i).padStart(3, '0'),
      sources: i < 197 ? [piece] : [],
    }));
    const r = indicateurSources([...decisions].reverse());
    expect(r).toEqual({
      total: 200,
      avecSource: 197,
      hypotheses: ['d197', 'd198', 'd199'],
      proportionPointsDeBase: 9850,
    });
  });

  it('indicateur-ne-surestime-pas', () => {
    const r = indicateurSources([
      { id: 'a', sources: [piece] },
      { id: 'b', sources: [piece] },
      { id: 'c', sources: [] },
    ]);
    expect(r.proportionPointsDeBase).toBe(6666);
  });

  it('aucune-decision-null', () => {
    expect(indicateurSources([])).toEqual({
      total: 0,
      avecSource: 0,
      hypotheses: [],
      proportionPointsDeBase: null,
    });
  });

  it('source-invalide-refusee', () => {
    const mauvaises: unknown[] = [
      { type: 'piece', pieceId: '', page: 1, zone: 'z' },
      { type: 'piece', pieceId: 'p', page: 1, zone: '' },
      { type: 'piece', pieceId: 'p', page: 0, zone: 'z' },
      { type: 'piece', pieceId: 'p', page: Number.NaN, zone: 'z' },
      { type: 'piece', pieceId: 'p', page: 1.5, zone: 'z' },
      { type: 'piece', pieceId: 'p', page: Infinity, zone: 'z' },
      { type: 'piece', pieceId: 'p', page: -1, zone: 'z' },
      { type: 'regle', code: '', version: 'v' },
      { type: 'regle', code: 'c', version: '' },
      { type: 'historique', ecritureId: '' },
      { type: 'parametre', cle: '', dateEffet: '2026-01-01' },
      { type: 'parametre', cle: 'k', dateEffet: '' },
      { type: 'inconnu' },
      null,
    ];
    for (const m of mauvaises) {
      expect(code(() => qualifierDecision({ sources: [m as Source], confiance: 'sur' }))).toBe('source_invalide');
      expect(code(() => indicateurSources([{ id: 'x', sources: [m as Source] }]))).toBe('source_invalide');
    }
    expect(code(() => qualifierDecision({ sources: [piece, { type: 'regle', code: '', version: 'v' }], confiance: 'sur' }))).toBe(
      'source_invalide',
    );
  });

  it('piece-archivee-reste-constat', () => {
    const archivee: Source = { ...piece, archivee: true };
    const q = qualifierDecision({ sources: [archivee], confiance: 'sur' });
    expect(q).toEqual({ hypothese: false, confiance: 'sur', lotVertPermis: true });
    expect(indicateurSources([{ id: 'a', sources: [archivee] }]).avecSource).toBe(1);
  });

  it('ordre-des-sources-sans-effet', () => {
    const a = qualifierDecision({ sources: [piece, regle, histo], confiance: 'probable' });
    const b = qualifierDecision({ sources: [histo, regle, piece], confiance: 'probable' });
    expect(a).toEqual(b);
    const d1 = indicateurSources([{ id: 'b', sources: [] }, { id: 'a', sources: [] }, { id: 'c', sources: [param] }]);
    const d2 = indicateurSources([{ id: 'c', sources: [param] }, { id: 'a', sources: [] }, { id: 'b', sources: [] }]);
    expect(d1).toEqual(d2);
    expect(d1.hypotheses).toEqual(['a', 'b']);
  });
});
