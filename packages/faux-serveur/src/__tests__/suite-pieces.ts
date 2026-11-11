import { describe, expect, it } from 'vitest';

export type RetourPieces = { status: number; json: unknown };
/** Une cible de lecture : le serveur en mémoire ou le faux serveur. */
export type CiblePieces = () => Promise<{ lire: (chemin: string) => Promise<RetourPieces>; fermer: () => Promise<void> }>;

type Piece = { id: string; typePiece: string; etat: string; sensible: boolean; fournisseur?: string; ttcCentimes?: number; champs?: unknown[] };
type Liste = { body: Piece[]; decalage: number; total: number };

/** Suite commune des pièces en lecture : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suitePieces(nom: string, cible: CiblePieces): void {
  describe('suite commune des pièces : ' + nom, () => {
    const avec = (f: (lire: (chemin: string) => Promise<RetourPieces>) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c.lire);
      } finally {
        await c.fermer();
      }
    };
    const liste = async (lire: (c: string) => Promise<RetourPieces>, requete = '') => {
      const r = await lire('/pieces' + requete);
      expect(r.status).toBe(200);
      return r.json as Liste;
    };

    it('enveloppe-body-decalage-total', avec(async (lire) => {
      const l = await liste(lire, '?limite=3&decalage=1');
      expect(l.body).toHaveLength(3);
      expect([l.decalage, l.total > 3]).toEqual([1, true]);
    }));
    it('tri-reception-decroissante-puis-id', avec(async (lire) => {
      const ids = (await liste(lire)).body.map((p) => p.id);
      expect(ids.length).toBeGreaterThan(1);
      expect(new Set(ids).size).toBe(ids.length);
      const pages = [...(await liste(lire, '?limite=2')).body, ...(await liste(lire, '?limite=2&decalage=2')).body].map((p) => p.id);
      expect(pages).toEqual(ids.slice(0, 4));
    }));
    it('filtres-etat-type-fournisseur-montant', avec(async (lire) => {
      const tous = (await liste(lire)).body;
      const etat = tous[0]?.etat ?? '';
      const parEtat = await liste(lire, '?etat=' + etat);
      expect(parEtat.body.length).toBeGreaterThan(0);
      expect(parEtat.body.every((p) => p.etat === etat)).toBe(true);
      const type = tous[0]?.typePiece ?? '';
      expect((await liste(lire, '?type=' + type)).body.every((p) => p.typePiece === type)).toBe(true);
      const f = tous.find((p) => p.fournisseur !== undefined)?.fournisseur ?? '';
      const parF = await liste(lire, '?fournisseur=' + encodeURIComponent(f));
      expect(parF.body.length).toBeGreaterThan(0);
      expect(parF.body.every((p) => p.fournisseur === f)).toBe(true);
      const dansBorne = await liste(lire, '?montantMin=1&montantMax=100000000');
      expect(dansBorne.body.every((p) => (p.ttcCentimes ?? 0) >= 1)).toBe(true);
      expect((await liste(lire, '?montantMin=100000000')).body).toHaveLength(0);
    }));
    it('detail-200', avec(async (lire) => {
      const id = (await liste(lire)).body[0]?.id ?? '';
      const r = await lire('/pieces/' + id);
      expect(r.status).toBe(200);
      expect((r.json as { body: Piece }).body.id).toBe(id);
    }));
    it('piece-sensible-masquee', avec(async (lire) => {
      const sensible = (await liste(lire, '?limite=100')).body.find((p) => p.sensible);
      expect(sensible).toBeDefined();
      const d = (await lire('/pieces/' + (sensible?.id ?? ''))).json as { body: Piece };
      expect([d.body.fournisseur, d.body.champs]).toEqual([undefined, []]);
    }));
    it('query-invalide-400', avec(async (lire) => {
      for (const q of ['?limite=0', '?limite=101', '?decalage=-1', '?du=2026-13-01', '?du=2026-02-01&au=2026-01-01', '?montantMin=5&montantMax=1']) {
        expect((await lire('/pieces' + q)).status, q).toBe(400);
      }
    }));
    it('piece-inconnue-404', avec(async (lire) => {
      const r = await lire('/pieces/PIECE-INCONNUE-999');
      expect([r.status, (r.json as { code: string }).code]).toEqual([404, 'PIECE_INCONNUE']);
    }));
  });
}
