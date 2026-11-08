import { describe, expect, it } from 'vitest';
import { genererJuridique } from '../../../donnees-fictives/src/juridique.js';
import { ReponseObligationsJuridiques } from '../../../contrat/src/domaines/juridique.js';
import type { Cible } from './suite-contrat.js';

const [sarl, sci] = genererJuridique().obligations;
if (!sarl || !sci) throw new Error('jeu fictif incomplet');

/** Suite commune des obligations juridiques : jouée sur le vrai serveur et sur le faux. `cibleSci` sert la SCI fictive. */
export function suiteJuridique(nom: string, cible: Cible, cibleSci: Cible): void {
  describe('suite juridique commune : ' + nom, () => {
    const lire = async (c: Cible, chemin: string, methode = 'GET') => {
      const x = await c();
      try {
        return await x.appeler(methode, chemin);
      } finally {
        await x.fermer();
      }
    };

    it('meme-reponse-pour-la-sarl', async () => {
      const r = await lire(cible, '/exercices/EX2026/juridique');
      expect(r.status).toBe(200);
      expect(r.json).toEqual({ body: sarl });
    });

    it('meme-reponse-pour-la-sci', async () => {
      const r = await lire(cibleSci, '/exercices/EX2026/juridique');
      expect(r.status).toBe(200);
      expect(r.json).toEqual({ body: sci });
    });

    it('meme-404-exercice-inconnu', async () => {
      for (const e of ['EX1999', 'ex2026', 'EX2026x']) {
        const r = await lire(cible, '/exercices/' + e + '/juridique');
        expect([e, r.status]).toEqual([e, 404]);
        expect(r.json).toMatchObject({ code: 'EXERCICE_INCONNU', status: 404 });
      }
      const mauvais = await lire(cible, '/exercices/' + 'E'.repeat(65) + '/juridique');
      expect(mauvais.status).toBe(400);
      expect((await lire(cible, '/exercices/%3Cscript%3E/juridique')).status).toBe(400);
      // Barre finale : même comportement des deux côtés, quel qu'il soit (voir contrat-commun).
      expect((await lire(cible, '/exercices/EX2026/juridique/')).status).toBe(200);
      for (const m of ['POST', 'PUT', 'DELETE']) {
        const r = await lire(cible, '/exercices/EX2026/juridique', m);
        expect([m, r.status]).toEqual([m, 404]);
        expect(r.json).toMatchObject({ code: 'INTROUVABLE', status: 404 });
      }
    });

    it('reponse-valide-par-le-schema', async () => {
      for (const c of [cible, cibleSci]) {
        const r = await lire(c, '/exercices/EX2026/juridique');
        expect(ReponseObligationsJuridiques.safeParse(r.json).success).toBe(true);
      }
    });

    it('mention-presente', async () => {
      for (const c of [cible, cibleSci]) {
        const r = await lire(c, '/exercices/EX2026/juridique');
        expect((r.json as { body: { mention: string } }).body.mention).toBe('prepare_par_ia');
      }
    });
  });
}
