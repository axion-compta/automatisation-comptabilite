import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import { evaluerSources } from '../aucun-doute.js';
import type { Source } from '../aucun-doute.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const src = (plus: Partial<Source> = {}): Source => ({ origine: 'document', valeur: 'SARL', confiance: 'sur', dateSource: '2026-03-01', ref: 'r1', ...plus });
const reglage = (dateDuJour = '2026-06-01', fraicheurMois = 12): { dateDuJour: string; fraicheurMois: number } => ({ dateDuJour, fraicheurMois });

describe('règle aucun doute', () => {
  it('deux-sources-recentes-concordantes-p05', () => {
    const r = evaluerSources([src(), src({ origine: 'sirene', ref: 'r2' })], reglage());
    expect(r).toEqual({ decision: 'confirme_sans_question', motifs: [], valeurs: ['SARL'], origines: ['document', 'sirene'] });
  });
  it('kbis-ancien-seul-p05', () => {
    const r = evaluerSources([src({ dateSource: '2024-01-01' })], reglage());
    expect(r.decision).toBe('a_confirmer');
    expect(r.motifs).toEqual(['une_seule_source', 'source_ancienne']);
  });
  it('contradiction-sarl-sas', () => {
    const r = evaluerSources([src({ valeur: 'SAS', origine: 'sirene' }), src()], reglage());
    expect(r.decision).toBe('a_confirmer');
    expect(r.motifs).toEqual(['contradiction']);
    expect(r.valeurs).toEqual(['SARL', 'SAS']);
  });
  it('confiance-douteuse', () => {
    for (const confiance of ['a_verifier', 'douteux'] as const) {
      const r = evaluerSources([src(), src({ confiance })], reglage());
      expect(r.motifs).toEqual(['confiance_insuffisante']);
      expect(r.decision).toBe('a_confirmer');
    }
  });
  it('aucune-source', () => {
    expect(evaluerSources([], reglage())).toEqual({ decision: 'a_confirmer', motifs: ['aucune_source'], valeurs: [], origines: [] });
  });
  it('fraicheur-a-la-borne', () => {
    const motifs = (dateSource: string, dateDuJour: string, f = 12): string[] => evaluerSources([src({ dateSource }), src({ dateSource })], reglage(dateDuJour, f)).motifs;
    expect(motifs('2025-06-15', '2026-06-15')).toEqual(['source_ancienne']);
    expect(motifs('2025-06-15', '2026-06-14')).toEqual([]);
    expect(motifs('2025-06-15', '2026-06-16')).toEqual(['source_ancienne']);
    expect(motifs('2026-01-31', '2026-02-28', 1)).toEqual(['source_ancienne']);
    expect(motifs('2026-01-31', '2026-02-27', 1)).toEqual([]);
    expect(motifs('2024-01-31', '2024-02-29', 1)).toEqual(['source_ancienne']);
    expect(motifs('2024-01-31', '2024-02-28', 1)).toEqual([]);
    expect(motifs('2025-12-15', '2026-01-15', 1)).toEqual(['source_ancienne']);
    expect(motifs('2025-12-15', '2026-01-14', 1)).toEqual([]);
    expect(motifs('2026-01-01', '2026-06-01', 999999999)).toEqual([]);
  });
  it('normalisation-casse-espaces', () => {
    const r = evaluerSources([src({ valeur: ' sarl ' }), src({ valeur: 'SARL' })], reglage());
    expect(r.decision).toBe('confirme_sans_question');
    expect(r.valeurs).toEqual(['SARL']);
  });
  it('ordre-des-sources-sans-effet', () => {
    const l = [src({ dateSource: '2024-01-01', valeur: 'sas' }), src({ origine: 'sirene', valeur: 'SAS' }), src({ valeur: 'SARL', confiance: 'douteux' })];
    const a = evaluerSources(l, reglage());
    expect(evaluerSources([...l].reverse(), reglage())).toEqual(a);
    expect(evaluerSources([l[1] as Source, l[2] as Source, l[0] as Source], reglage())).toEqual(a);
    expect(a.motifs).toEqual(['contradiction', 'confiance_insuffisante']);
  });
  it('entrees-invalides', () => {
    const un = [src()];
    for (const f of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) expect(code(() => evaluerSources(un, reglage('2026-06-01', f)))).toBe('fraicheur_invalide');
    expect(code(() => evaluerSources([src({ dateSource: '2026-06-02' })], reglage()))).toBe('date_future');
    expect(code(() => evaluerSources([src({ dateSource: '2026-02-30' })], reglage()))).toBe('date_invalide');
    expect(code(() => evaluerSources(un, reglage('2026-6-1')))).toBe('date_invalide');
    expect(code(() => evaluerSources([src({ dateSource: '2026-06-01' })], reglage()))).toBeUndefined();
  });
});
