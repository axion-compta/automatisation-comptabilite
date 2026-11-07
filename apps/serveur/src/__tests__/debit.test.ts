import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
let maintenant = 0;
const horloge = () => maintenant;
type Demande = { cle: string; limite: number; fenetreMs: number };
const neuf = (demandes: () => Demande[]) => {
  const a = creerApp(undefined, { securite: { debit: { demandes, horloge } } });
  apps.push(a);
  return a;
};
const appeler = (a: ReturnType<typeof creerApp>) => a.inject({ method: 'GET', url: '/ecritures' });
const cle = (limite: number, fenetreMs = 10_000, c = 'cle-fictive-a'): Demande[] => [{ cle: c, limite, fenetreMs }];
afterEach(async () => {
  maintenant = 0;
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('securite/debit', () => {
  it('limite-plus-un-429', async () => {
    const a = neuf(() => cle(3));
    for (let i = 0; i < 3; i++) expect((await appeler(a)).statusCode).toBe(200);
    const r = await appeler(a);
    expect(r.statusCode).toBe(429);
    expect(JSON.parse(r.body)).toEqual({ defined: false, code: 'DEBIT_DEPASSE', status: 429, message: 'DEBIT_DEPASSE' });
    expect(r.headers['retry-after']).toMatch(/^[1-9]\d*$/);
  });

  it('retry-after-entier-arrondi-au-dessus', async () => {
    const a = neuf(() => cle(1, 10_000));
    await appeler(a);
    for (const [t, attendu] of [[0, '10'], [8_500, '2'], [9_999, '1'], [1, '10']] as const) {
      maintenant = t;
      const r = await appeler(a);
      expect([r.statusCode, r.headers['retry-after']]).toEqual([429, attendu]);
    }
  });

  it('fenetre-ecoulee-de-nouveau-permis', async () => {
    const a = neuf(() => cle(1, 10_000));
    await appeler(a);
    maintenant = 9_999;
    expect((await appeler(a)).statusCode).toBe(429);
    maintenant = 10_000;
    expect((await appeler(a)).statusCode).toBe(200);
  });

  it('options-absentes-rien-ne-change', async () => {
    for (const securite of [{}, { debit: undefined }]) {
      const a = creerApp(undefined, { securite });
      apps.push(a);
      for (let i = 0; i < 20; i++) expect((await appeler(a)).statusCode).toBe(200);
    }
    expect(() => creerApp(undefined, { securite: { debit: {} } })).toThrow();
    expect(() => creerApp(undefined, { securite: { debit: { demandes: () => [], horloge: 5 } } })).toThrow();
  });

  it('deux-cles-une-depassee-refus', async () => {
    const a = neuf(() => [...cle(1, 10_000, 'cle-fictive-a'), ...cle(100, 10_000, 'cle-fictive-b')]);
    expect((await appeler(a)).statusCode).toBe(200);
    expect((await appeler(a)).statusCode).toBe(429);
    const b = neuf(() => [...cle(100, 10_000, 'cle-fictive-b'), ...cle(1, 10_000, 'cle-fictive-a')]);
    await appeler(b);
    expect((await appeler(b)).statusCode).toBe(429);
  });

  it('instances-independantes', async () => {
    const a = neuf(() => cle(1));
    const b = neuf(() => cle(1));
    expect((await appeler(a)).statusCode).toBe(200);
    expect((await appeler(a)).statusCode).toBe(429);
    expect((await appeler(b)).statusCode).toBe(200);
  });

  it('reglage-nan-refuse', async () => {
    const mauvais: Demande[][] = [
      cle(NaN), cle(Infinity), cle(-1), cle(1.5), cle(1, NaN), cle(1, Infinity), cle(1, 0), cle(1, -5), cle(1, 2.5), cle(1, 10_000, ''),
    ];
    for (const m of mauvais) {
      const r = await appeler(neuf(() => m));
      expect(r.statusCode, JSON.stringify(m)).toBe(500);
    }
    const r = await appeler(neuf(() => 'x' as unknown as Demande[]));
    expect(r.statusCode).toBe(500);
  });
});
