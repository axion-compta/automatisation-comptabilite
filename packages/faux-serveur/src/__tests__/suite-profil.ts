import { describe, expect, it } from 'vitest';
import { ProfilV1 } from '../../../contrat/src/domaines/profil.js';
import { ReponseRegimesImposition, ReponseRegimesTva } from '../../../contrat/src/domaines/regimes.js';
import type { Cible } from './suite-contrat.js';

const corps = (r: { json: unknown }) => (r.json as { body: Record<string, unknown> }).body;

/** Suite commune du profil : lectures seules, jouée sur le vrai serveur et sur le faux. */
export function suiteProfil(nom: string, cible: Cible): void {
  describe('suite du profil commune : ' + nom, () => {
    const avec = async (f: (a: Awaited<ReturnType<Cible>>['appeler']) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };

    it('profil-identique-des-deux-cotes', () =>
      avec(async (a) => {
        const r = await a('GET', '/profil?au=2026-08-01');
        expect(r.status).toBe(200);
        const p = ProfilV1.parse(corps(r));
        expect(p.champs.find((c) => c.cle === 'denomination')?.valeur).toBe('Lemoine Rénovation');
        expect([p.etat, p.aConfirmer, p.manquants, p.blocages]).toEqual(['a_confirmer', ['regime_tva'], [], []]);
        expect(p.champs.find((c) => c.cle === 'regime_tva')).toMatchObject({ origine: 'proposition_ia', statut: 'a_confirmer' });
        expect((await a('GET', '/profil')).status).toBe(200);
      }));

    it('lecture-a-une-date', () =>
      avec(async (a) => {
        const avant = ProfilV1.parse(corps(await a('GET', '/profil?au=2025-01-01')));
        const apres = ProfilV1.parse(corps(await a('GET', '/profil?au=2026-08-01')));
        expect(avant.champs.some((c) => c.cle === 'regime_tva')).toBe(false);
        expect(apres.champs.some((c) => c.cle === 'regime_tva')).toBe(true);
        expect(avant.champs.length).toBeLessThan(apres.champs.length);
        for (const mauvais of ['2026-02-30', '31%2F12%2F2026', '']) expect((await a('GET', '/profil?au=' + mauvais)).status).toBe(400);
      }));

    it('regimes-tries', () =>
      avec(async (a) => {
        for (const [chemin, schema] of [['/profil/regimes/tva', ReponseRegimesTva], ['/profil/regimes/imposition', ReponseRegimesImposition]] as const) {
          const r = await a('GET', chemin);
          expect(r.status).toBe(200);
          const lignes = schema.parse(r.json).body;
          expect(lignes.length).toBeGreaterThan(0);
          const dates = lignes.map((l) => l.effetDebut);
          expect(dates).toEqual([...dates].sort().reverse());
        }
      }));

    it('parametre-absent-404', () =>
      avec(async (a) => {
        const ok = await a('GET', '/parametres?cle=fictif.seuil_c&date=2026-05-01');
        expect(ok.status).toBe(200);
        expect(corps(ok)).toMatchObject({ cle: 'fictif.seuil_c', statut: 'valide', aVerifier: false });
        expect(corps(await a('GET', '/parametres?cle=fictif.seuil_a&date=2026-05-01'))).toMatchObject({ aVerifier: true });
        for (const q of ['cle=fictif.seuil_c&date=2025-12-31', 'cle=fictif.taux_d&date=2026-05-01', 'cle=fictif.inconnu&date=2026-05-01']) {
          const r = await a('GET', '/parametres?' + q);
          expect([q, r.status]).toEqual([q, 404]);
          expect(r.json).toMatchObject({ defined: true, code: 'PARAMETRE_ABSENT', status: 404 });
          expect(JSON.stringify(r.json)).not.toContain('valeur-inventee');
        }
        for (const q of ['cle=fictif.seuil_c', 'date=2026-05-01', 'cle=fictif.seuil_c&date=2026-02-30', 'cle=MAJ&date=2026-05-01']) expect((await a('GET', '/parametres?' + q)).status).toBe(400);
      }));

    it('siren-cle-fausse-422', () =>
      avec(async (a) => {
        const faux = await a('GET', '/siren/123456789');
        expect(faux.status).toBe(422);
        expect(faux.json).toMatchObject({ defined: true, code: 'SIREN_INVALIDE', status: 422 });
        expect(corps(await a('GET', '/siren/123456782'))).toMatchObject({ etat: 'trouve', denomination: 'Lemoine Rénovation' });
        expect(corps(await a('GET', '/siren/000000018'))).toMatchObject({ etat: 'introuvable' });
        for (const s of ['12345678', 'abcdefghi', '1234567890']) expect((await a('GET', '/siren/' + s)).status).toBe(400);
      }));

    it('vies-indisponible-non-verifie', () =>
      avec(async (a) => {
        expect(corps(await a('GET', '/tva-intracom/FR11123456782/verification'))).toEqual({ cle: 'juste', vies: 'verifie' });
        expect(corps(await a('GET', '/tva-intracom/FR14987654324/verification'))).toEqual({ cle: 'juste', vies: 'non_verifie' });
        expect(corps(await a('GET', '/tva-intracom/FR12123456782/verification'))).toEqual({ cle: 'fausse', vies: 'non_verifie' });
        expect((await a('GET', '/tva-intracom/FR1112345678/verification')).status).toBe(400);
      }));
  });
}
