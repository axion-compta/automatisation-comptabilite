import { describe, expect, it } from 'vitest';
import { appliquerTransition, cleTache, ETAPES, estBloquee, prochaineRelance, TRANSITIONS, transitionPermise } from '../etats.js';
import { ETATS_TRAITEMENT, type EtatTraitement } from '../types.js';

const erreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const ATTENDU: Record<string, string> = {
  recue: 'quarantaine refusee en_erreur', quarantaine: 'preparee refusee en_erreur', preparee: 'lue a_verifier en_attente_quota en_erreur',
  en_attente_quota: 'preparee', lue: 'prete a_verifier en_erreur', en_erreur: 'recue quarantaine preparee lue', prete: '', a_verifier: '', refusee: '',
};
const PARCOURS: EtatTraitement[] = ['recue', 'quarantaine', 'preparee', 'lue', 'prete'];

describe('etats', () => {
  it('chemin-normal-jusqu-a-prete', () => {
    expect(ETAPES).toEqual(['entree', 'antivirus', 'preparation', 'lecture', 'classement']);
    let etat = PARCOURS[0] as EtatTraitement;
    for (const suivant of PARCOURS.slice(1)) etat = appliquerTransition(etat, suivant);
    expect(etat).toBe('prete');
    expect(Object.fromEntries(Object.entries(TRANSITIONS).map(([k, v]) => [k, v.join(' ')]))).toEqual(ATTENDU);
    expect(transitionPermise('preparee', 'en_attente_quota')).toBe(true);
    expect(transitionPermise('en_attente_quota', 'preparee')).toBe(true);
  });
  it('etats-finaux-sans-sortie', () => {
    for (const final of ['prete', 'a_verifier', 'refusee'] as const) {
      expect(TRANSITIONS[final]).toEqual([]);
      for (const vers of ETATS_TRAITEMENT) expect(transitionPermise(final, vers)).toBe(false);
    }
  });
  it('transition-interdite-levee', () => {
    expect(erreur(() => appliquerTransition('recue', 'prete'))).toBe('transition_interdite');
    expect(erreur(() => appliquerTransition('prete', 'recue'))).toBe('transition_interdite');
    expect(erreur(() => appliquerTransition('lue', 'lue'))).toBe('transition_interdite');
    expect(erreur(() => appliquerTransition('lue', 'prete'))).toBeUndefined();
    for (const de of ETATS_TRAITEMENT) for (const vers of ETATS_TRAITEMENT) expect(transitionPermise(de, vers)).toBe(ATTENDU[de]?.split(' ').includes(vers));
  });
  it('reprise-depuis-en-erreur', () => {
    for (const vers of ['recue', 'quarantaine', 'preparee', 'lue'] as const) expect(appliquerTransition('en_erreur', vers)).toBe(vers);
    for (const vers of ['prete', 'a_verifier', 'refusee', 'en_attente_quota', 'en_erreur'] as const) expect(transitionPermise('en_erreur', vers)).toBe(false);
  });
  it('cle-de-tache-stable-et-refus', () => {
    expect(cleTache('piece-1', 'lecture', 'v7')).toBe('piece-1:lecture:v7');
    expect(cleTache('piece-1', 'lecture', 'v7')).toBe(cleTache('piece-1', 'lecture', 'v7'));
    expect(cleTache('piece-1', 'lecture', 'v7')).not.toBe(cleTache('piece-1', 'lecture', 'v8'));
    expect(cleTache('piece-1', 'lecture', 'v7')).not.toBe(cleTache('piece-1', 'classement', 'v7'));
    for (const [p, v] of [['', 'v7'], ['a:b', 'v7'], ['piece-1', ''], ['piece-1', 'v:7']] as const) expect(erreur(() => cleTache(p, 'lecture', v))).toBe('cle_invalide');
    expect(erreur(() => cleTache('piece-1', '' as 'lecture', 'v7'))).toBe('cle_invalide');
  });
  it('relances-puis-abandon', () => {
    const delais = [1, 5, 15, 60];
    expect([0, 1, 2, 3, 4, 9].map((n) => prochaineRelance(n, delais))).toEqual([1, 5, 15, 60, 'abandon', 'abandon']);
    expect(prochaineRelance(0, [])).toBe('abandon');
    expect(prochaineRelance(0, [0])).toBe(0);
  });
  it('bloquee-a-la-duree-exacte', () => {
    const debut = '2026-03-10T08:00:00Z';
    expect(estBloquee(debut, '2026-03-11T08:00:00Z', 1440)).toBe(true);
    expect(estBloquee(debut, '2026-03-11T07:59:59.999Z', 1440)).toBe(false);
    expect(estBloquee(debut, '2026-03-11T08:00:00.001Z', 1440)).toBe(true);
    expect(estBloquee(debut, '2026-03-11T10:00:00+02:00', 1440)).toBe(true);
    expect(estBloquee(debut, '2026-03-10T07:00:00Z', 1440)).toBe(false);
    expect(estBloquee(debut, debut, 0)).toBe(true);
  });
  it('entrees-invalides', () => {
    const debut = '2026-03-10T08:00:00Z';
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) expect(erreur(() => prochaineRelance(n, [1]))).toBe('reglage_invalide');
    for (const d of [[-1], [Number.NaN], [Number.POSITIVE_INFINITY], [1, -5]]) expect(erreur(() => prochaineRelance(0, d))).toBe('reglage_invalide');
    for (const d of [Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(erreur(() => estBloquee(debut, debut, d))).toBe('reglage_invalide');
    for (const [a, b] of [['hier', debut], [debut, 'demain'], ['', debut], ['2026-03-10', debut], [debut, '2026-03-11T08:00:00'], ['2026-13-40T08:00:00Z', debut]]) {
      expect(erreur(() => estBloquee(a as string, b as string, 10))).toBe('date_invalide');
    }
  });
});
