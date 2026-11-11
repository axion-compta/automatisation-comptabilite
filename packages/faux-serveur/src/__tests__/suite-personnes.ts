import { describe, expect, it } from 'vitest';

export type ReponsePersonnes = { status: number; json: unknown };
export type CiblePersonnes = (avecReglage: boolean) => Promise<{
  appeler: (methode: 'GET' | 'POST', chemin: string, corps?: unknown, cle?: string) => Promise<ReponsePersonnes>;
  fermer: () => Promise<void>;
}>;

type Demande = { id: string; etat: string; echeance: string; issue: unknown };
const corpsDe = <T>(r: ReponsePersonnes): T => (r.json as { body: T }).body;
const codeDe = (r: ReponsePersonnes): unknown => (r.json as { code?: unknown }).code;
/** Suite commune « demandes des personnes » : jouée sur le serveur en mémoire et sur le faux serveur. */
export function suitePersonnes(nom: string, cible: CiblePersonnes): void {
  const avec = async <T>(avecReglage: boolean, f: (c: Awaited<ReturnType<CiblePersonnes>>) => Promise<T>): Promise<T> => {
    const c = await cible(avecReglage);
    try { return await f(c); } finally { await c.fermer(); }
  };
  describe('suite demandes des personnes : ' + nom, () => {
    it('lister-les-six-demandes', () =>
      avec(true, async (c) => {
        const r = await c.appeler('GET', '/personnes/demandes');
        expect(r.status).toBe(200);
        const l = corpsDe<Demande[]>(r);
        expect(l.map((d) => d.id)).toEqual(['dem_1', 'dem_3', 'dem_4', 'dem_2', 'dem_5', 'dem_6']);
        expect(l.map((d) => d.echeance)).toEqual([...l.map((d) => d.echeance)].sort());
      }));
    it('enregistrer-puis-lister', () =>
      avec(true, async (c) => {
        const poster = () => c.appeler('POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }, 'cle-enregistrer-1');
        const r = await poster();
        const d = corpsDe<Demande>(r);
        expect([r.status, d.etat, d.issue]).toEqual([201, 'recue', null]);
        expect(corpsDe<Demande>(await poster()).id).toBe(d.id);
        const l = corpsDe<Demande[]>(await c.appeler('GET', '/personnes/demandes'));
        expect([l.length, l.filter((x) => x.id === d.id).length]).toEqual([7, 1]);
      }));
    it('rechercher-par-nom', () =>
      avec(true, async (c) => {
        const r = await c.appeler('GET', '/personnes/recherche?nom=' + encodeURIComponent('Camille Exemple'));
        const t = corpsDe<{ source: string; id: string; par: string }[]>(r);
        expect(r.status).toBe(200);
        expect(t.filter((x) => x.source === 'pieces')).toHaveLength(12);
        expect(t.every((x) => x.par === 'nom')).toBe(true);
      }));
    it('recherche-vide-422', () =>
      avec(true, async (c) => {
        const rs = [await c.appeler('GET', '/personnes/recherche'), await c.appeler('GET', '/personnes/recherche?nom=ab')];
        expect(rs.map((r) => [r.status, codeDe(r)])).toEqual([[422, 'RECHERCHE_VIDE'], [422, 'RECHERCHE_TROP_COURTE']]);
      }));
    it('traiter-refus-sans-source-422', () =>
      avec(true, async (c) => {
        const cree = corpsDe<Demande>(await c.appeler('POST', '/personnes/demandes', { type: 'effacement', recue_le: '2026-11-09' }, 'cle-effacement-1'));
        const r = await c.appeler('POST', `/personnes/demandes/${cree.id}/traitement`, { issue: 'refus_conservation', motif: 'Motif fictif.' }, 'cle-refus-0001');
        expect([r.status, codeDe(r)]).toEqual([422, 'ISSUE_NON_PERMISE']);
        expect(corpsDe<Demande[]>(await c.appeler('GET', '/personnes/demandes')).find((d) => d.id === cree.id)?.etat).toBe('recue');
      }));
    it('traiter-deux-fois-409', () =>
      avec(true, async (c) => {
        const cree = corpsDe<Demande>(await c.appeler('POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }, 'cle-acces-0001'));
        const chemin = `/personnes/demandes/${cree.id}/traitement`;
        const un = await c.appeler('POST', chemin, { issue: 'renvoi_societe' }, 'cle-traiter-01');
        expect([un.status, corpsDe<Demande>(un).etat]).toEqual([200, 'transmise_a_la_societe']);
        const deux = await c.appeler('POST', chemin, { issue: 'renvoi_societe' }, 'cle-traiter-02');
        expect([deux.status, codeDe(deux)]).toEqual([409, 'DEJA_TRAITEE']);
      }));
    it('entrees-invalides-400', () =>
      avec(true, async (c) => {
        const reponses = [
          await c.appeler('POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }),
          await c.appeler('POST', '/personnes/demandes', { type: 'inconnu', recue_le: '2026-11-09' }, 'cle-invalide-1'),
          await c.appeler('POST', '/personnes/demandes/dem_1/traitement', {}, 'cle-invalide-2'),
          await c.appeler('GET', '/personnes/recherche?inconnu=1'),
        ];
        expect(reponses.map((r) => [r.status, codeDe(r)])).toEqual(Array(4).fill([400, 'BAD_REQUEST']));
        expect(corpsDe<Demande[]>(await c.appeler('GET', '/personnes/demandes'))).toHaveLength(6);
      }));
    it('sans-reglage-503', () =>
      avec(false, async (c) => {
        for (const [m, p, corps] of [
          ['GET', '/personnes/demandes', undefined],
          ['POST', '/personnes/demandes', { type: 'acces', recue_le: '2026-11-09' }],
          ['GET', '/personnes/recherche?nom=Camille', undefined],
        ] as const) {
          const r = await c.appeler(m, p, corps, 'cle-sans-reglage');
          expect([r.status, codeDe(r)], p).toEqual([503, 'REGLAGE_ABSENT']);
        }
      }));
  });
}
