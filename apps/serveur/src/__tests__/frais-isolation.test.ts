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

const ECRITURE = { 'idempotency-key': 'valeur-factice-de-test', 'x-personne': 'PER-01' };
const DEPENSE = { nature: 'depense', personneId: 'PER-01', date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 };
/** Les huit routes des quatre domaines : méthode, suffixe, en-têtes et corps valides (le refus doit venir de la société, pas de la validation). */
const ROUTES: ReadonlyArray<readonly [string, string, boolean, object | undefined]> = [
  ['GET', '/frais', false, undefined],
  ['GET', '/frais/FRA-003', false, undefined],
  ['POST', '/frais', true, DEPENSE],
  ['PATCH', '/frais/FRA-003', true, { declaration: 'personne' }],
  ['POST', '/frais/FRA-005/proposer', true, undefined],
  ['POST', '/frais/valider', true, { ids: ['FRA-005'] }],
  ['POST', '/remboursements', true, { personneId: 'PER-01', fraisIds: ['FRA-003'] }],
  ['GET', '/vehicules?personne=PER-01', false, undefined],
  ['GET', '/parametres/bareme_ik_voiture?date=2025-06-15', false, undefined],
];
const appeler = (a: ReturnType<typeof creerApp>, methode: string, url: string, ecriture: boolean, corps: object | undefined, jeton: boolean) =>
  a.inject({
    method: methode as 'GET', url,
    headers: { ...(jeton ? { authorization: 'Bearer ' + JETON } : {}), ...(ecriture ? { ...ECRITURE, ...(methode === 'PATCH' ? { 'if-match': '1' } : {}) } : {}), ...(corps === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(corps === undefined ? {} : { payload: corps }),
  });

describe('serveur : frais, véhicules, barème, isolation par société et session', () => {
  it('autre-societe-404', async () => {
    const a = monter(true);
    const inconnue = await appeler(a, 'GET', '/route-inexistante', false, undefined, true);
    expect(inconnue.json()).toEqual({ code: 'INTROUVABLE', status: 404 });
    for (const [methode, suffixe, ecriture, corps] of ROUTES) {
      const r = await appeler(a, methode, chemin('soc-autre', suffixe), ecriture, corps, true);
      expect([suffixe, r.statusCode, r.body]).toEqual([suffixe, inconnue.statusCode, inconnue.body]);
    }
    // témoin : la société de la session passe (le refus ci-dessus vient bien de la société du chemin : ni 401, ni corps de route inconnue)
    for (const [methode, suffixe, ecriture, corps] of ROUTES) {
      const r = await appeler(a, methode, chemin('soc-lemoine', suffixe), ecriture, corps, true);
      expect([methode, suffixe, r.statusCode !== 401 && r.body !== inconnue.body]).toEqual([methode, suffixe, true]);
    }
  });

  it('sans-session-401', async () => {
    // sans jeton branché : le handler exige la session ; avec jeton branché : refus avant la route
    for (const avecJeton of [false, true]) {
      const a = monter(avecJeton);
      for (const [methode, suffixe, ecriture, corps] of ROUTES) {
        const r = await appeler(a, methode, chemin('soc-lemoine', suffixe), ecriture, corps, false);
        expect([avecJeton, suffixe, r.statusCode]).toEqual([avecJeton, suffixe, 401]);
        expect(r.json()).toEqual({ defined: false, code: 'NON_AUTHENTIFIE', status: 401, message: 'NON_AUTHENTIFIE' });
      }
    }
  });

  it('chemin-frais-sans-prefixe-404', async () => {
    const a = monter(true);
    for (const [methode, suffixe, ecriture, corps] of ROUTES) {
      const r = await appeler(a, methode, suffixe, ecriture, corps, true);
      expect([suffixe, r.statusCode, r.json()]).toEqual([suffixe, 404, { code: 'INTROUVABLE', status: 404 }]);
    }
  });
});
