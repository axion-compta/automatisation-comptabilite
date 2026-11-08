import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Appel = Awaited<ReturnType<Cible>>['appeler'];
type Fec = { id: string; version: number; statut: string; telechargementAutorise: boolean; mention: string };
type Trace = { resultat: string; gravite: string; horodatage: string };

/** Suite commune « FEC et contrôles tracés » : jouée sur le vrai serveur et sur le faux. */
export function suiteFec(nom: string, cible: Cible): void {
  describe('suite FEC commune : ' + nom, () => {
    const avec = async (f: (a: Appel) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const code = (r: { json: unknown }) => (r.json as { code: string }).code;
    const traces = async (a: Appel, q = '') => (await a('GET', '/exercices/EX2026/controles' + q)).json as { body: Trace[]; decalage: number; total: number };

    it('historique : trié par version, version remplacée visible', () =>
      avec(async (a) => {
        const r = await a('GET', '/exercices/EX2025/fec/historique');
        const b = (r.json as { body: Fec[] }).body;
        expect(r.status).toBe(200);
        expect(b.map((f) => [f.version, f.statut])).toEqual([[2, 'definitif'], [1, 'remplace']]);
        expect(b.every((f) => f.mention === 'prepare_par_ia')).toBe(true);
      }));

    it('historique : exercice inconnu 404, identifiant vide ou encodé', () =>
      avec(async (a) => {
        const inconnu = await a('GET', '/exercices/EX0000/fec/historique');
        expect([inconnu.status, code(inconnu)]).toEqual([404, 'EXERCICE_INCONNU']);
        expect((await a('GET', '/exercices//fec/historique')).status).toBe(400);
        expect((await a('GET', '/exercices/' + encodeURIComponent('EX 1/é') + '/fec/historique')).status).toBe(404);
      }));

    it('FEC de travail : non téléchargeable ; définitif : téléchargeable', () =>
      avec(async (a) => {
        const travail = ((await a('GET', '/fec/FEC001')).json as { body: Fec }).body;
        expect([travail.statut, travail.telechargementAutorise]).toEqual(['travail', false]);
        const remplace = ((await a('GET', '/fec/FEC002')).json as { body: Fec }).body;
        expect([remplace.statut, remplace.telechargementAutorise]).toEqual(['remplace', false]);
        const definitif = ((await a('GET', '/fec/FEC003')).json as { body: Fec }).body;
        expect([definitif.statut, definitif.telechargementAutorise]).toEqual(['definitif', true]);
      }));

    it('FEC inconnu : 404, y compris identifiant encodé ou vide', () =>
      avec(async (a) => {
        for (const id of ['FEC999', encodeURIComponent('a/b?c#d')]) {
          const r = await a('GET', '/fec/' + id);
          expect([id, r.status, code(r)]).toEqual([id, 404, 'FEC_INCONNU']);
        }
        expect([400, 404]).toContain((await a('GET', '/fec/')).status);
      }));

    it('traces : non OK d’abord, filtre resultat', () =>
      avec(async (a) => {
        const j = await traces(a);
        expect(j.total).toBe(j.body.length);
        const rangOk = j.body.map((t) => Number(t.resultat === 'OK'));
        expect(rangOk).toEqual([...rangOk].sort());
        expect(j.body[0]?.resultat).not.toBe('OK');
        const oks = await traces(a, '?resultat=OK');
        expect(oks.body.length).toBeGreaterThan(0);
        expect(oks.body.every((t) => t.resultat === 'OK')).toBe(true);
        const alertes = await traces(a, '?resultat=ALERTE');
        expect(alertes.body.every((t) => t.resultat === 'ALERTE')).toBe(true);
        expect(oks.total + alertes.total).toBe(j.total);
        expect((await traces(a, '?resultat=IMPOSSIBLE')).body).toEqual([]);
      }));

    it('traces : pagination, resultat invalide 400, limite 0 refusée', () =>
      avec(async (a) => {
        const page = await traces(a, '?limite=1&decalage=1');
        expect(page).toMatchObject({ decalage: 1 });
        expect(page.body).toHaveLength(1);
        expect(page.body[0]).toEqual((await traces(a)).body[1]);
        expect((await traces(a, '?decalage=50')).body).toEqual([]);
        for (const q of ['?resultat=ok', '?resultat=', '?resultat=BLEU', '?limite=0', '?limite=101', '?limite=1.5', '?limite=NaN', '?limite=Infinity', '?decalage=-1']) {
          const r = await a('GET', '/exercices/EX2026/controles' + q);
          expect([q, r.status]).toEqual([q, 400]);
        }
        const inconnu = await a('GET', '/exercices/EX0000/controles');
        expect([inconnu.status, code(inconnu)]).toEqual([404, 'EXERCICE_INCONNU']);
        expect((await a('GET', '/exercices//controles')).status).toBe(400);
      }));
  });
}
