import { afterEach, describe, expect, it } from 'vitest';
import { ReponseSiren, ReponseVerificationTva } from '../../../../packages/contrat/src/domaines/identite.js';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const get = async (url: string) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'GET', url });
};

describe('serveur : identité', () => {
  it('siren-forme-400', async () => {
    for (const s of ['12345678', 'abcdefghi', '1234567890']) expect((await get('/siren/' + s)).statusCode).toBe(400);
    expect((await get('/tva-intracom/FR1112345678/verification')).statusCode).toBe(400);
  });

  it('serveur-repond-identite', async () => {
    const siren = await get('/siren/123456782');
    expect(siren.statusCode).toBe(200);
    expect(ReponseSiren.parse(siren.json()).body.etat).toBe('trouve');
    const faux = await get('/siren/123456789');
    expect(faux.statusCode).toBe(422);
    expect(faux.json()).toMatchObject({ code: 'SIREN_INVALIDE' });
    const ok = await get('/tva-intracom/FR11123456782/verification');
    expect(ReponseVerificationTva.parse(ok.json()).body).toEqual({ cle: 'juste', vies: 'verifie' });
    const ko = await get('/tva-intracom/FR12123456782/verification');
    expect(ko.json()).toEqual({ body: { cle: 'fausse', vies: 'non_verifie' } });
    const indispo = await get('/tva-intracom/FR14987654324/verification');
    expect(indispo.json()).toEqual({ body: { cle: 'juste', vies: 'non_verifie' } });
  });
});
