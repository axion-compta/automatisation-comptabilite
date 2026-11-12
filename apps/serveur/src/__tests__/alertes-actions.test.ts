import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const AL = '/exercices/EX2026/alertes';
const neuf = () => {
  const app = creerApp();
  apps.push(app);
  const id = async (regle: string) => (await app.inject({ method: 'GET', url: AL })).json().body.find((a: { regle: string }) => a.regle === regle);
  const poster = (url: string, body: unknown, cle: string | undefined = 'cle-fictive-1') =>
    app.inject({ method: 'POST', url, payload: body as object, headers: cle ? { 'idempotency-key': cle } : {} });
  return { app, id, poster };
};

describe('serveur : actions sur les alertes', () => {
  it('serveur-reporter-puis-annuler', async () => {
    const { app, id, poster } = neuf();
    const a = await id('ALR-08');
    const r = await poster(`${AL}/${a.id}/reporter`, { jours: 3, version: a.version });
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ avant: 'ouverte', apres: 'reportee', version: a.version + 1 });
    const rejeu = await poster(`${AL}/${a.id}/reporter`, { jours: 3, version: a.version });
    expect(rejeu.json()).toEqual(r.json());
    const c = await poster(`${AL}/${a.id}/annuler`, { version: a.version + 1 }, 'cle-fictive-2');
    expect(c.json().body).toMatchObject({ avant: 'reportee', apres: 'ouverte' });
    const lu = await app.inject({ method: 'GET', url: '/exercices/EX2026/compteurs' });
    expect(lu.json().body.parEntree.activite.ouvertes).toBe(1);
  });

  it('serveur-erreurs-declarees', async () => {
    const { id, poster } = neuf();
    const info = await id('ALR-08');
    const bloquant = await id('ALR-05');
    const urgent = await id('ALR-04');
    const cas: Array<[string, unknown, number, string]> = [
      [`${AL}/${info.id}/reporter`, { jours: 2, version: info.version }, 422, 'REPORT_INVALIDE'],
      [`${AL}/${info.id}/ignorer`, { motif: 'abc', version: info.version }, 422, 'MOTIF_REQUIS'],
      [`${AL}/${urgent.id}/reporter`, { jours: 1, version: urgent.version }, 403, 'REPORT_INTERDIT'],
      [`${AL}/${bloquant.id}/ignorer`, { motif: 'motif fictif', version: bloquant.version }, 403, 'BLOQUANT_NON_IGNORABLE'],
      [`${AL}/${info.id}/annuler`, { version: info.version }, 409, 'DELAI_ANNULATION_DEPASSE'],
      [`${AL}/inconnue/reporter`, { jours: 1, version: 1 }, 404, 'ALERTE_INCONNUE'],
      ['/exercices/EX1999/alertes/x/reporter', { jours: 1, version: 1 }, 404, 'EXERCICE_INCONNU'],
    ];
    for (const [url, corps, statut, codeErreur] of cas) {
      const r = await poster(url, corps);
      expect([r.statusCode, r.json().code]).toEqual([statut, codeErreur]);
    }
    await poster(`${AL}/${info.id}/ignorer`, { motif: 'motif fictif', version: info.version }, 'cle-fictive-9');
    const perime = await poster(`${AL}/${info.id}/reporter`, { jours: 1, version: info.version }, 'cle-fictive-10');
    expect([perime.statusCode, perime.json().code, perime.json().data]).toEqual([409, 'CONFLIT_VERSION', { versionActuelle: info.version + 1 }]);
  });

  it('serveur-corps-strict-et-cle-obligatoire', async () => {
    const { id, poster } = neuf();
    const a = await id('ALR-08');
    expect((await poster(`${AL}/${a.id}/reporter`, { jours: 1, version: a.version }, '')).statusCode).toBe(400);
    expect((await poster(`${AL}/${a.id}/reporter`, { jours: 1, version: a.version, extra: 1 })).statusCode).toBe(400);
    expect((await poster(`${AL}/${a.id}/ignorer`, { motif: 'motif fictif' })).statusCode).toBe(400);
  });
});
