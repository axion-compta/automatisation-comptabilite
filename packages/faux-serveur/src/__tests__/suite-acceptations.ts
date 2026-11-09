import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-' + n });
const SCENARIO = { 'x-scenario-abonnement': 'cgv=a_accepter' };
type Liste = { body: Array<{ type: string; version: number }> };

/** Suite commune des acceptations (vrai serveur et faux). `defaut` : cible sans scénario ; `cible` : scénario cgv=a_accepter (en-tête pour le faux, option pour le vrai). */
export function suiteAcceptations(nom: string, defaut: Cible, cible: Cible): void {
  describe('suite des acceptations commune : ' + nom, () => {
    type A = Awaited<ReturnType<Cible>>['appeler'];
    const avec = (c: Cible, f: (a: A) => Promise<void>) => async () => {
      const x = await c();
      try {
        await f(x.appeler);
      } finally {
        await x.fermer();
      }
    };
    const liste = async (a: A) => ((await a('GET', '/documents-contractuels/a-accepter', SCENARIO)).json as Liste).body;
    const poster = (a: A, n: string, corps: object) => a('POST', '/acceptations', { ...SCENARIO, ...cle(n) }, corps);

    it('rien-a-accepter-par-defaut', avec(defaut, async (a) => {
      expect((await a('GET', '/documents-contractuels/a-accepter')).json).toEqual({ body: [] });
    }));
    it('nouvelle-version-a-accepter', avec(cible, async (a) => {
      expect((await liste(a)).map((d) => [d.type, d.version])).toEqual([['cgv', 2]]);
    }));
    it('accepter-vide-la-liste', avec(cible, async (a) => {
      const r = await poster(a, '0001', { type: 'cgv', version: 2 });
      expect([r.status, r.json]).toMatchObject([201, { type: 'cgv', version: 2 }]);
      expect(await liste(a)).toEqual([]);
    }));
    it('version-perimee-409', avec(cible, async (a) => {
      const r = await poster(a, '0002', { type: 'cgv', version: 1 });
      expect([r.status, r.json]).toMatchObject([409, { code: 'VERSION_PERIMEE' }]);
    }));
    it('type-inconnu-404', avec(cible, async (a) => {
      const r = await poster(a, '0003', { type: 'type-fictif', version: 1 });
      expect([r.status, r.json]).toMatchObject([404, { code: 'DOCUMENT_ABSENT' }]);
    }));
    it('meme-cle-une-seule-acceptation', avec(cible, async (a) => {
      const un = await poster(a, '0004', { type: 'cgv', version: 2 });
      const deux = await poster(a, '0004', { type: 'cgv', version: 2 });
      expect([deux.status, deux.json]).toEqual([un.status, un.json]);
    }));
  });
}
