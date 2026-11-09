import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

type Res = { type: string; id: string; titre: string; extrait: string; lien: string; score: number };
type Rep = { body: { resultats: Res[]; curseurSuivant?: string; mot?: string } };

/** Suite commune de la recherche globale (POST, texte dans le corps) : jouée sur le vrai serveur et sur le faux. */
export function suiteRecherche(nom: string, cible: Cible): void {
  describe('suite recherche commune : ' + nom, () => {
    const avec = async (f: (c: (corps: unknown) => Promise<{ status: number; rep: Rep }>) => Promise<void>) => {
      const c = await cible();
      try {
        await f(async (corps) => {
          const r = await c.appeler('POST', '/recherche', undefined, corps);
          return { status: r.status, rep: r.json as Rep };
        });
      } finally {
        await c.fermer();
      }
    };

    it('bornes de q : 400 hors de 2 à 200 caractères, sans écho du texte', () =>
      avec(async (chercher) => {
        const long = 'x'.repeat(201);
        for (const q of ['a', '', ' é ', long]) {
          const r = await chercher({ q });
          expect(r.status).toBe(400);
          expect(JSON.stringify(r.rep)).not.toContain(long);
        }
        expect((await chercher({ q: 'ab' })).status).toBe(200);
        expect((await chercher({ q: 'a'.repeat(200) })).status).toBe(200);
        expect((await chercher({ q: '😀'.repeat(200) })).status).toBe(200);
        expect((await chercher({ q: '😀'.repeat(201) })).status).toBe(400);
      }));

    it('corps strict : champ inconnu, type, limite ou curseur invalides = 400', () =>
      avec(async (chercher) => {
        for (const corps of [{ q: 'facture', extra: 1 }, { q: 'facture', types: ['inconnu'] }, { q: 'facture', limite: 0 }, { q: 'facture', limite: 21 }, { q: 'facture', limite: 1.5 }, { q: 12 }, {}, { q: 'facture', curseur: 'zzz' }]) {
          expect((await chercher(corps)).status).toBe(400);
        }
      }));

    it('texte absent : 200, liste vide et mot rien_trouve', () =>
      avec(async (chercher) => {
        const r = await chercher({ q: 'zzzzqqq' });
        expect(r.status).toBe(200);
        expect(r.rep.body).toEqual({ resultats: [], mot: 'rien_trouve' });
      }));

    it('extrait échappé : le texte hostile reste du texte inerte', () =>
      avec(async (chercher) => {
        const r = await chercher({ q: '<script>alert(1)</script>', types: ['piece'] });
        expect(r.status).toBe(200);
        expect(r.rep.body.resultats.length).toBeGreaterThan(0);
        for (const x of r.rep.body.resultats) expect(x.extrait).not.toMatch(/<(?!\/?mark>)/);
      }));

    it('pièce sensible exclue', () =>
      avec(async (chercher) => {
        for (const q of ['Camille Fictif', 'bulletin']) {
          const r = await chercher({ q });
          expect(r.status).toBe(200);
          expect(r.rep.body.resultats.some((x) => x.type === 'piece' && x.id === 'pc-4')).toBe(false);
        }
      }));

    it('montant : écriture trouvée par son montant', () =>
      avec(async (chercher) => {
        const piece = (await chercher({ q: '1 234,50 €', types: ['piece'] })).rep.body.resultats;
        expect(piece.map((x) => x.id)).toContain('pc-1');
        expect(piece.every((x) => x.type === 'piece')).toBe(true);
      }));

    it('SIREN : tiers trouvé par son numéro, avec ou sans espaces', () =>
      avec(async (chercher) => {
        const a = await chercher({ q: '123456782', types: ['tiers'] });
        const b = await chercher({ q: '123 456 782', types: ['tiers'] });
        expect(a.rep.body.resultats.length).toBeGreaterThan(0);
        expect(a.rep.body.resultats.every((x) => x.type === 'tiers')).toBe(true);
        expect(b.rep.body.resultats.map((x) => x.id)).toEqual(a.rep.body.resultats.map((x) => x.id));
      }));

    it('curseur : pages successives sans doublon, curseur altéré = 400', () =>
      avec(async (chercher) => {
        const complet = (await chercher({ q: 'facture', limite: 20 })).rep.body.resultats.map((x) => x.id);
        expect(complet.length).toBeGreaterThan(2);
        const vus: string[] = [];
        let curseur: string | undefined;
        for (let i = 0; i < 3; i++) {
          const r = await chercher({ q: 'facture', limite: 2, ...(curseur === undefined ? {} : { curseur }) });
          expect(r.status).toBe(200);
          vus.push(...r.rep.body.resultats.map((x) => x.id));
          curseur = r.rep.body.curseurSuivant;
          expect(curseur).toBeDefined();
        }
        expect(vus).toEqual(complet.slice(0, 6));
        expect(new Set(vus).size).toBe(vus.length);
        expect((await chercher({ q: 'facture', curseur: 'curseur-altere' })).status).toBe(400);
      }));
  });
}
