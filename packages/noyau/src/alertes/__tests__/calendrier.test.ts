import { describe, expect, it } from 'vitest';
import { calendrier, constatsDateIntrouvable, ErreurCalendrier, type EntreeEcheance } from '../calendrier.js';

const F = { societeId: 's1', exerciceId: 'e1', du: '2026-01-01', au: '2026-12-31', jour: '2026-06-15' };
const SRC = 'https://exemple.invalid/source';
const e = (p: { [K in keyof EntreeEcheance]?: EntreeEcheance[K] | undefined } = {}): EntreeEcheance => ({ id: 'x1', societeId: 's1', exerciceId: 'e1', type: 'tva', dateLimite: '2026-07-01', faite: false, ...p }) as EntreeEcheance;
const code = (f: () => unknown) => {
  try {
    f();
  } catch (err) {
    return err instanceof ErreurCalendrier ? err.code : 'autre';
  }
  return 'aucune';
};

describe('calendrier', () => {
  it('a-venir-faite-en-retard', () => {
    const l = calendrier([e({ id: 'a', dateLimite: '2026-07-01' }), e({ id: 'b', dateLimite: '2026-03-01', faite: true }), e({ id: 'c', dateLimite: '2026-02-01' })], F);
    expect(l.map((x) => [x.id, x.statut])).toEqual([['c', 'en_retard'], ['b', 'faite'], ['a', 'a_venir']]);
  });
  it('date-absente-inconnue-et-constat', () => {
    const l = calendrier([e({ id: 'z', dateLimite: undefined, type: 'cfe' })], F);
    expect(l[0]!.statut).toBe('inconnue');
    expect(l[0]!.dateLimite).toBeUndefined();
    expect(constatsDateIntrouvable(l)).toEqual([{ regle: 'ECH-INTROUVABLE', objetType: 'echeance', objetId: 'z', gravite: 'a_faire' }]);
    expect(constatsDateIntrouvable(calendrier([e()], F))).toEqual([]);
  });
  it('parametre-a-verifier-avec-source', () => {
    const l = calendrier([e({ id: 'a', statutParametre: 'a_verifier', sourceUrl: SRC }), e({ id: 'b', statutParametre: 'valide' }), e({ id: 'c', statutParametre: 'non_verifie', sourceUrl: SRC })], F);
    const par = Object.fromEntries(l.map((x) => [x.id, x]));
    expect(par.a).toMatchObject({ aVerifier: true, sourceUrl: SRC });
    expect(par.c).toMatchObject({ aVerifier: true, sourceUrl: SRC });
    expect(par.b!.aVerifier).toBe(false);
  });
  it('a-verifier-sans-source-refuse', () => {
    expect(code(() => calendrier([e({ statutParametre: 'a_verifier' })], F))).toBe('source_absente');
    expect(code(() => calendrier([e({ statutParametre: 'retire', sourceUrl: '' })], F))).toBe('source_absente');
  });
  it('autre-societe-jamais-rendue', () => {
    expect(calendrier([e({ societeId: 's2' })], F)).toEqual([]);
  });
  it('autre-exercice-jamais-rendu', () => {
    expect(calendrier([e({ exerciceId: 'e2' })], F)).toEqual([]);
  });
  it('ordre-inverse-refuse', () => {
    expect(code(() => calendrier([], { ...F, du: '2026-12-31', au: '2026-01-01' }))).toBe('ordre_inverse');
    expect(code(() => calendrier([], { ...F, du: '2026-05-05', au: '2026-05-05' }))).toBe('aucune');
  });
  it('tri-inconnues-a-la-fin', () => {
    const l = calendrier([e({ id: 'u2', dateLimite: undefined }), e({ id: 'd2', dateLimite: '2026-09-01' }), e({ id: 'u1', dateLimite: undefined }), e({ id: 'd1', dateLimite: '2026-08-01' }), e({ id: 'd0', dateLimite: '2026-08-01' })], F);
    expect(l.map((x) => x.id)).toEqual(['d0', 'd1', 'd2', 'u1', 'u2']);
    const fen = { ...F, du: '2026-03-01', au: '2026-09-01' };
    const w = calendrier([e({ id: 'avant', dateLimite: '2026-02-28' }), e({ id: 'apres', dateLimite: '2026-09-02' }), e({ id: 'du', dateLimite: '2026-03-01' }), e({ id: 'au', dateLimite: '2026-09-01' }), e({ id: 'sans', dateLimite: undefined })], fen);
    expect(w.map((x) => x.id)).toEqual(['du', 'au', 'sans']);
  });
  it('faite-le-jour-limite-pas-en-retard', () => {
    const j = { ...F, jour: '2026-07-01' };
    expect(calendrier([e({ faite: true })], j)[0]!.statut).toBe('faite');
    expect(calendrier([e()], j)[0]!.statut).toBe('a_venir');
    expect(calendrier([e()], { ...F, jour: '2026-07-02' })[0]!.statut).toBe('en_retard');
  });
});
