import { afterEach, describe, expect, it } from 'vitest';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';
import { creerApp } from '../app.js';

const JETON = 'jeton-fictif-lemoine';
const SESSION = {
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-saisir'], revendications: {},
} as const;
const chemin = (societe: string, suffixe: string) => PREFIXE_ROUTES_SOCIETE.replace('{s}', societe) + suffixe;
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));
const monter = (avecJeton: boolean) => {
  const a = creerApp(undefined, avecJeton ? { securite: { jeton: { sessions: creerFauxSessions({ [JETON]: SESSION }) } } } : {});
  apps.push(a);
  return a;
};

const ECRITURE = { 'idempotency-key': 'cle-fictive-isolation-01', 'content-type': 'application/json' };
/** Les cinq routes du profil : méthode, suffixe, corps valide (pour que le refus vienne de la société, pas de la validation). */
const ROUTES: ReadonlyArray<readonly [string, string, object | undefined]> = [
  ['GET', '/profil', undefined],
  ['POST', '/profil/champs/forme', { valeur: 'SAS', origine: 'saisie_personne', effetDebut: '2026-01-01' }],
  ['POST', '/profil/champs/forme/confirmer', { effetDebut: '2026-02-01' }],
  ['POST', '/profil/changements/apercu', { cle: 'regime_tva', valeur: 'reel_normal', effetDebut: '2026-07-01', motif: 'Changement fictif' }],
  ['POST', '/profil/changements', { apercuId: 'apercu-000001' }],
];
const appeler = (a: ReturnType<typeof creerApp>, methode: string, url: string, corps: object | undefined, jeton: boolean) =>
  a.inject({
    method: methode as 'GET', url,
    headers: { ...(jeton ? { authorization: 'Bearer ' + JETON } : {}), ...(corps === undefined ? {} : ECRITURE) },
    ...(corps === undefined ? {} : { payload: corps }),
  });

describe('serveur : profil, isolation par société et session', () => {
  it('societe-d-autrui-404-meme-corps', async () => {
    const a = monter(true);
    const inconnue = await appeler(a, 'GET', '/route-inexistante', undefined, true);
    expect(inconnue.statusCode).toBe(404);
    expect(inconnue.json()).toEqual({ code: 'INTROUVABLE', status: 404 });
    for (const [methode, suffixe, corps] of ROUTES) {
      const r = await appeler(a, methode, chemin('soc-autre', suffixe), corps, true);
      expect([suffixe, r.statusCode, r.body]).toEqual([suffixe, inconnue.statusCode, inconnue.body]);
    }
    // témoin : la société de la session passe (le refus ci-dessus vient bien de la société du chemin)
    expect((await appeler(a, 'GET', chemin('soc-lemoine', '/profil'), undefined, true)).statusCode).toBe(200);
  });

  it('sans-session-401', async () => {
    // sans jeton branché : le handler exige la session ; avec jeton branché : refus avant la route
    for (const avecJeton of [false, true]) {
      const a = monter(avecJeton);
      for (const [methode, suffixe, corps] of ROUTES) {
        const r = await appeler(a, methode, chemin('soc-lemoine', suffixe), corps, false);
        expect([avecJeton, suffixe, r.statusCode]).toEqual([avecJeton, suffixe, 401]);
        expect(r.json()).toEqual({ defined: false, code: 'NON_AUTHENTIFIE', status: 401, message: 'NON_AUTHENTIFIE' });
      }
    }
  });

  it('chemin-profil-sans-prefixe-404', async () => {
    const a = monter(true);
    for (const [methode, suffixe, corps] of ROUTES) {
      const r = await appeler(a, methode, suffixe, corps, true);
      expect([suffixe, r.statusCode, r.json()]).toEqual([suffixe, 404, { code: 'INTROUVABLE', status: 404 }]);
    }
  });
});
