import { describe, expect, it } from 'vitest';
import { ecarter, NON_ECARTABLES, verifierAvantAction } from '../garde-fou.js';
import type { RegleControle, Resultat, TraceControle } from '../moteur.js';

function regle(id: string, gravite: RegleControle<number>['gravite'], bloque: RegleControle<number>['bloque']) {
  const r: RegleControle<number> = {
    id,
    version: 1,
    gravite,
    bloque,
    declencheurs: ['arrivee'],
    actif: true,
    evaluer: () => ({ resultat: 'OK' }),
  };
  return r;
}

function trace(regleId: string, objetId: string, resultat: Resultat, horodatage = '2026-01-15T10:00:00Z'): TraceControle {
  return { horodatage, declencheur: 'arrivee', regleId, versionRegle: 1, objetType: 'piece', objetId, resultat };
}

const regles = [
  regle('CC-B01', 'B', ['validation', 'export']),
  regle('CC-M01', 'M', ['validation']),
  regle('CC-T01', 'B', ['tva']),
];

const OPTS = {
  motif: 'Pièce justificative reçue hors circuit',
  permissions: ['compta-lever-bloquant'],
  reauthentifie: true,
  par: 'utilisatrice-fictive',
  horodatage: '2026-01-16T09:00:00Z',
};

