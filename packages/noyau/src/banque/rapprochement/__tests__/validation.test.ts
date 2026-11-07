import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { EtatRapprochement, Lien } from '../../types.js';
import { ErreurValidation, preparerValidation, validerLot } from '../validation.js';

const lien = (i: number, extra: Partial<Lien> = {}): Lien => ({
  id: `k${i}`, groupeId: `g${i}`, ligneId: `l${i}`, pieceId: `p${i}`, montantAffecte: centimes(1000 + i), score: 90,
  facteurs: [], passe: 1, codeRaison: 'exact', proposePar: 'regle', etat: 'propose', version: 1, ...extra,
});
const serie = (n: number): Lien[] => Array.from({ length: n }, (_, i) => lien(i));
const rapprochees = (ls: Lien[]): Record<string, EtatRapprochement> => Object.fromEntries(ls.map((l) => [l.ligneId, 'RAPPROCHEE' as const]));
const pers = { type: 'personne', id: 'u1' } as const;
const ctx = (extra: Record<string, unknown> = {}) => ({ mode: 'assiste' as const, horodatage: '2025-03-01T10:00:00Z', confirmationNb: 12, ...extra });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurValidation ? e.code : 'autre';
  }
  return undefined;
};

describe('validation en lot', () => {
  it('t05-7-douze-surs', () => {
    const ls = serie(12);
    const p = preparerValidation(ls, rapprochees(ls), { surs: true });
    const r = validerLot(ls, p.ids, pers, ctx());
    expect(r.liens).toHaveLength(12);
    expect(r.liens.every((l) => l.etat === 'valide' && l.version === 2 && l.validePar === 'u1' && l.valideLe === '2025-03-01T10:00:00Z')).toBe(true);
    expect(r.journal).toHaveLength(12);
    expect(r.journal.every((j) => j.acteurType === 'personne' && j.action === 'valider' && j.objetType === 'lien')).toBe(true);
    expect(r.journal[0]?.avant.etat).toBe('propose');
    expect(r.journal[0]?.apres.etat).toBe('valide');
  });

  it('preparation-annonce-le-nombre', () => {
    const ls = [...serie(3), lien(3, { etat: 'valide' }), lien(4)];
    const etats = { ...rapprochees(ls), l1: 'PROPOSEE' as const };
    expect(preparerValidation(ls, etats, { surs: true })).toEqual({ nbObjetsTouches: 3, ids: ['k0', 'k2', 'k4'].filter((x) => x !== 'k1') });
    expect(preparerValidation(ls, etats, { ids: ['k0', 'k0', 'k1'] })).toEqual({ nbObjetsTouches: 2, ids: ['k0', 'k1'] });
    expect(code(() => preparerValidation(ls, etats, { ids: [] }))).toBe('rien_a_valider');
    expect(code(() => preparerValidation(ls, {}, { surs: true }))).toBe('rien_a_valider');
  });

  it('ia-refusee-en-assiste', () => {
    const ls = serie(2);
    const c = ctx({ confirmationNb: 2 });
    expect(code(() => validerLot(ls, ['k0', 'k1'], { type: 'ia', id: 'a1' }, c))).toBe('ia_interdite');
    expect(code(() => validerLot(ls, ['k0', 'k1'], { type: 'systeme', id: 's1' }, c))).toBe('systeme_interdit');
    expect(ls.every((l) => l.etat === 'propose')).toBe(true);
  });

  it('autonome-dans-les-limites', () => {
    const ls = serie(2);
    const c = ctx({ mode: 'autonome', confirmationNb: 2, limites: { montantMaxParLien: centimes(1001) } });
    const r = validerLot(ls, ['k0', 'k1'], { type: 'ia', id: 'a1' }, c);
    expect(r.journal.map((j) => j.acteurType)).toEqual(['ia', 'ia']);
    expect(r.liens.map((l) => l.validePar)).toEqual(['a1', 'a1']);
  });

  it('autonome-hors-limites-refuse', () => {
    const ls = serie(2);
    const ia = { type: 'ia', id: 'a1' } as const;
    const base = { mode: 'autonome', confirmationNb: 2 };
    expect(code(() => validerLot(ls, ['k0', 'k1'], ia, ctx(base)))).toBe('hors_limites');
    expect(code(() => validerLot(ls, ['k0', 'k1'], ia, ctx({ ...base, limites: { montantMaxParLien: centimes(1000) } })))).toBe('hors_limites');
    expect(code(() => validerLot(ls, ['k0', 'k1'], ia, ctx({ ...base, limites: { montantMaxParLien: centimes(-5) } })))).toBe('hors_limites');
    const neg = [lien(0, { montantAffecte: centimes(-5000) })];
    expect(code(() => validerLot(neg, ['k0'], ia, ctx({ mode: 'autonome', confirmationNb: 1, limites: { montantMaxParLien: centimes(1000) } })))).toBe('hors_limites');
  });

  it('confirmation-differente-refusee', () => {
    const ls = serie(2);
    for (const n of [1, 3, Number.NaN, Infinity, 2.5, -2]) {
      expect(code(() => validerLot(ls, ['k0', 'k1'], pers, ctx({ confirmationNb: n })))).toBe('confirmation_differente');
    }
    expect(code(() => validerLot(ls, ['k0', 'k0', 'k1'], pers, ctx({ confirmationNb: 3 })))).toBe('confirmation_differente');
    expect(validerLot(ls, ['k0', 'k0', 'k1'], pers, ctx({ confirmationNb: 2 })).liens).toHaveLength(2);
  });

  it('lien-deja-valide-refuse', () => {
    const ls = [lien(0), lien(1, { etat: 'valide' }), lien(2, { etat: 'refuse' })];
    for (const id of ['k1', 'k2', 'inconnu']) {
      let err: unknown;
      try {
        validerLot(ls, ['k0', id], pers, ctx({ confirmationNb: 2 }));
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ErreurValidation);
      expect((err as ErreurValidation).code).toBe('lien_non_validable');
      expect((err as ErreurValidation).id).toBe(id);
    }
    expect(code(() => validerLot(ls, [], pers, ctx({ confirmationNb: 0 })))).toBe('rien_a_valider');
  });

  it('entree-non-modifiee', () => {
    const ls = serie(2);
    const copie = JSON.stringify(ls);
    const r = validerLot(ls, ['k0', 'k1'], pers, ctx({ confirmationNb: 2 }));
    expect(JSON.stringify(ls)).toBe(copie);
    expect(r.liens[0]).not.toBe(ls[0]);
    expect(r.journal[0]?.avant).toEqual(ls[0]);
    expect(r.journal[0]?.avant).not.toBe(ls[0]);
  });
});
