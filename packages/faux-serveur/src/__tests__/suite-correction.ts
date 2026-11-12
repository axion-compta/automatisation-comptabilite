import { describe, expect, it } from 'vitest';

export type RetourCorrection = { status: number; json: unknown };
/** Une cible de la correction : le serveur en mémoire ou le faux serveur. `cle` absente = pas d'en-tête idempotency-key. */
export type CibleCorrection = () => Promise<{
  corriger: (id: string, nom: string, corps: unknown, cle: string | undefined) => Promise<RetourCorrection>;
  fermer: () => Promise<void>;
}>;

type Cible = Awaited<ReturnType<CibleCorrection>>;
const CORPS = { valeur: '250,50', pourquoi: 'erreur de lecture' };
const corpsDe = (r: RetourCorrection) => (r.json as { body: { ttcCentimes?: number; nomNormalise: string } }).body;
const codeDe = (r: RetourCorrection) => (r.json as { code?: string }).code;

/** Suite commune de la correction : écrite une fois, jouée sur le vrai serveur et sur le faux. Chaque test a sa propre cible (état neuf). */
export function suiteCorrection(nom: string, cible: CibleCorrection): void {
  describe('suite commune de la correction : ' + nom, () => {
    const avec = (f: (c: Cible) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c);
      } finally {
        await c.fermer();
      }
    };

    it('correction-reussie-recalcule-le-nom', avec(async (c) => {
      const r = await c.corriger('piece-001', 'ttc', CORPS, 'cle-fictive-001');
      expect(r.status).toBe(200);
      expect(corpsDe(r).ttcCentimes).toBe(25050);
      expect(corpsDe(r).nomNormalise).toContain('250.50');
    }));

    it('champ-inconnu-et-piece-inconnue-404', avec(async (c) => {
      const champ = await c.corriger('piece-001', 'zzz', CORPS, 'cle-fictive-002');
      expect([champ.status, codeDe(champ)]).toEqual([404, 'CHAMP_INCONNU']);
      const piece = await c.corriger('inconnue-xyz', 'ttc', CORPS, 'cle-fictive-003');
      expect([piece.status, codeDe(piece)]).toEqual([404, 'PIECE_INCONNUE']);
    }));

    it.each(['abc', 'NaN', 'Infinity'])('valeur-illisible-400 %j', (valeur) => avec(async (c) => {
      const r = await c.corriger('piece-001', 'ttc', { ...CORPS, valeur }, 'cle-fictive-004');
      expect(r.status).toBe(400);
    })());

    it('valeur-vide-ou-corps-incomplet-400', avec(async (c) => {
      expect((await c.corriger('piece-001', 'ttc', { ...CORPS, valeur: '' }, 'cle-fictive-005')).status).toBe(400);
      expect((await c.corriger('piece-001', 'ttc', { valeur: '1,00' }, 'cle-fictive-006')).status).toBe(400);
    }));

    it('piece-sensible-409', avec(async (c) => {
      const r = await c.corriger('piece-010', 'ttc', CORPS, 'cle-fictive-007');
      expect([r.status, codeDe(r)]).toEqual([409, 'PIECE_SENSIBLE']);
    }));

    it('sans-en-tete-idempotency-key-400', avec(async (c) => {
      expect((await c.corriger('piece-001', 'ttc', CORPS, undefined)).status).toBe(400);
    }));

    it('etat-neuf-entre-deux-cibles', avec(async (c) => {
      const r = await c.corriger('piece-001', 'ttc', { ...CORPS, valeur: '1,00' }, 'cle-fictive-008');
      expect(corpsDe(r).ttcCentimes).toBe(100);
    }));
  });
}
