import { describe, expect, it } from 'vitest';
import {
  compteSubvention,
  ErreurVersionPcg,
  planDeLExercice,
  verifierCompteSelonVersion,
  versionPcg,
  type VersionPcg,
} from '../version-pcg.js';

// Versions fictives : l'ancienne garde tout, la nouvelle supprime les comptes 79.
const ANCIENNE: VersionPcg = {
  id: 'ancienne',
  debut: '2000-01-01',
  fin: '2025-01-01',
  prefixesSupprimes: [],
  compteSubvention: '777',
};
const NOUVELLE: VersionPcg = {
  id: 'nouvelle',
  debut: '2025-01-01',
  fin: null,
  prefixesSupprimes: ['79'],
  compteSubvention: '747',
};
const VERSIONS = [ANCIENNE, NOUVELLE];
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVersionPcg ? e.code : 'autre';
  }
  return undefined;
};

describe('version-pcg', () => {
  it('exercice-2025-aucun-compte-79', () => {
    const v = versionPcg('2025-01-01', VERSIONS);
    expect(v.id).toBe('nouvelle');
    for (const n of ['79', '791', '7911', '799']) {
      expect(verifierCompteSelonVersion(n, v)).toEqual({ ok: false, code: 'compte_supprime' });
    }
    for (const n of ['7', '70', '78', '709', '777', '7079']) {
      expect(verifierCompteSelonVersion(n, v)).toEqual({ ok: true });
    }
    expect(code(() => verifierCompteSelonVersion('79a', v))).toBe('numero_invalide');
    expect(code(() => verifierCompteSelonVersion('', v))).toBe('numero_invalide');
  });
  it('exercice-decale-ouvert-2024-garde-ancienne-version', () => {
    expect(versionPcg('2024-07-01', VERSIONS).id).toBe('ancienne');
    expect(versionPcg('2024-12-31', VERSIONS).id).toBe('ancienne');
    expect(versionPcg('2025-01-01', VERSIONS).id).toBe('nouvelle');
    expect(versionPcg('2025-07-01', VERSIONS).id).toBe('nouvelle');
    expect(verifierCompteSelonVersion('791', versionPcg('2024-07-01', VERSIONS))).toEqual({ ok: true });
  });
  it('subvention-classee-selon-version', () => {
    expect(compteSubvention(versionPcg('2024-07-01', VERSIONS))).toBe('777');
    expect(compteSubvention(versionPcg('2025-01-01', VERSIONS))).toBe('747');
  });
  it('exercice-2024-plan-fige-inchange', () => {
    const comptes = ['701', '777', '79', '791', '7911'];
    const plan = planDeLExercice({ debut: '2024-01-01' }, { versions: VERSIONS, comptes });
    expect(plan.comptes).toEqual(comptes);
    expect(plan.comptes).not.toBe(comptes);
    expect(plan.version.id).toBe('ancienne');
    const recent = planDeLExercice({ debut: '2025-01-01' }, { versions: VERSIONS, comptes });
    expect(recent.comptes).toEqual(['701', '777']);
    expect(comptes).toHaveLength(5);
  });
  it('version-inconnue-refusee', () => {
    expect(code(() => versionPcg('1999-12-31', VERSIONS))).toBe('version_inconnue');
    expect(code(() => versionPcg('2025-01-01', []))).toBe('version_inconnue');
    expect(code(() => versionPcg('2025-01-01', [ANCIENNE]))).toBe('version_inconnue');
    expect(code(() => versionPcg('2025-02-30', VERSIONS))).toBe('date_invalide');
    expect(code(() => versionPcg('', VERSIONS))).toBe('date_invalide');
    expect(code(() => versionPcg('2024-06-01', [ANCIENNE, { ...NOUVELLE, debut: '2024-01-01' }]))).toBe(
      'version_ambigue',
    );
  });
});
