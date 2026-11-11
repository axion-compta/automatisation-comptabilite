import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { OPERATIONS_SENSIBLES } from '../../../../packages/noyau/src/securite/types.js';
import {
  etiquetteOperation, installerReauthentification, operationDeEtiquette,
  type ReglagesConsole, type SessionReauth,
} from '../securite/reauthentification.js';

const MAINTENANT = Date.parse('2026-11-11T10:00:00Z');
const SEC = MAINTENANT / 1000;
const MIN = 60 * 1000;
// Valeurs de test fournies par la « console » fictive : jamais celles de la production.
const CONSOLE: ReglagesConsole = { reauthMaxMs: 5 * MIN, attenteApresRecuperationMs: 30 * MIN, codeErreur: 'CODE_CONSOLE_FICTIF' };

const agoMin = (m: number): SessionReauth => ({ personneId: 'personne-1', revendications: { acr: 'mfa', authTime: SEC - m * 60 } });
const sessions: Record<string, SessionReauth> = {
  six: agoMin(6), quatre: agoMin(4), vieille: agoMin(600), futur: agoMin(-4),
  recup: { ...agoMin(1), derniereRecuperationMs: MAINTENANT - 10 * MIN },
  recupAncienne: { ...agoMin(1), derniereRecuperationMs: MAINTENANT - 31 * MIN },
  sansMfa: { personneId: 'personne-1', revendications: { authTime: SEC } },
};

const traces: Array<{ evenement: string; personneId: string; donnees: Record<string, string> }> = [];
const apps: Array<ReturnType<typeof Fastify>> = [];
function monter(reglages: () => Promise<ReglagesConsole> = async () => CONSOLE) {
  const app = Fastify();
  apps.push(app);
  installerReauthentification(app, {
    reglages: { lire: reglages },
    session: (r) => sessions[String(r.headers['x-essai'])],
    horloge: () => MAINTENANT,
    trace: (evenement, personneId, donnees) => { traces.push({ evenement, personneId, donnees }); },
  });
  for (const op of OPERATIONS_SENSIBLES) {
    app.get(`/sensible/${op}`, { config: { etiquettes: [etiquetteOperation(op)] } }, async () => ({ ok: op }));
  }
  app.get('/ordinaire', async () => ({ ok: 'ordinaire' }));
  return app;
}
const appeler = (app: ReturnType<typeof Fastify>, url: string, essai?: string) =>
  app.inject({ method: 'GET', url, ...(essai ? { headers: { 'x-essai': essai } } : {}) });
afterEach(async () => { traces.length = 0; await Promise.all(apps.splice(0).map((a) => a.close())); });

describe('réauthentification récente', () => {
  it('six-minutes-refuse-quatre-minutes-permis', async () => {
    const app = monter();
    const refus = await appeler(app, '/sensible/changer_role', 'six');
    expect(refus.statusCode).toBe(401);
    expect(refus.json()).toMatchObject({ code: CONSOLE.codeErreur });
    expect((await appeler(app, '/sensible/changer_role', 'quatre')).statusCode).toBe(200);
  });
  it('le délai se lit chez la console à chaque appel, sans copie en dur', async () => {
    let reglage = CONSOLE;
    const app = monter(async () => reglage);
    expect((await appeler(app, '/sensible/cloturer', 'six')).statusCode).toBe(401);
    reglage = { ...CONSOLE, reauthMaxMs: 10 * MIN };
    expect((await appeler(app, '/sensible/cloturer', 'six')).statusCode).toBe(200);
  });
  it('export-fec-ancienne-connexion-refuse', async () => {
    const r = await appeler(monter(), '/sensible/exporter_fec', 'vieille');
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ code: CONSOLE.codeErreur, status: 401 });
  });
  it('les 8 opérations sensibles sont toutes protégées', async () => {
    const app = monter();
    expect(OPERATIONS_SENSIBLES).toHaveLength(8);
    for (const op of OPERATIONS_SENSIBLES) {
      expect((await appeler(app, `/sensible/${op}`, 'vieille')).statusCode).toBe(401);
      expect((await appeler(app, `/sensible/${op}`, 'quatre')).statusCode).toBe(200);
    }
  });
  it('recuperation-recente-bloque', async () => {
    const app = monter();
    const r = await appeler(app, '/sensible/changer_cle', 'recup');
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ code: 'recuperation_recente' });
    expect((await appeler(app, '/sensible/changer_cle', 'recupAncienne')).statusCode).toBe(200);
  });
  it('operation-ordinaire-non-touchee', async () => {
    const app = monter(async () => { throw new Error('console non lue'); });
    for (const essai of ['vieille', 'recup', 'quatre']) expect((await appeler(app, '/ordinaire', essai)).statusCode).toBe(200);
    expect(traces).toEqual([]);
  });
  it('refus par défaut : sans session, sans mfa, authTime futur ou console en panne', async () => {
    const app = monter();
    for (const essai of [undefined, 'sansMfa', 'futur']) expect((await appeler(app, '/sensible/exporter_dossier', essai)).statusCode).toBe(401);
    const panne = monter(async () => { throw new Error('panne'); });
    expect((await appeler(panne, '/sensible/exporter_dossier', 'quatre')).statusCode).toBe(401);
    const invalide = monter(async () => ({ ...CONSOLE, reauthMaxMs: Number.NaN }));
    expect((await appeler(invalide, '/sensible/exporter_dossier', 'quatre')).statusCode).toBe(401);
  });
  it('événement securite.reauth_refusee : opération et raison, aucune donnée de jeton', async () => {
    await appeler(monter(), '/sensible/ouvrir_interrupteur', 'six');
    expect(traces).toEqual([{
      evenement: 'securite.reauth_refusee', personneId: 'personne-1',
      donnees: { operation: 'ouvrir_interrupteur', raison: 'reauthentification_requise' },
    }]);
  });
  it('étiquette : aller-retour, inconnue refusée', () => {
    expect(operationDeEtiquette([etiquetteOperation('exporter_fec')])).toBe('exporter_fec');
    expect(operationDeEtiquette(['autre', 'operation:inconnue'])).toBeUndefined();
    expect(operationDeEtiquette(undefined)).toBeUndefined();
    expect(() => etiquetteOperation('inconnue' as never)).toThrow();
  });
});