describe('garde-fou des contrôles bloquants', () => {
  it('un-b-ouvert-refuse', () => {
    const r = verifierAvantAction([trace('CC-B01', 'P1', 'ALERTE')], regles, 'validation');
    expect(r).toEqual({
      autorise: false,
      bloquants: [{ regleId: 'CC-B01', objetId: 'P1' }],
      code: 'controle_bloquant_ouvert',
    });
  });

  it('impossible-sur-b-refuse', () => {
    const r = verifierAvantAction([trace('CC-B01', 'P1', 'IMPOSSIBLE')], regles, 'export');
    expect(r.autorise).toBe(false);
    expect(r.bloquants).toEqual([{ regleId: 'CC-B01', objetId: 'P1' }]);
    expect(r.code).toBe('controle_bloquant_ouvert');
    expect(verifierAvantAction([trace('CC-B01', 'P1', 'IMPOSSIBLE')], regles, 'cloture').autorise).toBe(true);
    for (const res of ['OK', 'NON_APPLICABLE', 'ECARTE'] as const) {
      expect(verifierAvantAction([trace('CC-B01', 'P1', res)], regles, 'validation')).toEqual({
        autorise: true,
        bloquants: [],
      });
    }
  });

  it('m-ouvert-autorise', () => {
    const r = verifierAvantAction([trace('CC-M01', 'P1', 'ALERTE'), trace('INCONNUE', 'P1', 'ALERTE')], regles, 'validation');
    expect(r).toEqual({ autorise: true, bloquants: [] });
    expect(r.code).toBeUndefined();
  });

  it('derniere-trace-fait-foi', () => {
    const anciennesAlerte = [
      trace('CC-B01', 'P1', 'ALERTE', '2026-01-15T10:00:00Z'),
      trace('CC-B01', 'P1', 'OK', '2026-01-16T10:00:00Z'),
    ];
    expect(verifierAvantAction(anciennesAlerte, regles, 'validation').autorise).toBe(true);
    expect(verifierAvantAction([...anciennesAlerte].reverse(), regles, 'validation').autorise).toBe(true);
    const reouvert = [
      trace('CC-B01', 'P1', 'OK', '2026-01-15T10:00:00Z'),
      trace('CC-B01', 'P1', 'ALERTE', '2026-01-16T10:00:00Z'),
    ];
    expect(verifierAvantAction(reouvert, regles, 'validation').autorise).toBe(false);
    const deuxObjets = [trace('CC-B01', 'P1', 'OK'), trace('CC-B01', 'P2', 'ALERTE')];
    expect(verifierAvantAction(deuxObjets, regles, 'validation').bloquants).toEqual([
      { regleId: 'CC-B01', objetId: 'P2' },
    ]);
    const [d1, d2] = ['2026-01-15T10:00:00Z', '2026-01-16T10:00:00Z'];
    const b1 = { regleId: 'CC-B01', objetId: 'P1' };
    const cross = [trace('CC-B01', 'P1', 'ALERTE', d1), trace('CC-B01', 'P2', 'OK', d2)];
    expect(verifierAvantAction(cross, regles, 'validation')).toMatchObject({ autorise: false, bloquants: [b1] });
    const r2 = [...regles, regle('CC-B02', 'B', ['validation'])];
    const t2 = [trace('CC-B01', 'P1', 'ALERTE', d1), trace('CC-B02', 'P1', 'OK', d2)];
    expect(verifierAvantAction(t2, r2, 'validation').bloquants).toEqual([b1]);
    const [a, o] = [trace('CC-B01', 'P1', 'ALERTE'), trace('CC-B01', 'P1', 'OK')];
    expect(verifierAvantAction([o, a], regles, 'validation').autorise).toBe(false);
    expect(verifierAvantAction([a, o], regles, 'validation').autorise).toBe(true);
  });

  it('ecarte-forge-sur-non-ecartable-reste-ouvert', () => {
    const forge = { ...trace('CC-T01', 'P1', 'ECARTE'), motif: 'x', par: 'y' };
    expect(verifierAvantAction([forge], regles, 'tva').autorise).toBe(false);
  });

  it('ecarter-refuse-auteur-vide-et-horodatage-anterieur', () => {
    const t = trace('CC-B01', 'P1', 'ALERTE', '2026-01-16T10:00:00Z');
    const vide = ecarter(t, { ...OPTS, par: ' ', horodatage: '2026-01-17T10:00:00Z' });
    expect(vide).toEqual({ ok: false, code: 'auteur_obligatoire' });
    const avant = ecarter(t, { ...OPTS, horodatage: '2026-01-15T10:00:00Z' });
    expect(avant).toEqual({ ok: false, code: 'horodatage_anterieur' });
    expect(ecarter(t, { ...OPTS, horodatage: t.horodatage }).ok).toBe(true);
  });

  it('ecarter-avec-motif-et-permission', () => {
    const t = trace('CC-B01', 'P1', 'ALERTE');
    const r = ecarter(t, OPTS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.trace).toMatchObject({
      regleId: 'CC-B01',
      objetId: 'P1',
      resultat: 'ECARTE',
      motif: OPTS.motif,
      par: OPTS.par,
      horodatage: OPTS.horodatage,
    });
    expect(t.resultat).toBe('ALERTE');
    expect(verifierAvantAction([t, r.trace], regles, 'validation').autorise).toBe(true);
    expect(ecarter(t, { ...OPTS, motif: '   ' })).toEqual({ ok: false, code: 'motif_obligatoire' });
    expect(ecarter(t, { ...OPTS, motif: '' })).toEqual({ ok: false, code: 'motif_obligatoire' });
    expect(ecarter(t, { ...OPTS, permissions: ['autre'] })).toEqual({ ok: false, code: 'permission_manquante' });
  });

  it('non-ecartable-refuse', () => {
    expect(NON_ECARTABLES).toEqual(['CC-T01', 'CC-T02', 'CC-K01', 'CC-K02', 'CC-K03']);
    for (const id of NON_ECARTABLES) {
      expect(ecarter(trace(id, 'P1', 'ALERTE'), OPTS)).toEqual({ ok: false, code: 'non_ecartable' });
    }
  });

  it('ecarter-sans-reauth-refuse', () => {
    const t = trace('CC-B01', 'P1', 'ALERTE');
    expect(ecarter(t, { ...OPTS, reauthentifie: false })).toEqual({
      ok: false,
      code: 'reauthentification_requise',
    });
  });
});
