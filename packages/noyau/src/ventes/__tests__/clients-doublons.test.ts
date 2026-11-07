import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { doublonsProbables, natureALaDate, peutDesactiver, planFusion } from '../clients-doublons.js';


const cl = (code: string, nom: string, o: Record<string, string> = {}) => ({ code, nom, creeLe: '2026-01-10', ...o });
const paires = (liste: ReturnType<typeof cl>[]) => doublonsProbables(liste).map((p) => [p.a.code, p.b.code, p.motif]);

describe('clients doublons', () => {
  it('meme-siren-sous-deux-noms', () => {
    const r = paires([
      cl('C002', 'SCI Marceau', { siren: '123 456 782' }),
      cl('C001', 'Immobilière Marceau', { siren: '123456782' }),
      cl('C003', 'Autre', { siren: '987654321' }),
    ]);
    expect(r).toEqual([['C001', 'C002', 'meme_siren']]);
    expect(paires([cl('C1', 'A', { siren: '' }), cl('C2', 'B', { siren: '  ' })])).toEqual([]);
  });

  it('meme-nom-et-code-postal', () => {
    const r = paires([cl('C1', 'Café  des Arts', { codePostal: '75001' }), cl('C2', 'CAFE DES ARTS!', { codePostal: '75001' })]);
    expect(r).toEqual([['C1', 'C2', 'meme_nom_et_code_postal']]);
    expect(paires([cl('C1', 'Café', { siren: '123456782', codePostal: '75001' }), cl('C2', 'Café', { siren: '123456782', codePostal: '75001' })]))
      .toEqual([['C1', 'C2', 'meme_siren']]);
  });

  it('meme-nom-code-postal-different-pas-doublon', () => {
    expect(paires([cl('C1', 'Café', { codePostal: '75001' }), cl('C2', 'Café', { codePostal: '69001' })])).toEqual([]);
    expect(paires([cl('C1', 'Café'), cl('C2', 'Café')])).toEqual([]);
    expect(paires([cl('C1', 'Café', { codePostal: '75001' }), cl('C2', 'Bar', { codePostal: '75001' })])).toEqual([]);
    expect(paires([cl('C1', '!!', { codePostal: '75001' }), cl('C2', '??', { codePostal: '75001' })])).toEqual([]);
  });

  it('paire-unique-ordre-stable', () => {
    const t = [
      cl('C3', 'Marceau', { siren: '123456782', codePostal: '75001' }),
      cl('C1', 'Marceau', { siren: '123456782', codePostal: '75001' }),
      cl('C2', 'Marceau', { siren: '123456782', codePostal: '75001' }),
      cl('C4', 'Zèbre', { codePostal: '69001' }),
      cl('C5', 'zebre', { codePostal: '69001' }),
    ];
    const attendu = [['C1', 'C2', 'meme_siren'], ['C1', 'C3', 'meme_siren'], ['C2', 'C3', 'meme_siren'], ['C4', 'C5', 'meme_nom_et_code_postal']];
    expect(paires(t)).toEqual(attendu);
    expect(paires([...t].reverse())).toEqual(attendu);
    expect(paires([t[3]!, t[0]!, t[4]!, t[2]!, t[1]!])).toEqual(attendu);
  });

  it('fusion-garde-le-plus-ancien', () => {
    const vieux = cl('C9', 'A', { creeLe: '2025-05-01' });
    const jeune = cl('C1', 'A', { creeLe: '2026-05-01' });
    expect(planFusion(jeune, vieux)).toEqual({ codeConserve: 'C9', codeRetire: 'C1' });
    expect(planFusion(vieux, jeune)).toEqual({ codeConserve: 'C9', codeRetire: 'C1' });
    const m = planFusion(cl('C2', 'A'), cl('C1', 'B'));
    expect(m).toEqual({ codeConserve: 'C1', codeRetire: 'C2' });
    expect(planFusion(cl('C1', 'A'), cl('C2', 'B'))).toEqual(m);
  });

  it('solde-non-nul-pas-de-desactivation', () => {
    expect(peutDesactiver(centimes(0))).toBe(true);
    expect(peutDesactiver(centimes(-0))).toBe(true);
    expect(peutDesactiver(centimes(1))).toBe(false);
    expect(peutDesactiver(centimes(-1))).toBe(false);
  });

  it('particulier-devenu-professionnel-date', () => {
    const h = [
      { nature: 'professionnel', depuis: '2026-06-01' },
      { nature: 'particulier', depuis: '2024-01-01' },
    ] as const;
    expect(natureALaDate(h, '2026-05-31')).toBe('particulier');
    expect(natureALaDate(h, '2026-06-01')).toBe('professionnel');
    expect(natureALaDate(h, '2030-01-01')).toBe('professionnel');
    expect(natureALaDate(h, '2023-12-31')).toBe('a_confirmer');
    expect(natureALaDate([], '2026-01-01')).toBe('a_confirmer');
  });

  it('entrees-invalides', () => {
    expect(doublonsProbables([])).toEqual([]);
    expect(doublonsProbables([cl('C1', 'A')])).toEqual([]);
    for (const creeLe of ['2026-02-30', '', 'hier']) {
      expect(() => doublonsProbables([cl('C1', 'A', { creeLe })])).toThrow();
      expect(() => planFusion(cl('C1', 'A', { creeLe }), cl('C2', 'B'))).toThrow();
      expect(() => planFusion(cl('C2', 'B'), cl('C1', 'A', { creeLe }))).toThrow();
    }
    expect(() => doublonsProbables([cl('', 'A')])).toThrow();
    expect(() => planFusion(cl('C1', 'A'), cl('C1', 'A'))).toThrow();
    for (const s of [Number.NaN, 1.5, Infinity]) expect(() => peutDesactiver(s as Centimes)).toThrow();
    expect(() => peutDesactiver(undefined as never)).toThrow();
    expect(() => natureALaDate([], '2026-13-01')).toThrow();
    expect(() => natureALaDate([{ nature: 'particulier', depuis: 'x' }], '2026-01-01')).toThrow();
    expect(() => natureALaDate([{ nature: 'robot' as never, depuis: '2026-01-01' }], '2026-01-01')).toThrow();
  });
});
