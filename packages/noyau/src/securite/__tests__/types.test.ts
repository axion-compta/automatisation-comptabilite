import { describe, expect, it } from 'vitest';
import * as T from '../types.js';

const { ACTIONS, PERMISSIONS, RAISONS, ROLES, CANAUX } = T;
const unique = (l: readonly string[]) => new Set(l).size === l.length;

describe('securite/types', () => {
  it('onze-permissions-uniques', () => {
    expect(PERMISSIONS).toHaveLength(11);
    expect(PERMISSIONS.length).toBeLessThan(51);
    const tailles = [[ROLES, 6], [ACTIONS, 14], [CANAUX, 6], [T.OPERATIONS_SENSIBLES, 8], [T.EVENEMENTS, 12], [RAISONS, 18]] as const;
    for (const [l, n] of tailles) expect(l).toHaveLength(n);
    for (const l of [PERMISSIONS, ...tailles.map((t) => t[0])]) expect(unique(l)).toBe(true);
  });

  it('chaque-action-a-une-permission-connue', () => {
    const m = T.PERMISSION_DE_L_ACTION;
    expect(Object.keys(m).sort()).toEqual([...ACTIONS].sort());
    for (const a of ACTIONS) expect(PERMISSIONS).toContain(m[a]);
    expect(m.lever_majeur).toBe('compta-valider');
    expect(m.proposer_actions_automatiques).toBe('compta-parametrer');
    expect(m.assimiler_factures_autre_nom).toBe('compta-valider');
    expect(m.gerer_equipe).toBe('compta-equipe');
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('huit-operations-sensibles-uniques', () => {
    expect(T.OPERATIONS_SENSIBLES).toHaveLength(8);
    expect(T.OPERATIONS_SENSIBLES).toContain('exporter_fec');
  });

  it('raisons-en-snake-case', () => {
    for (const r of RAISONS) expect(r).toMatch(/^[a-z_]+$/);
  });

  it('evenements-domaine-point-action', () => {
    for (const e of T.EVENEMENTS) expect(e).toMatch(/^[a-z]+\.[a-z_]+$/);
  });

  it('actions-ecriture-sans-lecture', () => {
    const e = T.ACTIONS_ECRITURE;
    for (const a of ['lire', 'commenter', 'voir_piece_sensible']) expect(e).not.toContain(a);
    expect(e).toHaveLength(ACTIONS.length - 3);
    for (const a of e) expect(ACTIONS).toContain(a);
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('gardes-de-type-refusent-casse-et-vide', () => {
    const gardes = [[T.estRole, ROLES], [T.estPermission, PERMISSIONS], [T.estAction, ACTIONS], [T.estRaison, RAISONS], [T.estCanal, CANAUX]] as const;
    for (const [g, liste] of gardes) {
      for (const v of liste) {
        expect(g(v)).toBe(true);
        expect(g(v.toUpperCase())).toBe(false);
        expect(g(` ${v}`)).toBe(false);
      }
      for (const x of ['Lecture', '', ' lecture', undefined, null, 42, {}, ['lecture']]) expect(g(x)).toBe(false);
    }
    expect(T.estRole('compta-lire')).toBe(false);
  });

  it('erreur-securite-porte-son-code', () => {
    const e = new T.ErreurSecurite('role_lecture');
    expect(e).toBeInstanceOf(Error);
    expect([e.code, e.message, e.name]).toEqual(['role_lecture', 'role_lecture', 'ErreurSecurite']);
    const f = new T.ErreurSecurite('argument_invalide', 'détail');
    expect([f.code, f.message]).toEqual(['argument_invalide', 'détail']);
  });
});
