import { describe, expect, it } from 'vitest';
import { ReponseBareme, ReponseVehicules } from '../../../contrat/src/domaines/vehicules-bareme.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';
import type { Cible } from './suite-contrat.js';

const PREFIXE = PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine');
type Bareme = { body: { statut: string; effetDebut: string; effetFin: string | null; source: string } };

/** Suite commune « véhicules et barème au jour J » : jouée sur le vrai serveur et sur le faux. */
export function suiteVehiculesBareme(nom: string, cible: Cible): void {
  describe('suite véhicules et barème commune : ' + nom, () => {
    const lire = async (chemin: string) => {
      const c = await cible();
      try {
        return await c.appeler('GET', PREFIXE + chemin);
      } finally {
        await c.fermer();
      }
    };
    const bareme = async (date: string) => lire('/parametres/bareme_ik_voiture?date=' + date);

    it('vehicules-de-la-personne', async () => {
      const r = await lire('/vehicules?personne=PER-01');
      expect(r.status).toBe(200);
      const v = ReponseVehicules.parse(r.json).body;
      expect(v.map((x) => x.id)).toEqual(['VEH-01', 'VEH-02', 'VEH-03', 'VEH-04']);
      expect(v.every((x) => x.personneId === 'PER-01')).toBe(true);
    });

    it('immatriculation-absente', async () => {
      const r = await lire('/vehicules?personne=PER-01');
      expect(JSON.stringify(r.json)).not.toMatch(/immatriculation/i);
      expect(((r.json as { body: object[] }).body)[0]).toHaveProperty('carteGrise', true);
    });

    it('personne-sans-vehicule-et-query-invalide', async () => {
      expect((await lire('/vehicules?personne=PER-99')).json).toEqual({ body: [] });
      expect((await lire('/vehicules')).status).toBe(400);
      expect((await lire('/vehicules?personne=')).status).toBe(400);
    });

    it('bareme-valide-au-jour', async () => {
      const r = await bareme('2025-06-15');
      expect(r.status).toBe(200);
      ReponseBareme.parse(r.json);
      expect((r.json as Bareme).body).toMatchObject({ statut: 'valide', effetDebut: '2025-01-01', effetFin: '2026-01-01' });
    });

    it('bareme-a-verifier-statut-rendu', async () => {
      const r = await bareme('2026-03-01');
      expect(r.status).toBe(200);
      expect((r.json as Bareme).body.statut).toBe('a_verifier');
    });

    it('fin-exclue', async () => {
      expect(((await bareme('2025-12-31')).json as Bareme).body.effetDebut).toBe('2025-01-01');
      expect(((await bareme('2026-01-01')).json as Bareme).body.effetDebut).toBe('2026-01-01');
    });

    it('date-invalide-400', async () => {
      for (const q of ['2025-02-30', '', 'demain']) expect([q, (await bareme(q)).status]).toEqual([q, 400]);
      expect((await lire('/parametres/bareme_ik_voiture')).status).toBe(400);
    });

    it('bareme-absent-404', async () => {
      for (const d of ['2024-12-31', '2027-01-01']) {
        const r = await bareme(d);
        expect([d, r.status]).toEqual([d, 404]);
        expect(r.json).toMatchObject({ code: 'BAREME_ABSENT', status: 404, defined: true });
      }
    });
  });
}
