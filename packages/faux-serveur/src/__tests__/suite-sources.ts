import { describe, expect, it } from 'vitest';
import { ReponseEtatSources } from '../../../contrat/src/domaines/sources.js';
import { genererSources } from '../../../donnees-fictives/src/sources.js';
import type { Cible } from './suite-contrat.js';

type Corps = { body: { veille: { etat: string; dernierBalayage: string; depotAutomatiqueAutorise: boolean }; connecteurs: Array<{ connecteur: string; etat: string; dernierOk: string | null }> } };

/** Suite commune « état de la veille et des connecteurs » : jouée sur le vrai serveur et sur le faux. */
export function suiteSources(nom: string, cible: Cible): void {
  describe('suite sources commune : ' + nom, () => {
    const appel = async (methode: string, chemin = '/sources/etat') => {
      const c = await cible();
      try {
        return await c.appeler(methode, chemin);
      } finally {
        await c.fermer();
      }
    };
    const lire = async (chemin?: string) => (await appel('GET', chemin)).json as Corps;
    const attendu = genererSources();

    it('meme-etat-de-veille', async () => {
      const { body } = await lire();
      expect(body.veille).toEqual(attendu.veille);
      expect(body.veille.etat === 'alerte' && body.veille.depotAutomatiqueAutorise).toBe(false);
      expect((await lire('/sources/etat?x=1')).body.veille).toEqual(body.veille);
    });

    it('memes-connecteurs', async () => {
      const { body } = await lire();
      const noms = body.connecteurs.map((c) => c.connecteur);
      expect(noms).toEqual([...noms].sort());
      expect(noms).toEqual(attendu.connecteurs.map((c) => c.connecteur).sort());
      expect(body.connecteurs).toEqual([...attendu.connecteurs].sort((a, b) => (a.connecteur < b.connecteur ? -1 : 1)));
      expect(await lire('/sources/etat?x=1&x=2')).toEqual({ body });
    });

    it('reponse-valide-par-le-schema', async () => {
      const r = await appel('GET');
      expect(r.status).toBe(200);
      expect(ReponseEtatSources.safeParse(r.json).success).toBe(true);
      const { body } = r.json as Corps;
      expect(ReponseEtatSources.safeParse({ body: { ...body, connecteurs: [{ connecteur: '', etat: 'ok', dernierOk: null }] } }).success).toBe(false);
      expect(ReponseEtatSources.safeParse({ body: { ...body, veille: { ...body.veille, etat: 'alerte', depotAutomatiqueAutorise: true } } }).success).toBe(false);
    });

    it('post-refuse-des-deux-cotes', async () => {
      const r = await appel('POST');
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
      expect((await lire()).body.veille).toEqual(attendu.veille);
    });
  });
}
