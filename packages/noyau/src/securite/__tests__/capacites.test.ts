import { describe, expect, it } from 'vitest';
import { autoriser, type ContexteAutorisation } from '../autoriser.js';
import { capacites } from '../capacites.js';
import { ACTIONS, PERMISSIONS, ErreurSecurite, type Action, type Role } from '../types.js';

const ctx = (role: Role, o: Partial<ContexteAutorisation> = {}): ContexteAutorisation => ({
  role, permissions: [...PERMISSIONS], demande5: true, separationTaches: false, personneId: 'p-1', ...o,
});

describe('securite/capacites', () => {
  it('quatorze-lignes-dans-l-ordre', () => {
    const r = capacites(ctx('utilisateur'));
    expect(r).toHaveLength(ACTIONS.length);
    expect(r.map((l) => l.action)).toEqual([...ACTIONS]);
    for (const l of r) expect(typeof l.permis).toBe('boolean');
  });

  it('lecture-dix-refus-dix-raisons', () => {
    const r = capacites(ctx('lecture', { permissions: ['compta-lire'] }));
    const refus = r.filter((l) => !l.permis);
    expect(refus).toHaveLength(ACTIONS.length - 1);
    expect(refus.length).toBeGreaterThanOrEqual(10);
    for (const l of refus) expect(l.raison).toBe('role_lecture');
    expect(r.find((l) => l.action === 'lire')).toEqual({ action: 'lire', permis: true });
  });

  it('administrateur-tout-permis-sauf-matrice', () => {
    const r = capacites(ctx('administrateur'));
    expect(r.every((l) => l.permis && l.raison === undefined)).toBe(true);
    const sansPermission = capacites(ctx('administrateur', { permissions: [] }));
    expect(sansPermission.every((l) => !l.permis && l.raison === 'role_insuffisant')).toBe(true);
    const comptableSans5 = capacites(ctx('comptable', { demande5: false }));
    expect(comptableSans5.find((l) => l.action === 'cloturer')).toEqual({
      action: 'cloturer', permis: false, raison: 'role_insuffisant',
    });
  });

  it('saisie-seule-raison-du-mode', () => {
    const retirees: Action[] = ['cloturer', 'valider'];
    const mode = { id: 'saisie', actionsRetirees: retirees, raison: 'mode_saisie_seule' as const };
    const r = capacites(ctx('administrateur', { mode }));
    for (const l of r) {
      if (retirees.includes(l.action)) expect(l).toEqual({ action: l.action, permis: false, raison: 'mode_saisie_seule' });
      else expect(l.permis).toBe(true);
    }
  });

  it('meme-resultat-qu-autoriser', () => {
    const roles: Role[] = ['administrateur', 'utilisateur', 'lecture', 'comptable', 'invite_externe', 'personnel_axion'];
    for (const role of roles) {
      for (const demande5 of [true, false]) {
        const c = ctx(role, { demande5, perimetreRespecte: demande5 });
        for (const l of capacites(c)) {
          const d = autoriser(c, l.action);
          expect(l.permis).toBe(d.permis);
          expect(l.raison).toBe(d.permis ? undefined : d.raison);
        }
      }
    }
  });

  it('entree-invalide-et-non-modifiee', () => {
    expect(() => capacites(null as never)).toThrow(ErreurSecurite);
    expect(() => capacites(ctx('inconnu' as Role))).toThrow(ErreurSecurite);
    const c = ctx('utilisateur');
    const copie = JSON.stringify(c);
    capacites(c);
    expect(JSON.stringify(c)).toBe(copie);
  });
});
