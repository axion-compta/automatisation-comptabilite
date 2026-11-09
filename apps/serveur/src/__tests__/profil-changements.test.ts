import { afterEach, describe, expect, it } from 'vitest';
import { Apercu } from '../../../../packages/contrat/src/domaines/profil-changements.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = () => {
  const a = creerApp();
  apps.push(a);
  return a;
};
let n = 0;
const cle = () => 'cle-test-' + String(++n).padStart(6, '0');
const post = (a: ReturnType<typeof creerApp>, url: string, payload: object, k: string | null = cle()) =>
  a.inject({ method: 'POST', url, payload, headers: k ? { 'idempotency-key': k, 'content-type': 'application/json' } : { 'content-type': 'application/json' } });
const DEMANDE = { cle: 'regime_tva', valeur: 'reel_normal', effetDebut: '2026-07-01', motif: 'Changement de régime' };
const apercu = async (a: ReturnType<typeof creerApp>, d: object = DEMANDE) => post(a, '/profil/changements/apercu', d);
const profil = async (a: ReturnType<typeof creerApp>) => (await a.inject({ method: 'GET', url: '/profil' })).json();

describe('serveur : aperçu puis confirmation d’un changement', () => {
  it('apercu-sans-effet', async () => {
    const a = neuf();
    const avant = await profil(a);
    const r = await apercu(a);
    expect(r.statusCode).toBe(200);
    expect(Apercu.parse(r.json().body).brouillonsRecalcules).toBeGreaterThan(0);
    expect(await profil(a)).toEqual(avant);
  });

  it('apercu-zero-ecriture-validee', async () => {
    const a = neuf();
    for (const effetDebut of ['2026-04-01', '2026-07-01', '2027-01-01']) {
      expect(Apercu.parse((await apercu(a, { ...DEMANDE, effetDebut })).json().body).ecrituresValideesTouchees).toBe(0);
    }
  });

  it('effet-avant-periode-deposee-409', async () => {
    const r = await apercu(neuf(), { ...DEMANDE, effetDebut: '2026-02-01' });
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('PERIODE_DEPOSEE');
  });

  it('confirmation-cree-une-ligne', async () => {
    const a = neuf();
    const { apercuId } = Apercu.parse((await apercu(a)).json().body);
    const k = cle();
    const r = await post(a, '/profil/changements', { apercuId }, k);
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ cle: 'regime_tva', valeur: 'reel_normal', effetDebut: '2026-07-01' });
    expect((await post(a, '/profil/changements', { apercuId }, k)).json()).toEqual(r.json());
    expect((await post(a, '/profil/changements', { apercuId })).statusCode).toBe(404);
  });

  it('confirmation-sans-apercu-404', async () => {
    const r = await post(neuf(), '/profil/changements', { apercuId: 'apercu-absent' });
    expect(r.statusCode).toBe(404);
    expect(r.json().code).toBe('APERCU_INCONNU');
  });

  it('apercu-perime-409', async () => {
    const a = neuf();
    const { apercuId } = Apercu.parse((await apercu(a)).json().body);
    await post(a, '/profil/champs/code_postal_siege', { valeur: '75001', origine: 'document', effetDebut: '2026-01-01' });
    const r = await post(a, '/profil/changements', { apercuId });
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('APERCU_PERIME');
  });

  it('sans-en-tete-refuse', async () => {
    const a = neuf();
    expect((await post(a, '/profil/changements/apercu', DEMANDE, null)).statusCode).toBe(400);
    expect((await post(a, '/profil/changements', { apercuId: 'apercu-000001' }, null)).statusCode).toBe(400);
    expect((await post(a, '/profil/changements/apercu', DEMANDE, 'court')).statusCode).toBe(400);
  });
});
