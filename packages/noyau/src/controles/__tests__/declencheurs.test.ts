import { describe, expect, it } from 'vitest';
import { nocturneEnRetard, objetsAControler, peutReutiliser, reglesAJouer, type Contexte, type ObjetRef } from '../declencheurs.js';
import { executerControles, type Blocage, type Declencheur, type RegleControle } from '../moteur.js';

const o = (type: string, id: string, date?: string): ObjetRef => (date === undefined ? { type, id } : { type, id, date });
const TOUS = [o('piece', 'p2', '2026-02-10'), o('ecriture', 'e1', '2026-01-05'), o('piece', 'p1', '2026-03-01'), o('lien', 'l1')];
const ctx = (declencheur: Declencheur, extra: Partial<Contexte> = {}): Contexte => ({ declencheur, tousLesObjets: TOUS, ...extra });
const ids = (l: ObjetRef[]): string[] => l.map((x) => x.type + ':' + x.id);
const code = (f: () => unknown): unknown => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code ?? 'autre';
  }
  return 'aucune';
};
const regle = (id: string, bloque: Blocage[], declencheurs: Declencheur[], actif = true): RegleControle<number> => ({
  id, version: 1, gravite: 'M', bloque, declencheurs, actif, evaluer: () => ({ resultat: 'OK' }),
});

