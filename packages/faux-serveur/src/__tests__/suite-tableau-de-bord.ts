import { describe, expect, it } from 'vitest';
import { BLOCS } from '../../../contrat/src/domaines/tableau-de-bord.js';
import type { Cible } from './suite-contrat.js';

type Bloc = { code: string; etat: string };
type Tableau = { body: { vue: string; blocs: Bloc[]; chiffres: { ca: { centimes: number; devise: string } }; anneau: { centre: { mot: string } } } };
const T = '/exercices/EX2026/tableau-de-bord';

/** Suite commune du tableau de bord : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteTableauDeBord(nom: string, cible: Cible): void {
  describe('suite tableau de bord commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('enveloppe : 8 blocs dans l’ordre, chiffres entiers en EUR', () =>
      avec(async (a) => {
        const r = await a('GET', T);
        expect(r.status).toBe(200);
        const { body } = r.json as Tableau;
        expect(body.vue).toBe('exercice');
        expect(body.blocs.map((b) => b.code)).toEqual([...BLOCS]);
        expect(body.chiffres.ca.devise).toBe('EUR');
        expect(Number.isInteger(body.chiffres.ca.centimes)).toBe(true);
        expect(body.blocs.find((b) => b.code === 'tresorerie')?.etat).toBe('ok');
      }));

    it('vues : mois, exercice et depuis_debut acceptées', () =>
      avec(async (a) => {
        for (const vue of ['mois', 'exercice', 'depuis_debut']) {
          const r = await a('GET', T + '?vue=' + vue);
          expect([vue, r.status]).toEqual([vue, 200]);
          expect((r.json as Tableau).body.vue).toBe(vue);
        }
      }));

    it('un bloc : même enveloppe que dans le tableau', () =>
      avec(async (a) => {
        const tout = (await a('GET', T)).json as Tableau;
        for (const code of BLOCS) {
          const r = await a('GET', T + '/' + code);
          expect([code, r.status]).toEqual([code, 200]);
          expect((r.json as { body: Bloc }).body).toEqual(tout.body.blocs.find((b) => b.code === code));
        }
      }));

    it('vue invalide : 400', () =>
      avec(async (a) => {
        for (const q of ['vue=semaine', 'vue=', 'vue=MOIS', 'profil=autre']) {
          const r = await a('GET', T + '?' + q);
          expect([q, r.status]).toEqual([q, 400]);
          expect(r.json).toMatchObject({ defined: false, code: 'BAD_REQUEST', status: 400 });
          expect([q, (await a('GET', T + '/resultat?' + q)).status]).toEqual([q, 400]);
        }
      }));

    it('champ inconnu : 400', () =>
      avec(async (a) => {
        for (const q of ['pourcentage=1', 'vue=mois&pourcentage=1', 'bloc=resultat']) {
          const r = await a('GET', T + '?' + q);
          expect([q, r.status]).toEqual([q, 400]);
        }
      }));

    it('404 : exercice inconnu (EXERCICE_INCONNU), bloc inconnu (BLOC_INCONNU)', () =>
      avec(async (a) => {
        for (const chemin of ['/exercices/EX1999/tableau-de-bord', '/exercices/EX1999/tableau-de-bord/resultat', '/exercices/EX1999/tableau-de-bord/nimporte']) {
          const r = await a('GET', chemin);
          expect([chemin, r.status]).toEqual([chemin, 404]);
          expect(r.json).toMatchObject({ defined: true, code: 'EXERCICE_INCONNU', status: 404 });
        }
        const r = await a('GET', T + '/nimporte');
        expect(r.status).toBe(404);
        expect(r.json).toMatchObject({ defined: true, code: 'BLOC_INCONNU', status: 404 });
      }));

    it('profil vide : blocs vides, anneau sans données', () =>
      avec(async (a) => {
        const r = await a('GET', T + '?profil=vide');
        expect(r.status).toBe(200);
        const { body } = r.json as Tableau;
        expect(body.blocs).toHaveLength(BLOCS.length);
        expect(body.blocs.find((b) => b.code === 'tresorerie')?.etat).not.toBe('ok');
        expect(body.anneau.centre.mot).toBe('donnees_absentes');
        expect(body.chiffres.ca.centimes).toBe(0);
      }));
  });
}
