import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import type { CaseDeclaration, LigneFormulaire, SourceCase } from '../cases.js';
import { calculerFormules, ErreurFormule } from '../formules.js';

const c = centimes;
const src = (id: string, i = 0): SourceCase => ({ ecritureId: id, ligneIndex: i });
const saisie = (code: string, m: number, sources: SourceCase[] = []): CaseDeclaration => ({ code, montant: c(m), sources, aCalculer: false });
const calcul = (code: string): CaseDeclaration => ({ code, montant: c(0), sources: [], aCalculer: true });
const ali: LigneFormulaire['alimentation'] = { comptes: ['7'], sens: 'credit' };
const table = (lignes: LigneFormulaire[]) => ({ formulaire: 'F', millesime: '2026', lignes });
const formule = (code: string, f: string, base?: boolean): LigneFormulaire => ({ code, formule: f, ...(base ? { base } : {}) });
const saisies: LigneFormulaire[] = [
  { code: 'X01', alimentation: ali },
  { code: 'X02', alimentation: ali },
];
const montants = (r: ReturnType<typeof calculerFormules>): Record<string, Centimes> => {
  if (r.bloque) throw new Error('bloqué');
  return Object.fromEntries(r.cases.map((x) => [x.code, x.montant]));
};
const un = (f: string, a = 100, b = 30) =>
  calculerFormules(table([...saisies, formule('X03', f)]), [saisie('X01', a), saisie('X02', b), calcul('X03')]);

describe('calculerFormules', () => {
  it('addition-et-soustraction', () => {
    expect(montants(un('X01 + X02 - X01 - X02 + X01')).X03).toBe(100);
    expect(montants(un(' X01 -  X02 ')).X03).toBe(70);
    expect(montants(un('X01 + X01')).X03).toBe(200);
    const r = un('X01 + X02');
    expect(!r.bloque && r.cases.find((x) => x.code === 'X03')?.aCalculer).toBe(false);
  });

  it('plancher-zero', () => {
    expect(montants(un('plancher_zero(X02 - X01)')).X03).toBe(0);
    expect(montants(un('plancher_zero(X01 - X02)')).X03).toBe(70);
    expect(montants(un('plancher_zero(plancher_zero(X02 - X01) - X02) + X01')).X03).toBe(100);
    expect(montants(un('X01 - plancher_zero(X01 - X02 - X01)')).X03).toBe(100);
    expect(montants(un('plancher_zero(X01 - X01)')).X03).toBe(0);
  });

  it('dependances-dans-le-desordre', () => {
    const t = table([formule('X05', 'X04 + X03'), formule('X04', 'X03 - X02'), formule('X03', 'X01 + X02'), ...saisies]);
    const r = calculerFormules(t, [calcul('X05'), calcul('X04'), calcul('X03'), saisie('X01', 100), saisie('X02', 30)]);
    expect(montants(r)).toEqual({ X01: 100, X02: 30, X03: 130, X04: 100, X05: 230 });
    expect(!r.bloque && r.cases.map((x) => x.code)).toEqual(['X05', 'X04', 'X03', 'X01', 'X02']);
  });

  it('chaine-de-50-lignes-sans-depassement', () => {
    const lignes: LigneFormulaire[] = [{ code: 'X01', alimentation: ali }];
    const cases = [saisie('X01', 2)];
    for (let i = 50; i >= 1; i -= 1) lignes.push(formule(`L${i}`, i === 1 ? 'X01' : `L${i - 1} + X01`));
    for (let i = 50; i >= 1; i -= 1) cases.push(calcul(`L${i}`));
    expect(montants(calculerFormules(table(lignes), cases)).L50).toBe(100);
  });

  it('sources-unies-et-triees', () => {
    const t = table([...saisies, formule('X03', 'X02 + X01 + plancher_zero(X02)')]);
    const r = calculerFormules(t, [saisie('X01', 5, [src('e2', 1), src('e1', 0)]), saisie('X02', 5, [src('e2', 1), src('e1', 2), src('e1', 10)]), calcul('X03')]);
    expect(!r.bloque && r.cases[2]?.sources).toEqual([src('e1', 0), src('e1', 2), src('e1', 10), src('e2', 1)]);
  });

  it('ligne-absente-bloque-avec-le-code', () => {
    expect(un('X01 + X99')).toEqual({ bloque: true, code: 'ligne_absente', ligne: 'X99' });
    expect(un('plancher_zero(X98)')).toEqual({ bloque: true, code: 'ligne_absente', ligne: 'X98' });
    const sansCase = calculerFormules(table([...saisies, formule('X03', 'X01')]), [saisie('X01', 1), calcul('X03')]);
    expect(sansCase).toEqual({ bloque: true, code: 'ligne_absente', ligne: 'X02' });
  });

  it('cycle-detecte', () => {
    const t = table([formule('X01', 'X02'), formule('X02', 'X03 + X04'), formule('X03', 'X01'), { code: 'X04', alimentation: ali }]);
    const cases = [calcul('X01'), calcul('X02'), calcul('X03'), saisie('X04', 1)];
    const e = (() => {
      try {
        calculerFormules(t, cases);
      } catch (x) {
        return x as ErreurFormule;
      }
      return undefined;
    })();
    expect(e).toBeInstanceOf(ErreurFormule);
    expect(e?.code).toBe('formule_cyclique');
    expect([...(e?.codes ?? [])].sort()).toEqual(['X01', 'X02', 'X03']);
    expect(() => calculerFormules(table([formule('X01', 'X01 + X01')]), [calcul('X01')])).toThrowError(ErreurFormule);
  });

  it('base-negative-bloque', () => {
    const t = table([...saisies, formule('X03', 'X02 - X01', true)]);
    const r = calculerFormules(t, [saisie('X01', 100), saisie('X02', 30), calcul('X03')]);
    expect(r).toEqual({ bloque: true, code: 'base_negative', ligne: 'X03', montant: -70 });
    const ok = calculerFormules(table([...saisies, formule('X03', 'X02 - X02', true)]), [saisie('X01', 1), saisie('X02', 3), calcul('X03')]);
    expect(ok.bloque).toBe(false);
    const saisieNegative = calculerFormules(table([{ code: 'X01', alimentation: ali, base: true }]), [saisie('X01', -1)]);
    expect(saisieNegative).toMatchObject({ bloque: true, code: 'base_negative', ligne: 'X01' });
  });

  it.each(['X01 * 2', 'X01; X02', 'X01 / X02', 'x01', 'X01 $', '2 * X01', 'eval(X01)', 'plancher_zero (X01)'])('caractere-interdit-refuse %s', (f) => {
    expect(() => un(f)).toThrowError(ErreurFormule);
    try {
      un(f);
    } catch (x) {
      expect((x as ErreurFormule).code).toBe('formule_invalide');
    }
  });

  it.each(['', '   ', 'X01 +', '+ X01', '- X01', 'X01 X02', 'X01 + + X02', 'plancher_zero(X01', 'plancher_zero()', 'X01)', '(X01)', 'plancher_zero(X01))'])(
    'formule-malformee-refusee %j',
    (f) => {
      expect(() => un(f)).toThrowError(ErreurFormule);
    },
  );
});
