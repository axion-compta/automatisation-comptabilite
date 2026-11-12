import { describe, expect, it } from 'vitest';
import { ReponseCapacites } from '../../../contrat/src/domaines/capacites.js';
import { JEU_SECURITE } from '../../../donnees-fictives/src/securite.js';
import { capacites } from '../../../noyau/src/securite/capacites.js';
import { securite } from '../../../textes/src/ecrans/securite.js';
import { contexteDePersonne } from '../domaines/capacites.js';
import type { Cible } from './suite-contrat.js';

const URL_CAPACITES = '/api/compta/v1/societes/soc-a/moi/capacites';
/** Une cible neuve pour la personne simulée : session par option (vrai serveur) ou en-tête x-scenario-role (faux). */
export type CibleCapacites = (role?: string) => ReturnType<Cible>;

/** Suite commune des capacités : jouée sur le vrai serveur et sur le faux (le défaut sans rôle ne vaut que pour le faux). */
export function suiteCapacites(nom: string, cible: CibleCapacites, faux: boolean): void {
  describe('suite des capacités commune : ' + nom, () => {
    const lire = async (role?: string) => {
      const c = await cible(role);
      try {
        return await c.appeler('GET', URL_CAPACITES);
      } finally {
        await c.fermer();
      }
    };
    const ids = JEU_SECURITE.personnes.map((p) => p.id);

    it('memes-capacites-vrai-et-faux-pour-les-six-personnes', async () => {
      expect(ids).toEqual(['adms-a', 'dir-a', 'lec-a', 'exp-a', 'inv-a', 'axion-1']);
      for (const id of ids) {
        const r = await lire(id);
        expect([id, r.status]).toEqual([id, 200]);
        const attendu = capacites(contexteDePersonne(id)!).map((c) =>
          c.permis ? { action: c.action, permis: true } : { action: c.action, permis: false, raison_code: c.raison, raison_texte: securite.raisons[c.raison!] },
        );
        expect([id, (r.json as { body: unknown }).body]).toEqual([id, attendu]);
      }
      const lecture = (await lire('lec-a')).json as { body: Array<{ permis: boolean }> };
      const adms = (await lire('adms-a')).json as { body: Array<{ permis: boolean }> };
      expect(lecture.body.filter((c) => !c.permis).length).toBeGreaterThan(adms.body.filter((c) => !c.permis).length);
    });

    it('lecture-raisons-non-vides', async () => {
      const corps = ReponseCapacites.parse((await lire('lec-a')).json).body;
      const refus = corps.filter((c) => !c.permis);
      expect(refus.length).toBeGreaterThan(0);
      for (const c of refus) {
        expect(c.raison_code).toBe('role_lecture');
        expect((c.raison_texte ?? '').trim().length).toBeGreaterThan(0);
      }
      for (const c of corps.filter((x) => x.permis)) expect(c).toEqual({ action: c.action, permis: true });
    });

    it('role-inconnu-401-meme-format', async () => {
      for (const role of ['inconnu', '', 'ADMS-A', 'x'.repeat(300)]) {
        const r = await lire(role);
        expect([role.slice(0, 9), r.status]).toEqual([role.slice(0, 9), 401]);
        expect(r.json).toMatchObject({ defined: true, code: 'NON_AUTHENTIFIE', status: 401 });
      }
    });

    it('sans-role-utilisateur-par-defaut-faux-seulement', async () => {
      const r = await lire(undefined);
      if (faux) {
        expect(r.status).toBe(200);
        expect(r.json).toEqual((await lire('dir-a')).json);
      } else {
        expect(r.status).toBe(401);
        expect(r.json).toMatchObject({ code: 'NON_AUTHENTIFIE' });
      }
    });

    it('reponse-valide-par-ReponseCapacites', async () => {
      for (const id of ids) {
        const corps = ReponseCapacites.parse((await lire(id)).json).body;
        expect(corps.length).toBeGreaterThan(0);
        expect(new Set(corps.map((c) => c.action)).size).toBe(corps.length);
        for (const c of corps) expect(c.permis ? c.raison_code === undefined && c.raison_texte === undefined : !!c.raison_code && !!c.raison_texte).toBe(true);
      }
    });
  });
}
