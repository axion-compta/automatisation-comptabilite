import { describe, expect, it } from 'vitest';
import { ACTIONS_GARDEES, ReponseBloquants } from '../../../contrat/src/domaines/bloquants.js';
import type { Cible } from './suite-contrat.js';

type Corps = { body: { autorise: boolean; bloquants: Array<{ regleId: string; objetId: string; messageCode: string }> } };

/** Suite commune « contrôles bloquants avant une action » : jouée sur le vrai serveur et sur le faux. */
export function suiteBloquants(nom: string, cible: Cible): void {
  describe('suite bloquants commune : ' + nom, () => {
    const lire = async (query: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', '/controles/bloquants' + query);
      } finally {
        await c.fermer();
      }
    };

    it('tva-bloquee', async () => {
      const r = await lire('?action=tva');
      expect(r.status).toBe(200);
      const { body } = r.json as Corps;
      expect(body.autorise).toBe(false);
      expect(body.bloquants.map((b) => b.regleId)).toEqual(['CC-T02', 'CC-T05']);
      expect(body.bloquants.map((b) => b.messageCode)).toEqual(['controle.CC-T02', 'controle.CC-T05']);
    });

    it('action-inconnue-400', async () => {
      const valeurs = ['', 'inconnue', 'TVA', 'tva%20', '__proto__', 'constructor', '0', 'NaN', 'Infinity', 'null'];
      for (const v of valeurs) expect([v, (await lire('?action=' + v)).status]).toEqual([v, 400]);
      for (const q of ['', '?', '?autre=tva', '?action=tva&autre=1']) expect([q, (await lire(q)).status]).toEqual([q, 400]);
    });

    it('reponse-valide-au-schema', async () => {
      for (const action of ACTIONS_GARDEES) {
        const r = await lire('?action=' + action);
        expect([action, r.status]).toEqual([action, 200]);
        expect(ReponseBloquants.safeParse((r.json as Corps).body).success).toBe(true);
        const { body } = r.json as Corps;
        expect(body.autorise).toBe(body.bloquants.length === 0);
      }
    });

    it('verdicts-propres-a-chaque-action', async () => {
      const regles = async (action: string) => ((await lire('?action=' + action)).json as Corps).body.bloquants.map((b) => b.regleId);
      expect(await regles('export')).toEqual(['CC-K01']);
      expect(await regles('cloture')).toEqual(['CC-K01']);
      expect(await regles('validation')).toEqual(['CC-K01', 'CC-T02']);
    });
  });
}
