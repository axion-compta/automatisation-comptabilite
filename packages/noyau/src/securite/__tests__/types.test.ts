import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  ACTIONS_ECRITURE,
  CANAUX,
  ErreurSecurite,
  EVENEMENTS,
  OPERATIONS_SENSIBLES,
  PERMISSION_DE_L_ACTION,
  PERMISSIONS,
  RAISONS,
  ROLES,
  estAction,
  estCanal,
  estPermission,
  estRaison,
  estRole,
} from '../types.js';

const unique = (l: readonly string[]) => new Set(l).size === l.length;

describe('securite/types', () => {
  it('onze-permissions-uniques', () => {
    expect(PERMISSIONS).toHaveLength(11);
    expect(unique(PERMISSIONS)).toBe(true);
    expect(PERMISSIONS.length).toBeLessThan(51);
    expect(ROLES).toHaveLength(6);
    expect(unique(ROLES)).toBe(true);
    expect(ACTIONS).toHaveLength(14);
    expect(unique(ACTIONS)).toBe(true);
    expect(CANAUX).toHaveLength(6);
    expect(unique(CANAUX)).toBe(true);
  });

  it('chaque-action-a-une-permission-connue', () => {
    expect(Object.keys(PERMISSION_DE_L_ACTION).sort()).toEqual([...ACTIONS].sort());
    for (const a of ACTIONS) expect(PERMISSIONS).toContain(PERMISSION_DE_L_ACTION[a]);
    expect(PERMISSION_DE_L_ACTION.lever_majeur).toBe('compta-valider');
    expect(PERMISSION_DE_L_ACTION.proposer_actions_automatiques).toBe('compta-parametrer');
    expect(PERMISSION_DE_L_ACTION.assimiler_factures_autre_nom).toBe('compta-valider');
    expect(PERMISSION_DE_L_ACTION.gerer_equipe).toBe('compta-equipe');
    expect(Object.isFrozen(PERMISSION_DE_L_ACTION)).toBe(true);
  });

  it('huit-operations-sensibles-uniques', () => {
    expect(OPERATIONS_SENSIBLES).toHaveLength(8);
    expect(unique(OPERATIONS_SENSIBLES)).toBe(true);
  });

  it('raisons-en-snake-case', () => {
    expect(RAISONS).toHaveLength(18);
    expect(unique(RAISONS)).toBe(true);
    for (const r of RAISONS) expect(r).toMatch(/^[a-z_]+$/);
  });

  it('evenements-domaine-point-action', () => {
    expect(EVENEMENTS).toHaveLength(12);
    expect(unique(EVENEMENTS)).toBe(true);
    for (const e of EVENEMENTS) expect(e).toMatch(/^[a-z]+\.[a-z_]+$/);
  });

  it('actions-ecriture-sans-lecture', () => {
    expect(ACTIONS_ECRITURE).not.toContain('lire');
    expect(ACTIONS_ECRITURE).not.toContain('commenter');
    expect(ACTIONS_ECRITURE).not.toContain('voir_piece_sensible');
    expect(ACTIONS_ECRITURE).toHaveLength(ACTIONS.length - 3);
    for (const a of ACTIONS_ECRITURE) expect(ACTIONS).toContain(a);
    expect(Object.isFrozen(ACTIONS_ECRITURE)).toBe(true);
  });

  it('gardes-de-type-refusent-casse-et-vide', () => {
    const gardes = [
      [estRole, ROLES],
      [estPermission, PERMISSIONS],
      [estAction, ACTIONS],
      [estRaison, RAISONS],
      [estCanal, CANAUX],
    ] as const;
    for (const [g, liste] of gardes) {
      for (const v of liste) {
        expect(g(v)).toBe(true);
        expect(g(v.toUpperCase())).toBe(false);
        expect(g(` ${v}`)).toBe(false);
      }
      for (const mauvais of ['Lecture', '', ' lecture', undefined, null, 42, {}, ['lecture']]) {
        expect(g(mauvais)).toBe(false);
      }
    }
    expect(estRole('lecture')).toBe(true);
    expect(estRole('compta-lire')).toBe(false);
  });

  it('erreur-securite-porte-son-code', () => {
    const e = new ErreurSecurite('role_lecture');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ErreurSecurite);
    expect(e.code).toBe('role_lecture');
    expect(e.message).toBe('role_lecture');
    expect(e.name).toBe('ErreurSecurite');
    const f = new ErreurSecurite('argument_invalide', 'détail');
    expect(f.code).toBe('argument_invalide');
    expect(f.message).toBe('détail');
  });
});
