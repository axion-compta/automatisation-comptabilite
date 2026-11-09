import { describe, expect, it } from 'vitest';
import { autoriser, type ContexteAutorisation } from '../autoriser.js';
import { ACTIONS, PERMISSIONS, ErreurSecurite, type Action, type Role } from '../types.js';

const TOUTES = [...PERMISSIONS];
const ctx = (role: Role, o: Partial<ContexteAutorisation> = {}): ContexteAutorisation => ({
  role, permissions: TOUTES, demande5: true, separationTaches: false, personneId: 'p-1', ...o,
});
const raisons = (c: ContexteAutorisation, actions: readonly Action[]) =>
  actions.map((a) => autoriser(c, a));
const refuse = (raison: string) => ({ permis: false, raison });

describe('securite/autoriser', () => {
  it('lecture-refuse-six-ecritures', () => {
    const six: Action[] = ['deposer', 'saisir', 'valider', 'lever_majeur', 'cloturer', 'exporter'];
    expect(raisons(ctx('lecture'), six)).toEqual(six.map(() => refuse('role_lecture')));
    expect(autoriser(ctx('lecture'), 'lire')).toEqual({ permis: true });
  });

  it('utilisateur-leve-majeur-pas-bloquant', () => {
    const u = ctx('utilisateur');
    expect(autoriser(u, 'lever_majeur', { gravite: 'majeur' })).toEqual({ permis: true });
    expect(autoriser(u, 'lever_majeur', { gravite: 'bloquant' })).toEqual(refuse('role_insuffisant'));
    expect(autoriser(u, 'lever_bloquant', { gravite: 'bloquant' })).toEqual(refuse('role_insuffisant'));
    expect(autoriser(ctx('administrateur'), 'lever_majeur', { gravite: 'bloquant' })).toEqual({ permis: true });
  });

  it('personnel-axion-cinq-ecritures-refusees', () => {
    const cinq: Action[] = ['deposer', 'saisir', 'valider', 'lever_bloquant', 'cloturer'];
    expect(raisons(ctx('personnel_axion'), cinq)).toEqual(cinq.map(() => refuse('personnel_axion_lecture_seule')));
    expect(autoriser(ctx('personnel_axion'), 'lire')).toEqual({ permis: true });
    expect(autoriser(ctx('personnel_axion', { permissions: [] }), 'deposer')).toEqual(
      refuse('personnel_axion_lecture_seule'),
    );
  });

  it('comptable-sans-permission-rien', () => {
    for (const demande5 of [true, false]) {
      const r = raisons(ctx('comptable', { permissions: [], demande5 }), ACTIONS);
      expect(r).toHaveLength(14);
      expect(r).toEqual(ACTIONS.map(() => refuse('role_insuffisant')));
    }
  });

  it('saisie-seule-cloture-refusee-avec-raison', () => {
    const mode = { id: 'saisie', actionsRetirees: ['cloturer', 'valider'] as Action[], raison: 'mode_saisie_seule' as const };
    const c = ctx('administrateur', { mode });
    expect(autoriser(c, 'cloturer')).toEqual(refuse('mode_saisie_seule'));
    expect(autoriser(c, 'valider')).toEqual(refuse('mode_saisie_seule'));
    expect(autoriser(c, 'saisir')).toEqual({ permis: true });
    expect(autoriser(ctx('administrateur', { mode: { ...mode, actionsRetirees: [] } }), 'cloturer')).toEqual({ permis: true });
  });

  it('separation-auteur-refuse', () => {
    const c = ctx('utilisateur', { separationTaches: true });
    expect(autoriser(c, 'valider', { auteurId: 'p-1' })).toEqual(refuse('separation_taches'));
  });

  it('separation-inactive-permis', () => {
    const c = ctx('utilisateur', { separationTaches: false });
    expect(autoriser(c, 'valider', { auteurId: 'p-1' })).toEqual({ permis: true });
  });

  it('separation-autre-auteur-permis', () => {
    const c = ctx('utilisateur', { separationTaches: true });
    expect(autoriser(c, 'valider', { auteurId: 'p-2' })).toEqual({ permis: true });
    expect(autoriser(c, 'valider')).toEqual({ permis: true });
    expect(autoriser(ctx('administrateur', { separationTaches: true }), 'valider', { auteurId: 'p-1' })).toEqual({ permis: true });
  });

  it('permission-inconnue-ignoree', () => {
    expect(autoriser(ctx('administrateur', { permissions: ['zzz', ''] }), 'lire')).toEqual(refuse('role_insuffisant'));
    expect(autoriser(ctx('administrateur', { permissions: ['zzz', 'compta-lire'] }), 'lire')).toEqual({ permis: true });
  });

  it('ordre-des-permissions-sans-effet', () => {
    const avant = ACTIONS.map((a) => autoriser(ctx('utilisateur', { permissions: TOUTES }), a));
    const apres = ACTIONS.map((a) => autoriser(ctx('utilisateur', { permissions: [...TOUTES].reverse() }), a));
    expect(apres).toEqual(avant);
  });

  it('permissions-vides-tout-refuse', () => {
    const r = raisons(ctx('administrateur', { permissions: [] }), ACTIONS);
    expect(r).toHaveLength(14);
    expect(r).toEqual(ACTIONS.map(() => refuse('role_insuffisant')));
    expect(autoriser(ctx('lecture', { permissions: [] }), 'lire')).toEqual(refuse('role_lecture'));
  });

  it('invite-hors-perimetre-refuse', () => {
    expect(autoriser(ctx('invite_externe'), 'lire')).toEqual(refuse('perimetre_expert'));
    expect(autoriser(ctx('invite_externe', { perimetreRespecte: false }), 'lire')).toEqual(refuse('perimetre_expert'));
    expect(autoriser(ctx('invite_externe', { perimetreRespecte: true }), 'lire')).toEqual({ permis: true });
  });

  it('ordre-des-refus-et-entrees-invalides', () => {
    const mode = { id: 'm', actionsRetirees: ['deposer'] as Action[], raison: 'mode_saisie_seule' as const };
    expect(autoriser(ctx('lecture', { mode }), 'deposer')).toEqual(refuse('role_lecture'));
    expect(autoriser(ctx('utilisateur', { permissions: [], mode }), 'deposer')).toEqual(refuse('role_insuffisant'));
    expect(autoriser(ctx('utilisateur', { mode }), 'deposer')).toEqual(refuse('mode_saisie_seule'));
    const mauvais: unknown[] = [
      [ctx('utilisateur'), 'inconnue'], [{ ...ctx('utilisateur'), role: 'x' }, 'lire'],
      [{ ...ctx('utilisateur'), permissions: 'compta-lire' }, 'lire'], [{ ...ctx('utilisateur'), demande5: 1 }, 'lire'],
      [null, 'lire'],
    ];
    for (const [c, a] of mauvais as [ContexteAutorisation, Action][]) {
      expect(() => autoriser(c, a)).toThrow(ErreurSecurite);
    }
  });

  it('permission-de-l-action-effective-et-demande5-verrouillees', () => {
    const sans = TOUTES.filter((p) => p !== 'compta-lever-bloquant');
    const admin = ctx('administrateur', { permissions: sans });
    expect(autoriser(admin, 'lever_majeur', { gravite: 'bloquant' })).toEqual(refuse('role_insuffisant'));
    expect(autoriser(admin, 'lever_majeur', { gravite: 'majeur' })).toEqual({ permis: true });
    expect(autoriser(ctx('comptable', { demande5: false }), 'deposer')).toEqual(refuse('role_insuffisant'));
    expect(autoriser(ctx('comptable', { demande5: true }), 'deposer')).toEqual({ permis: true });
  });

  it('separation-et-gravite-invalides', () => {
    const sansSep = { ...ctx('utilisateur') } as Partial<ContexteAutorisation>;
    delete sansSep.separationTaches;
    for (const c of [sansSep, { ...ctx('utilisateur'), separationTaches: null }]) {
      expect(() => autoriser(c as ContexteAutorisation, 'valider')).toThrow(ErreurSecurite);
    }
    for (const gravite of ['Bloquant', 'MAJEUR', '', null, 1]) {
      expect(() => autoriser(ctx('utilisateur'), 'lever_majeur', { gravite } as never)).toThrow(ErreurSecurite);
    }
  });

  it('entree-non-modifiee', () => {
    const c = ctx('utilisateur', { separationTaches: true });
    const o = { auteurId: 'p-1', gravite: 'majeur' as const };
    const copie = JSON.stringify([c, o]);
    autoriser(c, 'valider', o);
    expect(JSON.stringify([c, o])).toBe(copie);
  });
});
