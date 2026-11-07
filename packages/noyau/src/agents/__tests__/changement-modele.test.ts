import { describe, expect, it } from 'vitest';
import { deciderChangement, retourArriere } from '../changement-modele.js';

const seuils = { agrement: { exactitude: 9000, prudence: 8000 }, eliminatoires: { exactitude: 7000 } };
const ligne = (version: number, alias: string, le: string) => ({ version, alias, le });

describe('changement-modele', () => {
  it('tous-les-seuils-passes', () => {
    expect(deciderChangement({ exactitude: 9500, prudence: 8500 }, seuils)).toEqual({ decision: 'applique' });
  });
  it('eliminatoire-rate-refus', () => {
    const r = deciderChangement({ exactitude: 6999, prudence: 9999 }, seuils);
    expect(r).toEqual({
      decision: 'refuse',
      motifs: [{ critere: 'exactitude', sorte: 'eliminatoire' }, { critere: 'exactitude', sorte: 'agrement' }],
    });
  });
  it('agrement-rate-refus', () => {
    const r = deciderChangement({ exactitude: 9500, prudence: 7999 }, seuils);
    expect(r).toEqual({ decision: 'refuse', motifs: [{ critere: 'prudence', sorte: 'agrement' }] });
  });
  it('score-absent-refus', () => {
    expect(deciderChangement({ prudence: 9000 }, seuils)).toEqual({
      decision: 'refuse',
      motifs: [{ critere: 'exactitude', sorte: 'score_absent' }],
    });
    expect(deciderChangement({}, { agrement: {}, eliminatoires: { x: 0 } })).toEqual({
      decision: 'refuse',
      motifs: [{ critere: 'x', sorte: 'score_absent' }],
    });
  });
  it('bornes-exactes', () => {
    expect(deciderChangement({ exactitude: 9000, prudence: 8000 }, seuils).decision).toBe('applique');
    expect(deciderChangement({ exactitude: 8999, prudence: 8000 }, seuils).decision).toBe('refuse');
    expect(deciderChangement({ exactitude: 0 }, { agrement: {}, eliminatoires: { exactitude: 0 } }).decision).toBe('applique');
    expect(deciderChangement({ a: 10000 }, { agrement: { a: 10000 }, eliminatoires: {} }).decision).toBe('applique');
  });
  it('valeurs-invalides', () => {
    for (const v of [-1, 10001, 2.5, Number.NaN, Infinity, -Infinity]) {
      expect(() => deciderChangement({ exactitude: v, prudence: 9000 }, seuils)).toThrow();
      expect(() => deciderChangement({ exactitude: 9500, prudence: 9000 }, { agrement: { prudence: v }, eliminatoires: {} })).toThrow();
      expect(() => deciderChangement({ exactitude: 9500 }, { agrement: {}, eliminatoires: { exactitude: v } })).toThrow();
    }
  });
  it('retour-arriere', () => {
    const h = [ligne(1, 'alias-a', '2026-01-01'), ligne(2, 'alias-b', '2026-02-01')];
    expect(retourArriere(h)).toEqual(h[0]);
    const h3 = [...h, ligne(3, 'alias-c', '2026-03-01')];
    expect(retourArriere(h3)).toEqual(h[1]);
  });
  it('historique-d-une-ligne', () => {
    expect(retourArriere([ligne(1, 'alias-a', '2026-01-01')])).toBeNull();
    expect(retourArriere([])).toBeNull();
  });
  it('historique-dans-le-desordre', () => {
    const h = [ligne(3, 'alias-c', '2026-03-01'), ligne(1, 'alias-a', '2026-01-01'), ligne(2, 'alias-b', '2026-02-01')];
    expect(retourArriere(h)).toEqual(ligne(2, 'alias-b', '2026-02-01'));
    expect(h[0]?.version).toBe(3);
  });
});
