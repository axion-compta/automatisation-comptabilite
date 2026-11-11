import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-' + n });
const [EMPREINTE, AUTRE] = ['ab12'.repeat(16), 'cd34'.repeat(16)];
type Fabrique = (scenario: string | null) => Cible;
type Etat = { statut: string; efface_prevu_le: string | null; accuse_le: string | null; gel: { actif: boolean; motif: string | null }; gel_console: boolean };

/** Suite commune de la fin de contrat (vrai serveur et faux) : `fabrique(scenario)` rend une cible dans ce scénario. */
export function suiteFinContrat(nom: string, fabrique: Fabrique): void {
  describe('suite de la fin de contrat commune : ' + nom, () => {
    type A = Awaited<ReturnType<Cible>>['appeler'];
    const avec = (scenario: string | null, f: (a: A) => Promise<void>) => async () => {
      const x = await fabrique(scenario)();
      try {
        await f(x.appeler);
      } finally {
        await x.fermer();
      }
    };
    const lire = async (a: A) => (await a('GET', '/fin-contrat', {})).json as Etat;
    const accuser = (a: A, n: string, empreinte = EMPREINTE) => a('POST', '/fin-contrat/accuse', cle(n), { manifeste_empreinte: empreinte });
    const gel = (a: A, n: string, motif = 'Litige fictif') => a('POST', '/fin-contrat/gel', cle(n), { motif });
    const levee = (a: A, n: string, motif = 'Fin du litige fictif') => a('POST', '/fin-contrat/gel/levee', cle(n), { motif });

    it('aucune-fin-par-defaut', avec(null, async (a) => {
      expect(await lire(a)).toMatchObject({ statut: 'aucune', efface_prevu_le: null, accuse_le: null, gel: { actif: false }, gel_console: false });
    }));
    it('preavis-avec-date-de-fin', avec('finContrat=preavis', async (a) => {
      expect(await lire(a)).toMatchObject({ statut: 'preavis', date_fin: '2026-07-15', efface_prevu_le: null });
    }));
    it('accuse-puis-effacement-prevu-trente-jours-plus-tard', avec('finContrat=remis', async (a) => {
      const avant = await lire(a);
      expect([avant.statut, avant.efface_prevu_le]).toEqual(['remis', null]);
      const r = await accuser(a, '0001');
      expect([r.status, r.json]).toMatchObject([200, { statut: 'accuse', efface_prevu_le: '2026-07-15' }]);
      expect(await lire(a)).toMatchObject({ statut: 'accuse', efface_prevu_le: '2026-07-15' });
    }));
    it('accuse-avant-remise-409', avec('finContrat=preavis', async (a) => {
      const r = await accuser(a, '0002');
      expect([r.status, r.json]).toMatchObject([409, { code: 'PAS_DE_REMISE' }]);
    }));
    it('accuse-double-409', avec('finContrat=remis', async (a) => {
      expect((await accuser(a, '0003')).status).toBe(200);
      const r = await accuser(a, '0004');
      expect([r.status, r.json]).toMatchObject([409, { code: 'DEJA_ACCUSE' }]);
    }));
    it('empreinte-differente-422', avec('finContrat=remis', async (a) => {
      const r = await accuser(a, '0005', AUTRE);
      expect([r.status, r.json]).toMatchObject([422, { code: 'EMPREINTE_DIFFERENTE' }]);
      expect((await lire(a)).statut).toBe('remis');
    }));
    it('gel-pose-puis-leve', avec('finContrat=accuse', async (a) => {
      const p = await gel(a, '0006');
      expect([p.status, p.json]).toMatchObject([200, { gel: { actif: true, motif: 'Litige fictif' } }]);
      const l = await levee(a, '0007');
      expect([l.status, l.json]).toMatchObject([200, { gel: { actif: false, motif: null }, gel_console: false }]);
    }));
    it('gel-double-409-et-levee-sans-gel-409', avec('finContrat=accuse', async (a) => {
      const sans = await levee(a, '0008');
      expect([sans.status, sans.json]).toMatchObject([409, { code: 'GEL_INACTIF' }]);
      expect((await gel(a, '0009')).status).toBe(200);
      const double = await gel(a, '0010');
      expect([double.status, double.json]).toMatchObject([409, { code: 'GEL_DEJA_ACTIF' }]);
    }));
    it('meme-cle-un-seul-evenement', avec('finContrat=remis', async (a) => {
      const un = await accuser(a, '0011');
      const deux = await accuser(a, '0011');
      expect([deux.status, deux.json]).toEqual([un.status, un.json]);
      const g1 = await gel(a, '0012');
      const g2 = await gel(a, '0012');
      expect([g2.status, g2.json]).toEqual([g1.status, g1.json]);
    }));
  });
}
