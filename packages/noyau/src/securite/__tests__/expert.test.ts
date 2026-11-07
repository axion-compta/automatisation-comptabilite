import { describe, expect, it } from 'vitest';
import { doitAvertir, prolonger, verifierAccesExpert, type AccesExpert } from '../expert.js';
import { ErreurSecurite } from '../types.js';

const T0 = '2026-03-01T10:00:00.000Z';
const FIN = '2026-04-01T10:00:00.000Z';
const ms = (s: string) => Date.parse(s);
const iso = (n: number) => new Date(n).toISOString();
const acces = (p: Partial<AccesExpert> = {}): AccesExpert => ({
  societeId: 'A', personneId: 'p1@exemple.fr', mode: 'lecture_commentaire', expireLe: FIN,
  perimetre: { exercices: ['2026'], journaux: ['ACH'], comptesBancaires: ['CB1'] }, ...p,
});
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurSecurite ? e.code : 'autre'; }
  return 'aucune';
};

describe('securite/expert', () => {
  it('revoque-t0-refuse-a-t0-plus-45s', () => {
    const a = acces({ revoqueLe: T0 });
    const r = { permis: false, raison: 'acces_revoque' };
    expect(verifierAccesExpert(a, { action: 'lire' }, T0)).toEqual(r);
    expect(verifierAccesExpert(a, { action: 'lire' }, iso(ms(T0) + 45000))).toEqual(r);
    expect(verifierAccesExpert(a, { action: 'lire' }, iso(ms(T0) - 1))).toEqual({ permis: true });
  });

  it('journal-hors-perimetre-refuse', () => {
    const a = acces();
    expect(verifierAccesExpert(a, { action: 'lire', journal: 'VTE' }, T0)).toEqual({ permis: false, raison: 'perimetre_expert' });
    expect(verifierAccesExpert(a, { action: 'lire', journal: 'ACH' }, T0)).toEqual({ permis: true });
    expect(verifierAccesExpert(a, { action: 'exporter', exercice: '2025' }, T0)).toEqual({ permis: false, raison: 'perimetre_expert' });
    expect(verifierAccesExpert(a, { action: 'commenter', compteBancaire: 'CB2' }, T0)).toEqual({ permis: false, raison: 'perimetre_expert' });
    expect(verifierAccesExpert(a, { action: 'commenter', exercice: '2026', journal: 'ACH', compteBancaire: 'CB1' }, T0)).toEqual({ permis: true });
  });

  it('expire-refuse-avec-evenement', () => {
    const r = verifierAccesExpert(acces(), { action: 'lire' }, iso(ms(FIN) + 1));
    expect(r).toEqual({ permis: false, raison: 'acces_expire', evenement: 'securite.acces_expert_expire' });
    const rev = verifierAccesExpert(acces({ revoqueLe: T0 }), { action: 'lire' }, iso(ms(FIN) + 1));
    expect(rev).toEqual({ permis: false, raison: 'acces_revoque' });
  });

  it('echeance-exacte-expiree', () => {
    expect(verifierAccesExpert(acces(), { action: 'lire' }, FIN)).toMatchObject({ permis: false, raison: 'acces_expire' });
  });

  it('une-ms-avant-echeance-permis', () => {
    expect(verifierAccesExpert(acces(), { action: 'lire' }, iso(ms(FIN) - 1))).toEqual({ permis: true });
  });

  it('valider-toujours-refuse', () => {
    for (const action of ['valider', 'saisir', 'deposer', 'cloturer', 'parametrer', 'gerer_equipe', 'lever_majeur', 'lever_bloquant', 'voir_piece_sensible'] as const) {
      expect(verifierAccesExpert(acces(), { action }, T0)).toEqual({ permis: false, raison: 'perimetre_expert' });
    }
    for (const action of ['lire', 'exporter', 'commenter'] as const) {
      expect(verifierAccesExpert(acces(), { action }, T0)).toEqual({ permis: true });
    }
  });

  it('perimetre-vide-rien', () => {
    const a = acces({ perimetre: { exercices: [], journaux: [], comptesBancaires: [] } });
    for (const d of [{ exercice: '2026' }, { journal: 'ACH' }, { compteBancaire: 'CB1' }]) {
      expect(verifierAccesExpert(a, { action: 'lire', ...d }, T0)).toEqual({ permis: false, raison: 'perimetre_expert' });
    }
    expect(verifierAccesExpert(a, { action: 'lire' }, T0)).toEqual({ permis: true });
  });

  it('prolonger-revoque-refuse', () => {
    const a = acces({ revoqueLe: T0 });
    const copie = JSON.stringify(a);
    expect(code(() => prolonger(a, T0, 1000))).toBe('acces_revoque');
    expect(JSON.stringify(a)).toBe(copie);
    const ok = acces();
    const n = prolonger(ok, T0, 5000);
    expect(n.expireLe).toBe(iso(ms(T0) + 5000));
    expect(n).not.toBe(ok);
    expect(ok.expireLe).toBe(FIN);
    expect(n.perimetre).toEqual(ok.perimetre);
    expect('revoqueLe' in n).toBe(false);
    const futur = acces({ revoqueLe: iso(ms(T0) + 1) });
    expect(prolonger(futur, T0, 5000).revoqueLe).toBe(futur.revoqueLe);
  });

  it('avertir-une-seule-fois', () => {
    const pre = 1000;
    const av = (maintenant: string, deja = false, a = acces()) => doitAvertir(a, maintenant, pre, deja);
    expect(av(iso(ms(FIN) - pre))).toBe(true);
    expect(av(iso(ms(FIN) - pre - 1))).toBe(false);
    expect(av(iso(ms(FIN) - 1))).toBe(true);
    expect(av(iso(ms(FIN) - pre), true)).toBe(false);
    expect(av(FIN)).toBe(false);
    expect(av(iso(ms(FIN) - 1), false, acces({ revoqueLe: T0 }))).toBe(false);
    expect(doitAvertir(acces(), iso(ms(FIN) - pre), 0, false)).toBe(false);
  });

  it('dates-invalides-refusees', () => {
    const a = acces();
    const d = { action: 'lire' } as const;
    for (const m of ['', '31/12/2026', 'abc', '2026-03-01', '2026-13-45T00:00:00Z', NaN as unknown as string, 5 as unknown as string]) {
      expect(code(() => verifierAccesExpert(a, d, m))).toBe('argument_invalide');
      expect(code(() => prolonger(a, m, 1000))).toBe('argument_invalide');
      expect(code(() => doitAvertir(a, m, 1000, false))).toBe('argument_invalide');
    }
    expect(code(() => verifierAccesExpert(acces({ expireLe: '31/12/2026' }), d, T0))).toBe('argument_invalide');
    expect(code(() => verifierAccesExpert(acces({ revoqueLe: '' }), d, T0))).toBe('argument_invalide');
    for (const n of [-1, Infinity, -Infinity, NaN, 1.5]) {
      expect(code(() => prolonger(a, T0, n))).toBe('argument_invalide');
      expect(code(() => doitAvertir(a, T0, n, false))).toBe('argument_invalide');
    }
    expect(code(() => prolonger(a, T0, 0))).toBe('aucune');
    expect(code(() => doitAvertir(a, T0, 0, false))).toBe('aucune');
  });
});
