import { afterEach, describe, expect, it } from 'vitest';
import { ReponseCapacites } from '../../../../packages/contrat/src/domaines/capacites.js';
import { capacites } from '../../../../packages/noyau/src/securite/capacites.js';
import type { ContexteAutorisation } from '../../../../packages/noyau/src/securite/autoriser.js';
import { ACTIONS, PERMISSIONS, RAISONS, type Role } from '../../../../packages/noyau/src/securite/types.js';
import { securite } from '../../../../packages/textes/src/ecrans/securite.js';
import { creerApp } from '../app.js';

const URL_CAPACITES = '/api/compta/v1/societes/soc-fictive/moi/capacites';
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const ctx = (role: Role, o: Partial<ContexteAutorisation> = {}): ContexteAutorisation => ({
  role, permissions: [...PERMISSIONS], demande5: true, separationTaches: false, personneId: 'p-fictive', ...o,
});
const lire = async (session?: ContexteAutorisation, headers: Record<string, string> = {}) => {
  const a = creerApp(undefined, { securite: session ? { session } : {} });
  apps.push(a);
  return a.inject({ method: 'GET', url: URL_CAPACITES, headers });
};

describe('serveur : capacités', () => {
  it('sans-session-401', async () => {
    const r = await lire();
    expect(r.statusCode).toBe(401);
    expect(r.json().code).toBe('NON_AUTHENTIFIE');
    for (const h of [{ 'x-role': '' }, { 'x-role': 'x'.repeat(5000) }, { authorization: 'Bearer x' }]) {
      expect((await lire(undefined, h)).statusCode).toBe(401);
    }
    expect((await lire({ ...ctx('lecture'), role: 'inconnu' as Role })).statusCode).toBe(401);
  });

  it('lecture-dix-refus-dix-phrases', async () => {
    const r = await lire(ctx('lecture', { permissions: ['compta-lire'] }));
    expect(r.statusCode).toBe(200);
    const corps = ReponseCapacites.parse(r.json()).body;
    const refus = corps.filter((c) => !c.permis);
    expect(refus.length).toBeGreaterThanOrEqual(10);
    for (const c of refus) {
      expect(c.raison_code).toBe('role_lecture');
      expect(c.raison_texte).toBe(securite.raisons['role_lecture']);
    }
    expect(corps.find((c) => c.action === 'lire')).toEqual({ action: 'lire', permis: true });
  });

  it('administrateur-tout-permis-ou-raison', async () => {
    const corps = ReponseCapacites.parse((await lire(ctx('administrateur'))).json()).body;
    for (const c of corps) {
      if (c.permis) expect(c.raison_code ?? c.raison_texte).toBeUndefined();
      else expect(c.raison_texte && c.raison_texte.length > 0).toBe(true);
    }
    const sans = ReponseCapacites.parse((await lire(ctx('administrateur', { permissions: [] }))).json()).body;
    expect(sans.every((c) => !c.permis && c.raison_code !== undefined && c.raison_texte !== undefined)).toBe(true);
  });

  it('chaque-raison-a-une-phrase', () => {
    for (const raison of RAISONS) {
      const phrase = securite.raisons[raison];
      expect(typeof phrase === 'string' && phrase.trim().length > 0).toBe(true);
    }
  });

  it('aucun-en-tete-ne-change-le-role', async () => {
    const base = (await lire(ctx('lecture'))).json();
    for (const h of [{ 'x-role': 'administrateur' }, { 'x-role': '' }, { 'x-role': 'administrateur, lecture' }, { 'x-societe': 'autre' }]) {
      expect((await lire(ctx('lecture'), h)).json()).toEqual(base);
    }
  });

  it('ordre-des-actions-stable', async () => {
    for (const role of ['lecture', 'utilisateur', 'administrateur'] as const) {
      const session = ctx(role);
      const a = ReponseCapacites.parse((await lire(session)).json()).body.map((c) => c.action);
      const b = ReponseCapacites.parse((await lire(session)).json()).body.map((c) => c.action);
      expect(a).toEqual([...ACTIONS]);
      expect(b).toEqual(a);
      expect(a).toEqual(capacites(session).map((c) => c.action));
    }
  });
});
