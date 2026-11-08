import { describe, expect, it } from 'vitest';
import { genererDeclarations } from '../../../donnees-fictives/src/declarations.js';
import { Echeance, QueryEcheances, ReponseEcheances } from '../domaines/echeances.js';
import { creerServiceEcheances, ErreurEcheances } from '../domaines/echeances-service.js';

const service = creerServiceEcheances();
const jeu = genererDeclarations().echeances;
const [A, B] = [jeu[0]!.dateLimite, jeu[1]!.dateLimite];
const veille = (d: string) => d.slice(0, 9) + String(Number(d.slice(9)) - 1);

describe('échéances en mémoire', () => {
  it('echeances-dans-l-intervalle', () => {
    const r = service.lister('2000-01-01', '2999-12-31');
    expect(ReponseEcheances.parse(r)).toEqual(r);
    expect(r.body.map((e) => e.code)).toEqual(['ECH_A', 'ECH_B']);
    expect(r.total).toBe(2);
    expect(r.body.every((e) => Echeance.safeParse(e).success)).toBe(true);
    expect(service.lister(A, A).body.map((e) => e.code)).toEqual(['ECH_A']);
    expect(service.lister('2000-01-01', veille(A))).toEqual({ body: [], total: 0 });
    expect(service.lister('2000-01-01', '2000-01-01').body).toEqual([]);
    expect(r.body[0]).toMatchObject({ statut: 'en_retard', niveau: 'rappel_seul', dateAVerifier: true });
    expect(r.body[1]).toMatchObject({ statut: 'a_venir', niveau: 'alerte' });
    r.body[0]!.code = 'MODIFIE';
    expect(service.lister(A, A).body[0]!.code).toBe('ECH_A');
  });

  it('bornes-incluses', () => {
    expect(service.lister(A, B).body).toHaveLength(2);
    expect(service.lister(A, veille(B)).body.map((e) => e.code)).toEqual(['ECH_A']);
    expect(service.lister(B, B).body.map((e) => e.code)).toEqual(['ECH_B']);
    const tri = creerServiceEcheances({ ...genererDeclarations(), echeances: [{ ...jeu[1]!, code: 'Z' }, { ...jeu[1]!, code: 'M' }, { ...jeu[0]! }] });
    expect(tri.lister(A, B).body.map((e) => e.code)).toEqual(['ECH_A', 'M', 'Z']);
    expect(creerServiceEcheances(genererDeclarations(1, 'vide')).lister(A, B)).toEqual({ body: [], total: 0 });
  });

  it('au-avant-du-refuse', () => {
    expect(() => service.lister(B, A)).toThrow(ErreurEcheances);
    expect(() => service.lister('2026-01-02', '2026-01-01')).toThrow(ErreurEcheances);
  });

  it('date-mal-formee-refusee', () => {
    const ok = { du: '2026-02-28', au: '2026-03-01' };
    expect(QueryEcheances.safeParse(ok).success).toBe(true);
    expect(QueryEcheances.safeParse({ du: '2024-02-29', au: '2024-02-29' }).success).toBe(true);
    for (const mauvaise of ['2026-02-30', '2026-13-01', '2026-1-1', '26-01-01', '', 'demain', '2026-01-01T00:00:00Z', '2026-00-10']) {
      expect(QueryEcheances.safeParse({ ...ok, du: mauvaise }).success).toBe(false);
      expect(QueryEcheances.safeParse({ ...ok, au: mauvaise }).success).toBe(false);
    }
    expect(QueryEcheances.safeParse({ du: ok.du }).success).toBe(false);
    expect(QueryEcheances.safeParse({ ...ok, autre: 'x' }).success).toBe(false);
    expect(Echeance.safeParse({ code: 'X', dateLimite: '2026-02-30', statut: 'a_venir', dateAVerifier: false, niveau: 'alerte' }).success).toBe(false);
  });
});
