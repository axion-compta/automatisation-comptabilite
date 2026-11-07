import { describe, expect, it } from 'vitest';
import type { Alerte } from '../moteur.js';
import { annuler, ErreurActionAlerte, ignorer, reporter } from '../actions.js';

const VALIDER = ['compta-lire', 'compta-valider'];
const alerte = (p: Partial<Alerte> = {}): Alerte => ({
  id: 'x1', regle: 'R1', objetType: 'piece', objetId: 'o1', cle: 'R1|piece|o1', gravite: 'a_faire', etat: 'ouverte', version: 3, ...p,
});
const optR = (p: Record<string, unknown> = {}) => ({ jours: 3, versionAttendue: 3, permissions: VALIDER, jour: '2026-10-01', joursPermis: [1, 3, 7], ...p }) as Parameters<typeof reporter>[1];
const optI = (p: Record<string, unknown> = {}) => ({ motif: 'doublon', versionAttendue: 3, permissions: VALIDER, motifMin: 5, le: '2026-10-01T08:00:00Z', ...p }) as Parameters<typeof ignorer>[1];
type Appel = () => unknown;
const echec = (f: Appel, code: string, statut: number) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurActionAlerte);
    expect(e).toMatchObject({ code, statut });
    return;
  }
  throw new Error('aucune erreur levée');
};

describe('actions sur les alertes', () => {
  it('reporter-trois-jours', () => {
    const r = reporter(alerte({ echeanceLe: '2026-10-04' }), optR());
    expect(r.alerte).toEqual({ ...alerte({ echeanceLe: '2026-10-04' }), etat: 'reportee', reporteeJusquAu: '2026-10-04', version: 4 });
    expect(r.journal).toEqual({ alerteId: 'x1', deEtat: 'ouverte', aEtat: 'reportee', deGravite: 'a_faire', aGravite: 'a_faire', cause: 'report', acteurType: 'humain', le: '2026-10-01' });
    expect(reporter(alerte({ etat: 'reportee' }), optR({ jours: 7 })).alerte.reporteeJusquAu).toBe('2026-10-08');
    const a = alerte();
    reporter(a, optR());
    expect(a).toEqual(alerte());
  });

  it('report-valeur-non-permise', () => {
    for (const jours of [2, 0, -1, 1.5, NaN, Infinity, '3']) echec(() => reporter(alerte(), optR({ jours })), 'report_invalide', 422);
  });

  it('report-apres-echeance-refuse', () => {
    echec(() => reporter(alerte({ echeanceLe: '2026-10-03' }), optR()), 'report_apres_echeance', 422);
    expect(reporter(alerte({ echeanceLe: '2026-10-04' }), optR()).alerte.etat).toBe('reportee');
  });

  it('report-urgent-ou-bloquant-interdit', () => {
    for (const gravite of ['urgent', 'bloquant'] as const) echec(() => reporter(alerte({ gravite }), optR()), 'report_interdit', 403);
    for (const gravite of ['info', 'a_faire'] as const) expect(reporter(alerte({ gravite }), optR()).alerte.etat).toBe('reportee');
  });

  it('ignorer-motif-trop-court', () => {
    for (const motif of ['    a   ', 'abcd', '    abcd   ', '😀😀😀😀', '']) echec(() => ignorer(alerte(), optI({ motif })), 'motif_requis', 422);
    const r = ignorer(alerte(), optI({ motif: '😀😀😀😀😀' }));
    expect(r.alerte).toEqual({ ...alerte(), etat: 'ignoree', version: 4 });
    expect(r.journal).toMatchObject({ cause: 'ignorer', aEtat: 'ignoree', deEtat: 'ouverte', acteurType: 'humain', le: '2026-10-01T08:00:00Z' });
    expect(ignorer(alerte(), optI({ motif: '  abcde  ' })).alerte.etat).toBe('ignoree');
  });

  it('bloquant-non-ignorable', () => {
    echec(() => ignorer(alerte({ gravite: 'bloquant' }), optI()), 'bloquant_non_ignorable', 403);
    expect(ignorer(alerte({ gravite: 'urgent' }), optI()).alerte.etat).toBe('ignoree');
  });

  it('version-perimee-409', () => {
    echec(() => reporter(alerte(), optR({ versionAttendue: 2 })), 'version_perimee', 409);
    echec(() => ignorer(alerte(), optI({ versionAttendue: 4 })), 'version_perimee', 409);
    for (const etat of ['ignoree', 'resolue_auto', 'resolue'] as const) {
      echec(() => reporter(alerte({ etat }), optR()), 'alerte_inactive', 409);
      echec(() => ignorer(alerte({ etat }), optI()), 'alerte_inactive', 409);
    }
  });

  it('role-lecture-403', () => {
    echec(() => reporter(alerte(), optR({ permissions: ['compta-lire'] })), 'role_lecture', 403);
    echec(() => ignorer(alerte(), optI({ permissions: ['compta-lire'] })), 'role_lecture', 403);
    echec(() => reporter(alerte(), optR({ permissions: [] })), 'role_insuffisant', 403);
    echec(() => ignorer(alerte(), optI({ permissions: ['autre'] })), 'role_insuffisant', 403);
  });

  it('ordre-des-controles', () => {
    echec(() => reporter(alerte(), optR({ permissions: [], versionAttendue: 1, jours: 2 })), 'role_insuffisant', 403);
    echec(() => ignorer(alerte(), optI({ permissions: ['compta-lire'], versionAttendue: 1, motif: '' })), 'role_lecture', 403);
    echec(() => reporter(alerte({ etat: 'resolue' }), optR({ versionAttendue: 1 })), 'version_perimee', 409);
    echec(() => reporter(alerte({ gravite: 'urgent' }), optR({ jours: 2 })), 'report_invalide', 422);
    echec(() => ignorer(alerte({ gravite: 'bloquant' }), optI({ motif: '' })), 'bloquant_non_ignorable', 403);
  });

  it('annulation-dans-le-delai', () => {
    const avant = alerte({ etat: 'ouverte', version: 3 });
    const apres = alerte({ etat: 'reportee', version: 4 });
    const opt = { maintenant: 10000, delaiMs: 500, le: '2026-10-01T08:00:10Z' };
    const r = annuler(apres, { le: 9500, avant }, opt);
    expect(r.alerte).toEqual({ ...avant, version: 5 });
    expect(r.journal).toEqual({ alerteId: 'x1', deEtat: 'reportee', aEtat: 'ouverte', deGravite: 'a_faire', aGravite: 'a_faire', cause: 'annulation', acteurType: 'humain', le: opt.le });
    expect(annuler(apres, { le: 10000, avant }, opt).alerte.etat).toBe('ouverte');
  });

  it('annulation-hors-delai-409', () => {
    const avant = alerte();
    const opt = { maintenant: 10000, delaiMs: 500, le: 'x' };
    for (const le of [9499, 10001, 9500.5, NaN]) echec(() => annuler(alerte({ etat: 'reportee' }), { le, avant }, opt), 'delai_annulation_depasse', 409);
    echec(() => annuler(alerte(), { le: 9500, avant }, { ...opt, maintenant: Infinity }), 'delai_annulation_depasse', 409);
    echec(() => annuler(alerte(), { le: 9500, avant }, { ...opt, delaiMs: NaN }), 'delai_annulation_depasse', 409);
  });
});
