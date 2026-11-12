import { afterEach, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { configVentesActions } from '../domaines/ventes-actions.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const B = '/api/compta/v1/societes/soc-fictive/ventes/';
const h = (cle?: string, version?: string) => ({ 'x-personne': 'personne-fictive', ...(cle ? { 'idempotency-key': cle } : {}), ...(version ? { 'if-match': version } : {}) });

it('serveur-corrige-et-valide', async () => {
  const a = creerApp();
  apps.push(a);
  const post = (id: string, fin: string, headers: Record<string, string>, payload?: object) => a.inject({ method: 'POST', url: `${B}${id}/${fin}`, headers, ...(payload ? { payload } : {}) });
  const c = await post('VP-1-009', 'corrections', h('cle-fictive-1', '1'), { dateOperation: '2026-01-15' });
  expect([c.statusCode, c.json().body.version]).toEqual([200, 2]);
  expect((await post('VP-1-009', 'corrections', h('cle-fictive-2', '1'), { dateOperation: '2026-01-16' })).statusCode).toBe(412);
  expect((await post('VP-1-009', 'corrections', h(undefined, '2'), { dateOperation: '2026-01-16' })).statusCode).toBe(400);
  expect((await post('VP-1-009', 'corrections', h('cle-fictive-3', '2'), {})).statusCode).toBe(400);
  expect((await post('VP-9-999', 'valider', h('cle-fictive-4', '1'))).json().code).toBe('VENTE_INCONNUE');
  const refus = await post('VP-1-001', 'valider', h('cle-fictive-5', '1'));
  expect([refus.statusCode, refus.json().data]).toEqual([409, { motif: 'a_relire' }]);
  const v = await post('VP-1-009', 'valider', h('cle-fictive-6', '2'));
  expect([v.statusCode, v.json().body]).toMatchObject([200, { version: 3, ecriture: { statut: 'valide' } }]);
  expect((await post('VP-1-009', 'valider', h('cle-fictive-6', '2'))).json()).toEqual(v.json());
});

it('delai-lu-dans-la-configuration', () => {
  expect(configVentesActions({ VENTES_DELAI_ANNULATION_MS: '1234' }).delaiAnnulationMs).toBe(1234);
  for (const x of ['0', '-5', '1.5', 'abc', '']) expect(() => configVentesActions({ VENTES_DELAI_ANNULATION_MS: x })).toThrow();
});
