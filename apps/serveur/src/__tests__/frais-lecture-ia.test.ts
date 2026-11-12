import { afterEach, describe, expect, it } from 'vitest';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';
import { creerApp } from '../app.js';

const JETON = 'jeton-fictif-lemoine';
const SESSION = {
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-saisir'], revendications: {},
} as const;
const chemin = (s: string) => PREFIXE_ROUTES_SOCIETE.replace('{s}', s) + '/frais/lecture-ticket';
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));
const appeler = (s: string, jeton: boolean) => {
  const a = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: SESSION }) } } });
  apps.push(a);
  return a.inject({ method: 'POST', url: chemin(s), headers: { 'content-type': 'application/json', ...(jeton ? { authorization: 'Bearer ' + JETON } : {}) }, payload: { pieceId: 'PIE-INCONNUE' } });
};

describe('serveur : lecture du ticket par l’IA', () => {
  it('sans-session-401-autre-societe-404-fournisseur-absent-brouillon-vide', async () => {
    expect((await appeler('soc-lemoine', false)).statusCode).toBe(401);
    expect((await appeler('soc-autre', true)).json()).toEqual({ code: 'INTROUVABLE', status: 404 });
    const r = await appeler('soc-lemoine', true);
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ statut: 'brouillon', fournisseurDisponible: false, mention: 'Préparé par IA, à valider' });
  });
});
