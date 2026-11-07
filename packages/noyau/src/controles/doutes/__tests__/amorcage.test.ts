import { describe, expect, it } from 'vitest';
import { ErreurControle } from '../../regles/commun.js';
import {
  appliquerDecision,
  etatInitial,
  planDecisions,
  rapportReprise,
  type CasAmorcage,
} from '../amorcage.js';

const cas = (id: string, cause: string, fournisseurId: string): CasAmorcage => ({ id, cause, fournisseurId });

describe('amorçage (C4)', () => {
  it('CT-37', () => {
    // 400 pièces, 60 cas : 6 causes x 5 fournisseurs fictifs, 2 cas chacun.
    const tous: CasAmorcage[] = [];
    for (let i = 0; i < 400; i += 1) {
      if (i < 60) tous.push(cas('p' + String(i), 'cause' + String(i % 6), 'f' + String(i % 5)));
    }
    expect(tous).toHaveLength(60);
    const { decisions } = planDecisions(tous);
    expect(decisions.length).toBeLessThanOrEqual(50);
    expect(decisions.reduce((n, d) => n + d.casIds.length, 0)).toBe(60);
    let etat = etatInitial(tous);
    for (const d of decisions) etat = appliquerDecision(etat, d);
    expect(rapportReprise(etat)).toEqual({ cas: 60, decisions: decisions.length, restants: 0 });
  });

  it('une-decision-par-couple', () => {
    const { decisions } = planDecisions([cas('a', 'x', 'f1'), cas('b', 'x', 'f1'), cas('c', 'x', 'f2'), cas('d', 'y', 'f1')]);
    expect(decisions).toHaveLength(3);
    expect(decisions[0]).toEqual({ cause: 'x', fournisseurId: 'f1', casIds: ['a', 'b'] });
  });

  it('tri-stable', () => {
    const entree = [cas('1', 'b', 'f2'), cas('2', 'a', 'f2'), cas('3', 'a', 'f1'), cas('4', 'c', 'f1'), cas('5', 'c', 'f1')];
    const attendu = [
      ['c', 'f1'],
      ['a', 'f1'],
      ['a', 'f2'],
      ['b', 'f2'],
    ];
    const lire = (c: CasAmorcage[]) => planDecisions(c).decisions.map((d) => [d.cause, d.fournisseurId]);
    expect(lire(entree)).toEqual(attendu);
    expect(lire([...entree].reverse())).toEqual(attendu);
    expect(planDecisions([cas('z', 'a', 'f1'), cas('y', 'a', 'f1')]).decisions[0]?.casIds).toEqual(['y', 'z']);
  });

  it('etat-non-modifie', () => {
    const e0 = etatInitial([cas('a', 'x', 'f1'), cas('b', 'x', 'f1')]);
    const copie = JSON.stringify(e0);
    const e1 = appliquerDecision(e0, { cause: 'x', fournisseurId: 'f1', casIds: ['a'] });
    expect(JSON.stringify(e0)).toBe(copie);
    expect(e1).not.toBe(e0);
    expect(rapportReprise(e0).decisions).toBe(0);
  });

  it('rapport-apres-chaque-decision', () => {
    const tous = [cas('a', 'x', 'f1'), cas('b', 'x', 'f1'), cas('c', 'y', 'f2')];
    let etat = etatInitial(tous);
    expect(rapportReprise(etat)).toEqual({ cas: 3, decisions: 0, restants: 3 });
    const [d1, d2] = planDecisions(tous).decisions;
    etat = appliquerDecision(etat, d1!);
    expect(rapportReprise(etat)).toEqual({ cas: 3, decisions: 1, restants: 1 });
    etat = appliquerDecision(etat, d2!);
    expect(rapportReprise(etat)).toEqual({ cas: 3, decisions: 2, restants: 0 });
  });

  it('aucun-cas', () => {
    expect(planDecisions([])).toEqual({ decisions: [] });
    expect(rapportReprise(etatInitial([]))).toEqual({ cas: 0, decisions: 0, restants: 0 });
  });

  it('decision-inconnue-exception', () => {
    const etat = etatInitial([cas('a', 'x', 'f1'), cas('b', 'x', 'f1')]);
    const ok = { cause: 'x', fournisseurId: 'f1', casIds: ['a'] };
    const refus = (d: typeof ok, e = etat) => {
      try {
        appliquerDecision(e, d);
      } catch (err) {
        expect(err).toBeInstanceOf(ErreurControle);
        return (err as ErreurControle).code;
      }
      return 'aucune';
    };
    expect(refus({ ...ok, casIds: ['inconnu'] })).toBe('entree_invalide');
    expect(refus({ ...ok, casIds: [] })).toBe('entree_invalide');
    expect(refus({ ...ok, casIds: ['a', 'a'] })).toBe('entree_invalide');
    expect(refus({ ...ok, cause: 'autre' })).toBe('entree_invalide');
    expect(refus({ ...ok, fournisseurId: 'f9' })).toBe('entree_invalide');
    expect(refus(ok, appliquerDecision(etat, ok))).toBe('entree_invalide');
    expect(refus(ok)).toBe('aucune');
    expect(() => planDecisions([cas('a', 'x', 'f1'), cas('a', 'y', 'f2')])).toThrow(ErreurControle);
  });
});