describe('declencheurs', () => {
  it('CT-43', () => {
    const regles = [regle('A', ['export'], ['nocturne']), regle('B', ['tva'], ['avant_tva']), regle('C', [], ['continu'])];
    const objets = TOUS.map((x) => ({ type: x.type, id: x.id, donnee: 1 }));
    const nuit = executerControles(reglesAJouer(regles, 'nocturne'), objets, 'nocturne', '2026-04-01T02:00:00Z');
    expect(nuit).toHaveLength(4);
    expect(peutReutiliser('avant_export')).toBe(false);
    const aRejouer = objetsAControler(ctx('avant_export'));
    expect(ids(aRejouer)).toEqual(['ecriture:e1', 'lien:l1', 'piece:p1', 'piece:p2']);
    const exp = executerControles(reglesAJouer(regles, 'avant_export'), objets, 'avant_export', '2026-04-01T09:00:00Z');
    expect(exp).toHaveLength(12);
    expect(exp.every((t) => t.declencheur === 'avant_export')).toBe(true);
  });

  it('arrivee-un-seul-objet', () => {
    expect(ids(objetsAControler(ctx('arrivee', { objetArrive: o('piece', 'p9') })))).toEqual(['piece:p9']);
    expect(code(() => objetsAControler(ctx('arrivee')))).toBe('objet_arrive_absent');
  });

  it('continu-sans-doublon', () => {
    const touches = [o('piece', 'p2'), o('ecriture', 'e1'), o('piece', 'p2'), o('piece', 'p10'), o('ecriture', 'p2')];
    const attendu = ['ecriture:e1', 'ecriture:p2', 'piece:p10', 'piece:p2'];
    expect(ids(objetsAControler(ctx('continu', { objetsTouches: touches })))).toEqual(attendu);
    expect(ids(objetsAControler(ctx('continu', { objetsTouches: [...touches].reverse() })))).toEqual(attendu);
    expect(objetsAControler(ctx('continu', { objetsTouches: [] }))).toEqual([]);
    expect(objetsAControler(ctx('continu'))).toEqual([]);
    expect(objetsAControler({ declencheur: 'nocturne', tousLesObjets: [] })).toEqual([]);
  });

  it('avant-tva-selon-bloque', () => {
    const regles = [regle('A', ['tva'], ['nocturne']), regle('B', ['export'], ['avant_tva']), regle('C', ['tva', 'export'], ['avant_tva']), regle('D', ['tva'], ['avant_tva'], false)];
    expect(reglesAJouer(regles, 'avant_tva').map((r) => r.id)).toEqual(['A', 'C']);
    expect(reglesAJouer(regles, 'nocturne').map((r) => r.id)).toEqual(['A']);
    expect(reglesAJouer(regles, 'continu')).toEqual([]);
    expect(reglesAJouer(regles, 'avant_export').map((r) => r.id)).toEqual(['A', 'B', 'C']);
    expect(reglesAJouer([], 'avant_tva')).toEqual([]);
  });

  it('periode-bornes-incluses', () => {
    const p = { debut: '2026-02-10', fin: '2026-03-01' };
    for (const d of ['avant_tva', 'a_la_demande'] as const) {
      expect(ids(objetsAControler(ctx(d, { periode: p })))).toEqual(['piece:p1', 'piece:p2']);
    }
    const dehors = objetsAControler(ctx('a_la_demande', { periode: { debut: '2026-02-11', fin: '2026-02-28' } }));
    expect(dehors).toEqual([]);
    const unJour = objetsAControler(ctx('a_la_demande', { periode: { debut: '2026-01-05', fin: '2026-01-05' } }));
    expect(ids(unJour)).toEqual(['ecriture:e1']);
    expect(code(() => objetsAControler(ctx('avant_tva')))).toBe('periode_absente');
    expect(code(() => objetsAControler(ctx('a_la_demande', { tousLesObjets: [o('piece', 'x', '2026-13-01')], periode: p })))).toBe('date_invalide');
  });

  it('periode-inversee-exception', () => {
    for (const periode of [{ debut: '2026-03-01', fin: '2026-02-28' }, { debut: '2026-02-30', fin: '2026-03-01' }, { debut: '2026-01-01', fin: 'demain' }, { debut: '', fin: '' }]) {
      expect(code(() => objetsAControler(ctx('avant_tva', { periode })))).toBe('periode_invalide');
    }
  });

  it('export-jamais-de-cache', () => {
    expect(peutReutiliser('avant_export')).toBe(false);
    expect(peutReutiliser('avant_cloture')).toBe(false);
    for (const d of ['arrivee', 'continu', 'nocturne', 'avant_tva', 'a_la_demande'] as const) {
      expect(peutReutiliser(d)).toBe(true);
    }
    const periode = { debut: '2026-02-10', fin: '2026-02-10' };
    expect(objetsAControler(ctx('avant_export', { periode }))).toHaveLength(4);
    expect(objetsAControler(ctx('avant_cloture', { periode }))).toHaveLength(4);
    expect(objetsAControler(ctx('nocturne', { periode }))).toHaveLength(4);
  });

  it('nocturne-en-retard', () => {
    const d = '2026-04-01T00:00:00Z';
    expect(nocturneEnRetard(d, '2026-04-02T00:00:00Z', 1440, 'x')).toBe(false);
    expect(nocturneEnRetard(d, '2026-04-02T00:00:00.001Z', 1440, 'x')).toBe(true);
    expect(nocturneEnRetard(d, '2026-04-01T23:59:59Z', 1440, 'x')).toBe(false);
    expect(nocturneEnRetard(d, undefined, 60, '2026-04-01T01:00:00Z')).toBe(false);
    expect(nocturneEnRetard(d, undefined, 60, '2026-04-01T01:00:01Z')).toBe(true);
    expect(nocturneEnRetard(d, d, 0, 'x')).toBe(false);
    expect(nocturneEnRetard(d, '2026-04-01T00:00:00.500Z', 0, 'x')).toBe(true);
  });

  it('horodatage-invalide-exception', () => {
    const d = '2026-04-01T00:00:00Z';
    const f = '2026-04-01T01:00:00Z';
    for (const [a, b, n] of [['n importe quoi', f, 60], [d, 'x', 60], [d, undefined, 60], ['2026-04-01 00:00:00', f, 60], ['2026-04-01T00:00:00', f, 60], ['2026-02-30T00:00:00Z', f, 60], [f, d, 60]] as const) {
      expect(code(() => nocturneEnRetard(a, b, n, b === undefined ? 'zzz' : 'x'))).toBe('horodatage_invalide');
    }
    for (const n of [Number.NaN, Infinity, 1.5, -1]) {
      expect(code(() => nocturneEnRetard(d, f, n, 'x'))).toBe('duree_invalide');
    }
  });
});
