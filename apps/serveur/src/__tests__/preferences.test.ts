import { afterEach, describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerApp } from '../app.js';
import { routesPreferences } from '../domaines/preferences.js';

const K = { 'idempotency-key': 'cle-essai-direct' };
const appel = <I>(proc: unknown, input: I) => call(proc as Parameters<typeof call>[0], input, { context: {} });

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const demarrer = () => {
  const a = creerApp();
  apps.push(a);
  let n = 0;
  const cle = () => ({ 'idempotency-key': `cle-essai-${++n}` });
  const lire = async (appareil = 'bureau') => (await a.inject({ method: 'GET', url: `/preferences?appareil=${appareil}` })).json().body;
  const ecrire = (nom: string, payload: unknown, entetes: Record<string, string> = cle()) =>
    a.inject({ method: 'PUT', url: `/preferences/${nom}`, headers: entetes, payload: payload as object });
  const usage = (evenements: unknown[], entetes: Record<string, string> = cle()) =>
    a.inject({ method: 'POST', url: '/usage', headers: entetes, payload: { evenements } });
  return { a, cle, lire, ecrire, usage };
};

describe('serveur : préférences et mesure d’usage', () => {
  it('defauts-premier-lancement-elargi', async () => {
    const { lire } = demarrer();
    const l = await lire();
    expect(l.chat_etat).toEqual({ valeur: 'elargi', origine: 'defaut' });
    expect(l.menu_etat).toEqual({ valeur: 'ouvert', origine: 'defaut' });
  });

  it('ecriture-puis-lecture', async () => {
    const { lire, ecrire } = demarrer();
    const r = await ecrire('menu_etat', { valeur: 'reduit', appareil: 'mobile' });
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ cle: 'menu_etat', appareil: 'mobile', valeur: 'reduit', origine: 'personne' });
    expect((await lire('mobile')).menu_etat).toEqual({ valeur: 'reduit', origine: 'personne' });
    expect((await lire('bureau')).menu_etat.valeur).toBe('ouvert');
  });

  it('derniere-ecriture-gagne-sans-409', async () => {
    const { lire, ecrire } = demarrer();
    const t = Date.now();
    expect((await ecrire('mode', { valeur: 'comptable', appareil: 'tous', modifieLeClient: t })).statusCode).toBe(200);
    const r = await ecrire('mode', { valeur: 'simple', appareil: 'tous', modifieLeClient: t + 1000 });
    expect(r.statusCode).toBe(200);
    const ancienne = await ecrire('mode', { valeur: 'comptable', appareil: 'tous' });
    expect(ancienne.statusCode).toBe(200);
    expect((await lire()).mode.valeur).toBe('simple');
  });

  it('idempotency-key-rejouee', async () => {
    const { lire, ecrire, cle } = demarrer();
    const k = cle();
    const un = await ecrire('mode', { valeur: 'comptable', appareil: 'tous' }, k);
    await ecrire('mode', { valeur: 'simple', appareil: 'tous' });
    const deux = await ecrire('mode', { valeur: 'simple', appareil: 'tous' }, k);
    expect(deux.json()).toEqual(un.json());
    expect((await lire()).mode.valeur).toBe('simple');
  });

  it('sans-idempotency-key-400', async () => {
    const { ecrire, usage, lire } = demarrer();
    expect((await ecrire('mode', { valeur: 'comptable', appareil: 'tous' }, {})).statusCode).toBe(400);
    expect((await usage([{ type: 'ecran_ouvert' }], {})).statusCode).toBe(400);
    expect((await lire()).mode.origine).toBe('defaut');
  });

  it('cle-inconnue-400', async () => {
    const { ecrire } = demarrer();
    for (const [nom, valeur] of [['inconnue', 'x'], ['menu_etat', 'ferme'], ['mode', 3]] as const) {
      const r = await ecrire(nom, { valeur, appareil: nom === 'mode' ? 'tous' : 'bureau' });
      expect(r.statusCode).toBe(400);
      const corps = { valeur, appareil: nom === 'mode' ? 'tous' : 'bureau' } as const;
      const routes = routesPreferences();
      await expect(appel(routes.ecrirePreference, { params: { cle: nom }, headers: K, body: corps })).rejects.toMatchObject({ code: 'PREFERENCE_INVALIDE', status: 400 });
    }
  });

  it('format-nombre-400-format-fixe', async () => {
    const { ecrire } = demarrer();
    const r = await ecrire('format_nombre', { valeur: 'anglais', appareil: 'tous' });
    expect(r.statusCode).toBe(400);
    const corps = { valeur: 'anglais', appareil: 'tous' } as const;
    await expect(appel(routesPreferences().ecrirePreference, { params: { cle: 'format_nombre' }, headers: K, body: corps })).rejects.toMatchObject({ code: 'FORMAT_FIXE', status: 400 });
  });

  it('usage-champ-inconnu-400', async () => {
    const { usage } = demarrer();
    const r = await usage([{ type: 'ecran_ouvert', contenu: 'texte libre' }]);
    expect(r.statusCode).toBe(400);
    const corps = { evenements: [{ type: 'ecran_ouvert', contenu: 'texte libre' }] };
    await expect(appel(routesPreferences().mesurerUsage, { headers: K, body: corps })).rejects.toMatchObject({ code: 'CHAMP_INCONNU', status: 400 });
    expect((await usage(Array.from({ length: 101 }, () => ({ type: 'ecran_ouvert' })))).statusCode).toBe(400);
  });

  it('usage-desactive-rien-ecrit', async () => {
    const { usage, ecrire } = demarrer();
    const r = await usage([{ type: 'ecran_ouvert', ecran_code: 'tdb' }]);
    expect(r.statusCode).toBe(204);
    expect(r.body).toBe('');
    expect((await ecrire('usage_mesure', { valeur: 'active', appareil: 'tous' })).statusCode).toBe(200);
    expect((await usage([{ type: 'ecran_ouvert', ecran_code: 'tdb' }])).statusCode).toBe(204);
  });
});
