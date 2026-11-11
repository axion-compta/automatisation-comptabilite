import { describe, expect, it } from 'vitest';
import { ChampProfilV1, ProfilV1 } from '../../../contrat/src/domaines/profil.js';
import type { Appeler, Cible } from './suite-contrat.js';

const idem = (n: string) => ({ 'idempotency-key': 'cle-fictive-profil-' + n });
const AJOUT = { valeur: 'SAS', origine: 'saisie_personne', effetDebut: '2026-01-01' };
const CHANGEMENT = { cle: 'regime_tva', valeur: 'reel_normal', effetDebut: '2026-08-01', motif: 'Changement fictif de régime' };
const corps = (r: { json: unknown }) => (r.json as { body: Record<string, unknown> }).body;
const code = (r: { json: unknown }) => (r.json as { code: string }).code;

/** Suite commune des écritures du profil : jouée sur le vrai serveur et sur le faux. */
export function suiteProfilEcriture(nom: string, cible: Cible): void {
  describe('suite profil écriture commune : ' + nom, () => {
    const avec = async (f: (a: Appeler) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const forme = async (a: Appeler) => ProfilV1.parse(corps(await a('GET', '/profil?au=2026-06-01'))).champs.find((c) => c.cle === 'forme' && c.valeur === AJOUT.valeur);

    it('ajout-puis-lecture', () =>
      avec(async (a) => {
        expect(await forme(a)).toBeUndefined();
        const r = await a('POST', '/profil/champs/forme', idem('1'), AJOUT);
        expect(r.status).toBe(200);
        const c = ChampProfilV1.parse(corps(r));
        expect([c.statut, c.valeur, c.origine]).toEqual(['a_confirmer', 'SAS', 'saisie_personne']);
        expect(await forme(a)).toMatchObject({ valeur: 'SAS', statut: 'a_confirmer' });
        const mauvais = await a('POST', '/profil/champs/forme', idem('2'), { ...AJOUT, origine: 'proposition_ia' });
        expect(mauvais.status).toBe(400);
        expect((await a('POST', '/profil/champs/inconnue', idem('3'), AJOUT)).status).toBe(404);
      }));

    it('confirmation-puis-etat', () =>
      avec(async (a) => {
        await a('POST', '/profil/champs/forme', idem('1'), AJOUT);
        const r = await a('POST', '/profil/champs/forme/confirmer', idem('2'), { effetDebut: '2026-02-01' });
        expect(r.status).toBe(200);
        expect(ChampProfilV1.parse(corps(r))).toMatchObject({ statut: 'confirme', valeur: 'SAS', effetDebut: '2026-02-01' });
        expect(await forme(a)).toMatchObject({ statut: 'confirme' });
        const encore = await a('POST', '/profil/champs/forme/confirmer', idem('3'), { effetDebut: '2026-03-01' });
        expect([encore.status, code(encore)]).toEqual([409, 'RIEN_A_CONFIRMER']);
      }));

    it('idempotence-meme-reponse', () =>
      avec(async (a) => {
        const un = await a('POST', '/profil/champs/forme', idem('1'), AJOUT);
        const deux = await a('POST', '/profil/champs/forme', idem('1'), AJOUT);
        expect(deux).toEqual(un);
        expect(ProfilV1.parse(corps(await a('GET', '/profil?au=2026-06-01'))).champs.filter((c) => c.cle === 'forme' && c.valeur === AJOUT.valeur)).toHaveLength(1);
        const autre = await a('POST', '/profil/champs/forme', idem('1'), { ...AJOUT, valeur: 'SARL' });
        expect([autre.status, code(autre)]).toEqual([409, 'CLE_REUTILISEE']);
        const ap = await a('POST', '/profil/changements/apercu', idem('2'), CHANGEMENT);
        const id = { apercuId: corps(ap)['apercuId'] };
        const c1 = await a('POST', '/profil/changements', idem('3'), id);
        expect(c1.status).toBe(200);
        expect(await a('POST', '/profil/changements', idem('3'), id)).toEqual(c1);
      }));

    it('sans-en-tete-refuse', () =>
      avec(async (a) => {
        const routes: Array<[string, unknown]> = [
          ['/profil/champs/forme', AJOUT], ['/profil/champs/forme/confirmer', { effetDebut: '2026-02-01' }],
          ['/profil/changements/apercu', CHANGEMENT], ['/profil/changements', { apercuId: 'apercu-000001' }],
        ];
        for (const [chemin, c] of routes) {
          expect((await a('POST', chemin, {}, c)).status).toBe(400);
          expect((await a('POST', chemin, { 'idempotency-key': 'court' }, c)).status).toBe(400);
        }
        expect(await forme(a)).toBeUndefined();
      }));

    it('apercu-sans-effet', () =>
      avec(async (a) => {
        const avant = (await a('GET', '/profil?au=2026-09-01')).json;
        const r = await a('POST', '/profil/changements/apercu', idem('1'), CHANGEMENT);
        expect(r.status).toBe(200);
        expect(corps(r)).toMatchObject({ declarationsRecalculees: expect.any(Array), ecrituresValideesTouchees: 0 });
        expect((await a('GET', '/profil?au=2026-09-01')).json).toEqual(avant);
        const sans = await a('POST', '/profil/changements', idem('2'), { apercuId: 'apercu-999999' });
        expect([sans.status, code(sans)]).toEqual([404, 'APERCU_INCONNU']);
      }));

    it('effet-avant-periode-deposee-409', () =>
      avec(async (a) => {
        const r = await a('POST', '/profil/changements/apercu', idem('1'), { ...CHANGEMENT, effetDebut: '2026-02-01' });
        expect([r.status, code(r)]).toEqual([409, 'PERIODE_DEPOSEE']);
        expect((await a('POST', '/profil/changements/apercu', idem('2'), { ...CHANGEMENT, cle: 'inconnue' })).status).toBe(404);
      }));

    it('etat-reinitialise-entre-deux-tests', async () => {
      // Deux ordres : écrire puis lire sur une instance neuve, et lire d'abord sur une instance neuve puis écrire.
      await avec(async (a) => void (await a('POST', '/profil/champs/forme', idem('1'), AJOUT)));
      await avec(async (a) => expect(await forme(a)).toBeUndefined());
      await avec(async (a) => expect(await forme(a)).toBeUndefined());
      await avec(async (a) => void (await a('POST', '/profil/champs/forme', idem('1'), AJOUT)));
      await avec(async (a) => {
        expect(await forme(a)).toBeUndefined();
        expect((await a('POST', '/profil/champs/forme', idem('1'), AJOUT)).status).toBe(200);
      });
    });
  });
}
