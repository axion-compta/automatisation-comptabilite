import { describe, expect, it } from 'vitest';
import { CODES_BLOC, type Periode } from '../../interface/types.js';
import { assemblerTableau, blocTva, construireBloc, ErreurBloc } from '../blocs.js';

const P: Periode = { debut: '2026-01-01', fin: '2026-01-31' };
const panne = (): never => {
  throw new Error('panne fictive');
};

describe('blocs du tableau de bord', () => {
  it('bloc-ok', () => {
    const b = construireBloc('tresorerie', P, () => ({ solde: 12 }));
    expect(b).toMatchObject({ code: 'tresorerie', etat: 'ok', periode: P, donnees: { solde: 12 } });
    expect(typeof b.mot).toBe('string');
    expect(construireBloc('resultat', P, () => 0).etat).toBe('ok');
  });

  it('bloc-vide-avec-mot', () => {
    const b = construireBloc('transactions', P, () => undefined);
    expect(b.etat).toBe('vide');
    expect(b.mot).toBe('vide_transactions');
    expect('donnees' in b).toBe(false);
  });

  it('exception-donne-impossible-sans-donnees', () => {
    const b = construireBloc('resultat', P, panne);
    expect(b.etat).toBe('impossible');
    expect(b.mot).toBe('calcul_impossible');
    expect('donnees' in b).toBe(false);
  });

  it('une-panne-n-atteint-pas-les-autres', () => {
    const t = assemblerTableau(P, { tresorerie: () => 1, resultat: panne, a_faire: () => 3 });
    const etats = Object.fromEntries(t.map((b) => [b.code, b.etat]));
    expect(etats.resultat).toBe('impossible');
    expect(etats.tresorerie).toBe('ok');
    expect(etats.a_faire).toBe('ok');
    expect(t.find((b) => b.code === 'a_faire')?.donnees).toBe(3);
  });

  it('tva-en-doute-aucun-montant', () => {
    let appels = 0;
    const b = blocTva(P, 3, () => {
      appels += 1;
      return { montant: 99 };
    });
    expect(appels).toBe(0);
    expect(b).toMatchObject({ code: 'tva_impots', etat: 'impossible', mot: 'pieces_a_regarder' });
    expect(b.donnees).toEqual({ piecesEnDoute: 3 });
    expect(JSON.stringify(b)).not.toContain('montant');
    expect(JSON.stringify(b)).not.toContain('estim');
  });

  it('tva-sans-doute-calculee', () => {
    const b = blocTva(P, 0, () => ({ montant: 5 }));
    expect(b).toMatchObject({ code: 'tva_impots', etat: 'ok', donnees: { montant: 5 } });
    expect(blocTva(P, 0, () => undefined).etat).toBe('vide');
    expect(blocTva(P, 0, panne).etat).toBe('impossible');
  });

  it('pieces-en-doute-invalides', () => {
    for (const n of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      let appels = 0;
      expect(() =>
        blocTva(P, n, () => {
          appels += 1;
          return 1;
        }),
      ).toThrow(ErreurBloc);
      expect(appels).toBe(0);
    }
    try {
      blocTva(P, -1, () => 1);
    } catch (e) {
      expect((e as ErreurBloc).code).toBe('pieces_en_doute_invalides');
    }
  });

  it('huit-blocs-dans-l-ordre', () => {
    const t = assemblerTableau(P, {});
    expect(t.map((b) => b.code)).toEqual([...CODES_BLOC]);
    expect(t).toHaveLength(8);
    expect(t.every((b) => b.etat === 'vide' && b.periode === P)).toBe(true);
    expect(t[0]?.mot).toBe('vide_tresorerie');
  });
});
