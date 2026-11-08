import { describe, expect, it } from 'vitest';
import type { Cible, Retour } from './suite-contrat.js';

type Notif = { id: string; creeLe: string; lueLe?: string } & Record<string, unknown>;
type Liste = { body: Notif[]; decalage: number; total: number };
const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-notif-' + n });
const liste = (r: Retour) => r.json as Liste;

/** Suite commune « notifications » (8 cas de L15-T45 sauf l'horloge) : jouée sur le vrai serveur et sur le faux. */
export function suiteNotifications(nom: string, cible: Cible): void {
  describe('suite notifications commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('liste-plus-recentes-d-abord', () =>
      avec(async (a) => {
        const l = liste(await a('GET', '/notifications'));
        expect(l.total).toBeGreaterThan(1);
        const dates = l.body.map((n) => n.creeLe);
        expect(dates).toEqual([...dates].sort().reverse());
        expect(l.body.some((n) => n.id === 'no-autre')).toBe(false);
      }));

    it('filtre-non-lues', () =>
      avec(async (a) => {
        const tout = liste(await a('GET', '/notifications'));
        const non = liste(await a('GET', '/notifications?nonLues=oui'));
        expect(non.body.every((n) => n.lueLe === undefined)).toBe(true);
        expect(non.total).toBe(tout.body.filter((n) => n.lueLe === undefined).length);
      }));

    it('marquer-lue', () =>
      avec(async (a) => {
        const cibleN = liste(await a('GET', '/notifications?nonLues=oui')).body[0];
        expect(cibleN).toBeDefined();
        const r = await a('POST', `/notifications/${cibleN?.id}/lue`, cle('1'));
        expect(r.status).toBe(200);
        expect((r.json as { body: Notif }).body.lueLe).toEqual(expect.any(String));
        expect(liste(await a('GET', '/notifications?nonLues=oui')).body.map((n) => n.id)).not.toContain(cibleN?.id);
      }));

    it('marquer-deux-fois-meme-lue-le', () =>
      avec(async (a) => {
        const id = liste(await a('GET', '/notifications?nonLues=oui')).body[0]?.id;
        const x = await a('POST', `/notifications/${id}/lue`, cle('a'));
        const y = await a('POST', `/notifications/${id}/lue`, cle('b'));
        expect(y.status).toBe(200);
        expect((y.json as { body: Notif }).body.lueLe).toBe((x.json as { body: Notif }).body.lueLe);
      }));

    it('tout-lire-compte-les-non-lues', () =>
      avec(async (a) => {
        const attendues = liste(await a('GET', '/notifications?nonLues=oui')).total;
        expect(attendues).toBeGreaterThan(0);
        expect((await a('POST', '/notifications/tout-lire', cle('t1'))).json).toEqual({ body: { marquees: attendues } });
        expect((await a('POST', '/notifications/tout-lire', cle('t2'))).json).toEqual({ body: { marquees: 0 } });
        expect(liste(await a('GET', '/notifications?nonLues=oui')).total).toBe(0);
      }));

    it('autre-personne-404-meme-corps', () =>
      avec(async (a) => {
        const autre = await a('POST', '/notifications/no-autre/lue', cle('x'));
        const inconnue = await a('POST', '/notifications/no-inconnue-xyz/lue', cle('y'));
        expect(autre.status).toBe(404);
        expect(autre.json).toEqual(inconnue.json);
        expect(autre.json).toMatchObject({ code: 'NOTIFICATION_INCONNUE' });
      }));

    it('aucun-montant-ni-tiers-dans-le-schema', () =>
      avec(async (a) => {
        const champs = ['categorie', 'creeLe', 'gravite', 'id', 'lien', 'lueLe', 'titreCode'];
        for (const n of liste(await a('GET', '/notifications')).body) {
          expect(Object.keys(n).every((k) => champs.includes(k))).toBe(true);
        }
      }));

    it('sans-idempotency-key-400', () =>
      avec(async (a) => {
        const id = liste(await a('GET', '/notifications')).body[0]?.id;
        expect((await a('POST', `/notifications/${id}/lue`)).status).toBe(400);
        expect((await a('POST', '/notifications/tout-lire')).status).toBe(400);
        expect(liste(await a('GET', '/notifications?nonLues=oui')).total).toBeGreaterThan(0);
      }));
  });
}
