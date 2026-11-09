import { describe, expect, it } from 'vitest';
import { AlerteSchema, ETATS_ALERTE, GRAVITES_ALERTE, ReponseAlertes, ReponseCompteurs } from '../../../contrat/src/domaines/alertes.js';
import { ETATS_ALERTE_ACTIFS } from '../../../noyau/src/interface/types.js';
import type { Cible } from './suite-contrat.js';

const AL = '/exercices/EX2026/alertes';
const RANG = Object.fromEntries(GRAVITES_ALERTE.map((g, i) => [g, i])) as Record<string, number>;
type Alerte = { id: string; regle: string; gravite: string; etat: string; entreeMenu: string; ouverteLe: string };
type Liste = { body: Alerte[]; decalage: number; total: number };

/** Suite commune « alertes (liste) et compteurs » : jouée sur le vrai serveur et sur le faux. */
export function suiteAlertes(nom: string, cible: Cible): void {
  describe('suite alertes commune : ' + nom, () => {
    const lire = async (chemin: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', chemin);
      } finally {
        await c.fermer();
      }
    };
    const liste = async (q = ''): Promise<Liste> => {
      const r = await lire(AL + q);
      expect(r.status).toBe(200);
      return ReponseAlertes.parse(r.json) as Liste;
    };

    it('tri-ouvertes-puis-gravite-puis-recentes', async () => {
      const { body, total } = await liste();
      expect(body).toHaveLength(total);
      expect(body.every((a) => AlerteSchema.safeParse(a).success)).toBe(true);
      for (let i = 1; i < body.length; i++) {
        const [a, b] = [body[i - 1] as Alerte, body[i] as Alerte];
        const cle = (x: Alerte) => [x.etat === 'ouverte' ? 0 : 1, -(RANG[x.gravite] as number)];
        const [ca, cb] = [cle(a), cle(b)];
        const cmp = ca[0] !== cb[0] ? (ca[0] as number) - (cb[0] as number) : ca[1] !== cb[1] ? (ca[1] as number) - (cb[1] as number) : a.ouverteLe < b.ouverteLe ? 1 : a.ouverteLe > b.ouverteLe ? -1 : 0;
        expect([a.id, b.id, cmp <= 0]).toEqual([a.id, b.id, true]);
      }
    });

    it('filtres-etat-entree-pagination', async () => {
      const tout = await liste();
      for (const etat of ETATS_ALERTE) {
        const r = await liste('?etat=' + etat);
        expect(r.body.every((a) => a.etat === etat)).toBe(true);
        expect(r.total).toBe(tout.body.filter((a) => a.etat === etat).length);
      }
      const entree = (tout.body[0] as Alerte).entreeMenu;
      const parEntree = await liste('?entree=' + entree);
      expect(parEntree.body.length).toBeGreaterThan(0);
      expect(parEntree.body.every((a) => a.entreeMenu === entree)).toBe(true);
      expect((await liste('?entree=nexiste-pas')).body).toEqual([]);
      const page = await liste('?limite=2&decalage=1');
      expect(page.body.map((a) => a.id)).toEqual(tout.body.slice(1, 3).map((a) => a.id));
      expect([page.decalage, page.total]).toEqual([1, tout.total]);
      expect((await liste('?decalage=999')).body).toEqual([]);
    });

    it('query-invalide-400', async () => {
      for (const q of ['?etat=inconnu', '?limite=0', '?limite=101', '?limite=1.5', '?limite=NaN', '?limite=Infinity', '?decalage=-1', '?decalage=x', '?x=1', '?etat=ouverte&etat=resolue']) {
        const r = await lire(AL + q);
        expect([q, r.status]).toEqual([q, 400]);
      }
    });

    it('exercice-inconnu-404', async () => {
      for (const chemin of ['/exercices/EX1999/alertes', '/exercices/EX1999/compteurs']) {
        const r = await lire(chemin);
        expect([chemin, r.status]).toEqual([chemin, 404]);
        expect(r.json).toMatchObject({ code: 'EXERCICE_INCONNU', status: 404, defined: true });
      }
    });

    it('compteurs-et-alertes-du-jour', async () => {
      const tout = await liste();
      const r = await lire('/exercices/EX2026/compteurs');
      expect(r.status).toBe(200);
      const { parEntree, alertesDuJour } = ReponseCompteurs.parse(r.json).body;
      const ouvertes = tout.body.filter((a) => (ETATS_ALERTE_ACTIFS as readonly string[]).includes(a.etat));
      expect(Object.values(parEntree).reduce((s, c) => s + c.ouvertes, 0)).toBe(ouvertes.length);
      for (const [entree, c] of Object.entries(parEntree)) {
        expect(c.ouvertes).toBe(ouvertes.filter((a) => a.entreeMenu === entree).length);
        expect(c.pointExclamation).toBe(c.urgentes > 0);
      }
      expect(alertesDuJour.cartes.length).toBeLessThanOrEqual(3);
      expect(alertesDuJour.urgentesTotal).toBeGreaterThanOrEqual(alertesDuJour.cartes.length > 0 ? 1 : 0);
      const ids = new Set(tout.body.map((a) => a.id));
      expect(alertesDuJour.cartes.every((a) => ids.has(a.id))).toBe(true);
    });
  });
}
