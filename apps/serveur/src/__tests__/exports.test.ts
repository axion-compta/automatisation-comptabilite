import { createHash } from 'node:crypto';
import { call } from '@orpc/server';
import { afterEach, describe, expect, it } from 'vitest';
import { LIMITES_EXPORT, creerServiceExports } from '../../../../packages/contrat/src/domaines/exports-service.js';
import { creerApp } from '../app.js';
import { routesExports } from '../domaines/exports.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = () => {
  const app = creerApp();
  apps.push(app);
  return {
    lire: (url: string) => app.inject({ method: 'GET', url }),
    exporter: (corps: unknown, cle: string | undefined = 'cle-fictive-1') => app.inject({ method: 'POST', url: '/exports', payload: corps as object, headers: cle ? { 'idempotency-key': cle } : {} }),
  };
};
const BOM = String.fromCodePoint(0xfeff);
const CSV = { liste: 'listerTiers', format: 'csv' };

describe('serveur : export des listes', () => {
  it('serveur-csv-memes-lignes-que-la-liste', async () => {
    const { lire, exporter } = neuf();
    const liste = (await lire('/tiers?type=client')).json().body as Array<Record<string, string>>;
    const r = await exporter({ ...CSV, filtres: { type: 'client' } });
    expect(r.statusCode).toBe(200);
    const octets = Buffer.from(r.json().body.octetsBase64, 'base64');
    const lignes = octets.toString('utf8').replace(new RegExp('^' + BOM), '').split('\r\n').slice(0, -1);
    expect(lignes.slice(1)).toEqual(liste.map((t) => `"${t['code']}";"${t['nom']}";"${t['type']}";"${t['email']}"`));
    expect(r.json().body.empreinte).toBe(createHash('sha256').update(octets).digest('hex'));
    expect(r.json().body.nbLignes).toBe(liste.length);
  });

  it('serveur-erreurs-400-404', async () => {
    const { exporter } = neuf();
    expect((await exporter({ ...CSV, societe_id: 'soc-fictive' })).statusCode).toBe(400);
    expect((await exporter(CSV, '')).statusCode).toBe(400);
    expect((await exporter({ ...CSV, format: 'pdf' })).statusCode).toBe(400);
    const inconnue = await exporter({ ...CSV, liste: 'inconnue' });
    expect([inconnue.statusCode, inconnue.json().code]).toEqual([404, 'LISTE_NON_EXPORTABLE']);
    const filtre = await exporter({ ...CSV, filtres: { inconnu: 'x' } });
    expect(filtre.statusCode).toBe(400);
  });

  it('serveur-trop-gros-et-tache-a-venir', async () => {
    const forge = (total: number) => routesExports(creerServiceExports({ sources: { listerTiers: { code: 'tiers', filtres: [], lister: () => ({ body: [], total }) } } }));
    const entree = { headers: { 'idempotency-key': 'cle-fictive-1' }, body: { liste: 'listerTiers', format: 'xlsx' as const } };
    await expect(call(forge(LIMITES_EXPORT.maximum + 1).exporter, entree)).rejects.toMatchObject({ code: 'EXPORT_TROP_GROS', status: 413 });
    await expect(call(forge(LIMITES_EXPORT.direct + 1).exporter, entree)).rejects.toMatchObject({ code: 'EXPORT_EN_TACHE_A_VENIR', status: 501 });
  });
});
