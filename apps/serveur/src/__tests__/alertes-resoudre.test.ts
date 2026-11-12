import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { portDepuis } from '../domaines/alertes-resoudre.js';
import { creerServiceAlertes } from '../../../../packages/contrat/src/domaines/alertes-service.js';
import { RESOLUTIONS } from '../../../../packages/contrat/src/domaines/alertes-resoudre.js';
import { CATALOGUE_MVP } from '../../../../packages/noyau/src/alertes/catalogue.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => void (await Promise.all(apps.splice(0).map((a) => a.close()))));
const LECTURE = ['compta-lire'];
const neuf = (permissions?: readonly string[]) => {
  const service = creerServiceAlertes();
  const app = creerApp(undefined, { alertesResoudre: portDepuis(service, permissions) });
  apps.push(app);
  const alerte = (regle: string) => service.lister().body.find((a) => a.regle === regle)!;
  const resoudre = (id: string, version: unknown, exercice = 'EX2026') =>
    app.inject({ method: 'POST', url: `/api/compta/v1/societes/soc-fictive/exercices/${exercice}/alertes/${id}/resoudre`, payload: { version } as object });
  return { service, alerte, resoudre };
};
const TOUTES = CATALOGUE_MVP.map((r) => r.code);
const ATTENDU = Object.fromEntries(CATALOGUE_MVP.map((r) => [r.code, [r.actionPrincipale === 'payer_facture' ? 'proposition' : 'ouvrir', `/${r.entreeMenu}/`]]));
describe('serveur : résoudre une alerte (navigation seule)', () => {
  it('resolution-par-code', async () => {
    expect(TOUTES).toHaveLength(11);
    const { alerte, resoudre } = neuf();
    for (const code of TOUTES) {
      const a = alerte(code);
      const r = await resoudre(a.id, a.version);
      const [mode, debut] = ATTENDU[code]!;
      if (a.etat === 'ouverte' || a.etat === 'reportee') {
        expect([code, r.statusCode, r.json().body.mode]).toEqual([code, 200, mode]);
        expect(r.json().body.lien.startsWith(debut)).toBe(true);
        expect(r.json().body.aValider).toBe(mode === 'proposition' ? true : undefined);
      } else expect([code, r.statusCode]).toEqual([code, 409]);
    }
  });

  it('catalogue-complet', () => {
    for (const r of CATALOGUE_MVP) expect(RESOLUTIONS[r.actionPrincipale], r.actionPrincipale).toBeDefined();
    expect(Object.keys(RESOLUTIONS).sort()).toEqual(CATALOGUE_MVP.map((r) => r.actionPrincipale).sort());
  });

  it('paiement-proposition-seulement', async () => {
    const { alerte, resoudre } = neuf();
    const a = alerte('ALR-09');
    const r = await resoudre(a.id, a.version);
    expect(r.json().body).toMatchObject({ action: 'payer_facture', mode: 'proposition', aValider: true });
    expect(Object.entries(RESOLUTIONS).filter(([, v]) => v.mode === 'proposition').map(([k]) => k)).toEqual(['payer_facture']);
  });

  it('aucune-ecriture', async () => {
    const { service, alerte, resoudre } = neuf();
    const etat = () => JSON.stringify([service.lister(), service.journal()]);
    const avant = etat();
    for (const code of TOUTES) {
      const a = alerte(code);
      await resoudre(a.id, a.version);
    }
    expect(etat()).toBe(avant);
  });

  it('lien-interne', async () => {
    const { alerte, resoudre } = neuf();
    for (const code of TOUTES) {
      const a = alerte(code);
      const r = await resoudre(a.id, a.version);
      if (r.statusCode !== 200) continue;
      const lien: string = r.json().body.lien;
      expect(lien.startsWith('/') && !lien.startsWith('//') && !lien.includes('://')).toBe(true);
      expect(lien).not.toMatch(/\d{3}/);
    }
  });

  it('version-perimee-409', async () => {
    const { alerte, resoudre } = neuf();
    const a = alerte('ALR-08');
    const r = await resoudre(a.id, a.version + 1);
    expect([r.statusCode, r.json().code, r.json().data]).toEqual([409, 'CONFLIT_VERSION', { versionActuelle: a.version }]);
    expect((await resoudre(a.id, 0)).statusCode).toBe(400);
  });

  it('role-insuffisant-403', async () => {
    const lecture = neuf(LECTURE);
    const a = lecture.alerte('ALR-09');
    const refus = await lecture.resoudre(a.id, a.version);
    expect([refus.statusCode, refus.json().code]).toEqual([403, 'ROLE_INSUFFISANT']);
    const b = lecture.alerte('ALR-08');
    expect((await lecture.resoudre(b.id, b.version)).statusCode).toBe(200);
    const aucun = neuf([]);
    const c = aucun.alerte('ALR-08');
    expect((await aucun.resoudre(c.id, c.version)).statusCode).toBe(403);
  });

  it('alerte-inactive-409', async () => {
    const { service, alerte, resoudre } = neuf();
    const a = alerte('ALR-08');
    service.ignorer('cle-fictive-1', a.id, 'motif fictif', a.version);
    const r = await resoudre(a.id, a.version + 1);
    expect([r.statusCode, r.json().code]).toEqual([409, 'ALERTE_INACTIVE']);
  });

  it('alerte-inconnue-404', async () => {
    const { resoudre } = neuf();
    const r = await resoudre('inconnue', 1);
    expect([r.statusCode, r.json().code]).toEqual([404, 'ALERTE_INCONNUE']);
    expect((await resoudre('x', 1, 'EX1999')).json().code).toBe('EXERCICE_INCONNU');
  });
});
