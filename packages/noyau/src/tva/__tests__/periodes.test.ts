import { describe, expect, it } from 'vitest';
import { ErreurPeriodeTva, changerStatut, periodesTva } from '../periodes.js';
import type { PeriodeTva, StatutPeriodeTva } from '../periodes.js';
import type { PeriodeRegime } from '../regime.js';

const reg = (extra: Partial<PeriodeRegime> = {}): PeriodeRegime => ({
  effetDebut: '2020-01-01', effetFin: null, regime: 'reel_normal', periodicite: 'mensuelle',
  exigibiliteServices: 'encaissements', formulaire: 'FORM-A', ...extra,
});
const bornes = (l: { debut: string; fin: string }[]): string[] => l.map((p) => `${p.debut}>${p.fin}`);
const code = (f: () => unknown): unknown => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const periode = (statut: StatutPeriodeTva): PeriodeTva => ({ debut: '2025-01-01', fin: '2025-01-31', periodicite: 'mensuelle', formulaire: 'FORM-A', statut });

describe('périodes de TVA', () => {
  it('douze-mois', () => {
    const l = periodesTva({ debut: '2025-01-01', fin: '2025-12-31' }, [reg()]);
    expect(l).toHaveLength(12);
    expect(bornes(l).slice(0, 2)).toEqual(['2025-01-01>2025-01-31', '2025-02-01>2025-02-28']);
    expect(l[11]).toMatchObject({ debut: '2025-12-01', fin: '2025-12-31', periodicite: 'mensuelle', formulaire: 'FORM-A' });
  });

  it('quatre-trimestres-civils', () => {
    const l = periodesTva({ debut: '2025-01-01', fin: '2025-12-31' }, [reg({ periodicite: 'trimestrielle' })]);
    expect(bornes(l)).toEqual(['2025-01-01>2025-03-31', '2025-04-01>2025-06-30', '2025-07-01>2025-09-30', '2025-10-01>2025-12-31']);
  });

  it('exercice-decale-trimestres-coupes', () => {
    const l = periodesTva({ debut: '2025-07-01', fin: '2026-06-30' }, [reg({ periodicite: 'trimestrielle' })]);
    expect(bornes(l)).toEqual(['2025-07-01>2025-09-30', '2025-10-01>2025-12-31', '2026-01-01>2026-03-31', '2026-04-01>2026-06-30']);
    const c = periodesTva({ debut: '2025-02-15', fin: '2025-07-10' }, [reg({ periodicite: 'trimestrielle' })]);
    expect(bornes(c)).toEqual(['2025-02-15>2025-03-31', '2025-04-01>2025-06-30', '2025-07-01>2025-07-10']);
  });

  it('changement-de-regime-coupe', () => {
    const h = [reg({ effetFin: '2025-05-01', periodicite: 'trimestrielle' }), reg({ effetDebut: '2025-05-01', periodicite: 'mensuelle', formulaire: 'FORM-B' })];
    const l = periodesTva({ debut: '2025-01-01', fin: '2025-06-30' }, h);
    expect(bornes(l)).toEqual(['2025-01-01>2025-03-31', '2025-04-01>2025-04-30', '2025-05-01>2025-05-31', '2025-06-01>2025-06-30']);
    expect(l.map((p) => p.formulaire)).toEqual(['FORM-A', 'FORM-A', 'FORM-B', 'FORM-B']);
  });

  it('franchise-aucune-periode', () => {
    for (const regime of ['franchise', 'non_assujetti'] as const) {
      expect(periodesTva({ debut: '2025-01-01', fin: '2025-12-31' }, [reg({ regime })])).toEqual([]);
    }
    const h = [reg({ effetFin: '2025-07-01', regime: 'franchise' }), reg({ effetDebut: '2025-07-01' })];
    expect(bornes(periodesTva({ debut: '2025-01-01', fin: '2025-09-30' }, h))).toEqual(['2025-07-01>2025-07-31', '2025-08-01>2025-08-31', '2025-09-01>2025-09-30']);
  });

  it('cycle-complet-avec-accuse', () => {
    let p = periode('ouverte');
    p = changerStatut(p, 'preparee', {});
    p = changerStatut(p, 'validee', {});
    p = changerStatut(p, 'deposee_par_client', { accusePieceId: 'piece-1' });
    expect(p.accusePieceId).toBe('piece-1');
    p = changerStatut(p, 'verrouillee', {});
    expect(p.statut).toBe('verrouillee');
    expect(changerStatut(periode('preparee'), 'ouverte', {}).statut).toBe('ouverte');
    const avant = periode('ouverte');
    changerStatut(avant, 'preparee', {});
    expect(avant.statut).toBe('ouverte');
  });

  it('accuse-obligatoire', () => {
    for (const accusePieceId of [undefined, '', '  ']) {
      expect(code(() => changerStatut(periode('validee'), 'deposee_par_client', { accusePieceId }))).toBe('accuse_manquant');
    }
  });

  it('pas-de-retour-apres-depot', () => {
    expect(code(() => changerStatut(periode('validee'), 'ouverte', {}))).toBe('transition_interdite');
    expect(code(() => changerStatut(periode('deposee_par_client'), 'ouverte', {}))).toBe('periode_deposee');
    expect(code(() => changerStatut(periode('verrouillee'), 'ouverte', {}))).toBe('periode_deposee');
    expect(code(() => changerStatut(periode('deposee_par_client'), 'preparee', {}))).toBe('transition_interdite');
    expect(code(() => changerStatut(periode('verrouillee'), 'verrouillee', {}))).toBe('transition_interdite');
    expect(code(() => changerStatut(periode('ouverte'), 'validee', {}))).toBe('transition_interdite');
    expect(code(() => changerStatut(periode('ouverte'), 'inconnu' as never, {}))).toBe('transition_interdite');
    expect(code(() => changerStatut(periode('inconnu' as never), 'preparee', {}))).toBe('transition_interdite');
  });

  it('cas-limites', () => {
    expect(bornes(periodesTva({ debut: '2025-03-01', fin: '2025-03-31' }, [reg()]))).toEqual(['2025-03-01>2025-03-31']);
    expect(bornes(periodesTva({ debut: '2025-03-01', fin: '2025-03-31' }, [reg({ periodicite: 'trimestrielle' })]))).toEqual(['2025-03-01>2025-03-31']);
    expect(bornes(periodesTva({ debut: '2025-03-01', fin: '2025-03-31' }, [reg({ periodicite: 'annuelle' })]))).toEqual(['2025-03-01>2025-03-31']);
    const dixHuit = periodesTva({ debut: '2025-01-01', fin: '2026-06-30' }, [reg({ periodicite: 'trimestrielle' })]);
    expect(dixHuit).toHaveLength(6);
    const decale = periodesTva({ debut: '2025-02-01', fin: '2026-07-31' }, [reg({ periodicite: 'trimestrielle' })]);
    expect(bornes(decale)[0]).toBe('2025-02-01>2025-03-31');
    expect(bornes(decale).at(-1)).toBe('2026-07-01>2026-07-31');
    expect(periodesTva({ debut: '2025-01-01', fin: '2025-12-31' }, [reg({ periodicite: 'annuelle' })])).toHaveLength(1);
    expect(code(() => periodesTva({ debut: '2025-01-01', fin: '2025-12-31' }, []))).toBe('regime_absent');
    expect(code(() => periodesTva({ debut: '2025-12-31', fin: '2025-01-01' }, [reg()]))).toBe('exercice_invalide');
    expect(code(() => periodesTva({ debut: '2025-13-01', fin: '2025-12-31' }, [reg()]))).toBe('exercice_invalide');
    expect(new ErreurPeriodeTva('transition_interdite')).toBeInstanceOf(Error);
  });
});
