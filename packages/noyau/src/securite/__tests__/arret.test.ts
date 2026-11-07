import { describe, expect, it } from 'vitest';
import { CANAUX_COUPES, estCoupe, poserArret, reprendre, type Drapeaux } from '../arret.js';

const T0 = '2026-01-05T10:00:00Z';
const T1 = '2026-01-05T11:00:00Z';
const vide: Drapeaux = { societes: {} };
const admin = { id: 'p-admin', role: 'administrateur' as const };
const code = { code: 'argument_invalide' };

describe('securite/arret', () => {
  it('societe-a-coupee-b-non', () => {
    const r = poserArret(vide, { societeId: 'A' }, 'p-admin', T0);
    expect(r.evenement).toEqual({ type: 'securite.arret_urgence', cible: { societeId: 'A' }, par: 'p-admin', horodatage: T0 });
    expect(r.drapeaux.societes).toEqual({ A: { depuis: T0, par: 'p-admin' } });
    expect(estCoupe(r.drapeaux, 'A', 'api')).toBe(true);
    expect(estCoupe(r.drapeaux, 'B', 'api')).toBe(false);
    expect(estCoupe(r.drapeaux, undefined, 'api')).toBe(false);
    expect(estCoupe(r.drapeaux, 'toString', 'api')).toBe(false);
    const rep = reprendre(r.drapeaux, { societeId: 'A' }, admin, T1);
    expect(rep).toMatchObject({ ok: true, drapeaux: { societes: {} }, evenement: { type: 'securite.reprise', par: 'p-admin', horodatage: T1 } });
    expect(estCoupe((rep as { drapeaux: Drapeaux }).drapeaux, 'A', 'chat')).toBe(false);
  });

  it('global-coupe-tout', () => {
    const r = poserArret(vide, 'global', 'p-admin', T0);
    expect(r.drapeaux.global).toEqual({ depuis: T0, par: 'p-admin' });
    expect(r.evenement).toMatchObject({ cible: 'global' });
    for (const s of ['A', 'B', undefined]) expect(estCoupe(r.drapeaux, s, 'envois')).toBe(true);
    const rep = reprendre(r.drapeaux, 'global', admin, T1);
    expect(rep.ok && rep.drapeaux).toEqual({ societes: {} });
  });

  it('quatre-canaux-coupes', () => {
    expect(CANAUX_COUPES).toEqual(['api', 'chat', 'imports', 'envois']);
    const d = poserArret(vide, { societeId: 'A' }, 'p', T0).drapeaux;
    for (const c of CANAUX_COUPES) {
      expect(estCoupe(d, 'A', c)).toBe(true);
      expect(estCoupe(d, 'B', c)).toBe(false);
    }
  });

  it('canal-inconnu-refuse', () => {
    for (const c of ['', 'sms', 'API', 'constructor']) expect(() => estCoupe(vide, 'A', c)).toThrow(expect.objectContaining(code));
    expect(() => poserArret(vide, { societeId: '' }, 'p', T0)).toThrow(expect.objectContaining(code));
    expect(() => poserArret(vide, { societeId: 'A' }, '', T0)).toThrow(expect.objectContaining(code));
    for (const h of ['', 'hier', 'NaN']) expect(() => poserArret(vide, 'global', 'p', h)).toThrow(expect.objectContaining(code));
    expect(() => reprendre(vide, 'global', { id: '', role: 'administrateur' }, T1)).toThrow(expect.objectContaining(code));
    expect(() => reprendre(vide, 'global', admin, 'hier')).toThrow(expect.objectContaining(code));
    expect(() => reprendre(vide, { societeId: '' }, admin, T1)).toThrow(expect.objectContaining(code));
  });

  it('poser-deux-fois-un-evenement', () => {
    const un = poserArret(vide, { societeId: 'A' }, 'p', T0);
    const deux = poserArret(un.drapeaux, { societeId: 'A' }, 'q', T1);
    expect(deux.evenement).toBeUndefined();
    expect(deux.drapeaux).toBe(un.drapeaux);
    const ts = poserArret(vide, { societeId: 'toString' }, 'p', T0);
    expect(ts.evenement).toMatchObject({ type: 'securite.arret_urgence', cible: { societeId: 'toString' } });
    expect(estCoupe(ts.drapeaux, 'toString', 'api')).toBe(true);
    const g = poserArret(vide, 'global', 'p', T0);
    const g2 = poserArret(g.drapeaux, 'global', 'q', T1);
    expect([g2.evenement, g2.drapeaux]).toEqual([undefined, g.drapeaux]);
  });

  it('reprise-par-utilisateur-refusee', () => {
    const d = poserArret(vide, 'global', 'p', T0).drapeaux;
    for (const role of ['utilisateur', 'lecture', 'comptable', 'invite_externe', 'personnel_axion'] as const)
      expect(reprendre(d, 'global', { id: 'u', role }, T1)).toEqual({ ok: false, raison: 'role_insuffisant' });
  });

  it('reprise-societe-sous-global-reste-coupee', () => {
    const g = poserArret(vide, 'global', 'p', T0).drapeaux;
    const les2 = poserArret(g, { societeId: 'A' }, 'p', T0).drapeaux;
    const rep = reprendre(les2, { societeId: 'A' }, admin, T1);
    expect(rep.ok && rep.drapeaux.societes).toEqual({});
    expect(rep.ok && estCoupe(rep.drapeaux, 'A', 'api')).toBe(true);
    const seule = reprendre(les2, 'global', admin, T1);
    expect(seule.ok && estCoupe(seule.drapeaux, 'A', 'api')).toBe(true);
    expect(seule.ok && estCoupe(seule.drapeaux, 'B', 'api')).toBe(false);
  });

  it('entree-non-modifiee', () => {
    const d: Drapeaux = Object.freeze({
      global: Object.freeze({ depuis: T0, par: 'p' }),
      societes: Object.freeze({ A: Object.freeze({ depuis: T0, par: 'p' }), B: Object.freeze({ depuis: T0, par: 'p' }) }),
    });
    const copie = JSON.stringify(d);
    const r1 = reprendre(d, { societeId: 'A' }, admin, T1);
    const r2 = reprendre(d, 'global', admin, T1);
    const r3 = poserArret(d, { societeId: 'C' }, 'p', T1);
    expect(JSON.stringify(d)).toBe(copie);
    expect(r1.ok && Object.keys(r1.drapeaux.societes)).toEqual(['B']);
    expect(r2.ok && r2.drapeaux.global).toBeUndefined();
    expect(r3.drapeaux).not.toBe(d);
    expect(Object.keys(r3.drapeaux.societes)).toEqual(['A', 'B', 'C']);
  });
});
