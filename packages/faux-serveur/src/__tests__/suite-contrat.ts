import { describe, expect, it } from 'vitest';

export type Retour = { status: number; json: unknown };
export type Appeler = (methode: string, chemin: string, entetes?: Record<string, string>, corps?: unknown) => Promise<Retour>;
/** Une cible neuve (état vide) : le vrai serveur ou le faux. */
export type Cible = () => Promise<{ appeler: Appeler; fermer: () => Promise<void> }>;

const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-' + n });
const nouvelle = { libelle: 'Achat fictif', montantCentimes: 1250 };

/** Suite de contrat commune : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteContrat(nom: string, cible: Cible): void {
  describe('suite de contrat commune : ' + nom, () => {
    const avec = async (f: (a: Appeler) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const corps = (r: Retour) => (r.json as { body: Array<Record<string, unknown>> & Record<string, unknown> }).body;

    it('liste vide : enveloppe { body, decalage, total }', () =>
      avec(async (a) => {
        expect((await a('GET', '/ecritures')).json).toEqual({ body: [], decalage: 0, total: 0 });
      }));

    it('crée avec enveloppe { body } puis rejoue la même clé sans doublon', () =>
      avec(async (a) => {
        const x = await a('POST', '/ecritures', cle('1'), nouvelle);
        const y = await a('POST', '/ecritures', cle('1'), nouvelle);
        expect(x.status).toBe(200);
        expect(corps(x)).toMatchObject({ id: 'E1', libelle: 'Achat fictif', montantCentimes: 1250, version: 1 });
        expect(y.json).toEqual(x.json);
        expect((await a('GET', '/ecritures')).json).toMatchObject({ total: 1 });
      }));

    it('pagine : limite, décalage et total', () =>
      avec(async (a) => {
        for (let i = 1; i <= 5; i++) await a('POST', '/ecritures', cle(String(i)), { ...nouvelle, libelle: 'Achat ' + i });
        const r = await a('GET', '/ecritures?limite=2&decalage=1');
        expect((corps(r) as unknown as Array<{ libelle: string }>).map((e) => e.libelle)).toEqual(['Achat 2', 'Achat 3']);
        expect(r.json).toMatchObject({ decalage: 1, total: 5 });
        expect((await a('GET', '/ecritures?decalage=9')).json).toMatchObject({ body: [], decalage: 9, total: 5 });
      }));

    it('400 : limite nulle, décalage négatif, clé absente, montant décimal', () =>
      avec(async (a) => {
        expect((await a('GET', '/ecritures?limite=0')).status).toBe(400);
        expect((await a('GET', '/ecritures?decalage=-1')).status).toBe(400);
        expect((await a('POST', '/ecritures', {}, nouvelle)).status).toBe(400);
        expect((await a('POST', '/ecritures', cle('2'), { ...nouvelle, montantCentimes: 1.5 })).status).toBe(400);
        const r = await a('POST', '/ecritures', {}, nouvelle);
        expect(r.json).toMatchObject({ code: 'BAD_REQUEST', status: 400 });
      }));

    it('idempotence par route : la même clé sur POST puis PUT = deux effets', () =>
      avec(async (a) => {
        await a('POST', '/ecritures', cle('1'), nouvelle);
        const r = await a('PUT', '/ecritures/E1', cle('1'), { libelle: 'Maj', montantCentimes: 10, version: 1 });
        expect(r.status).toBe(200);
        expect(corps(r)).toMatchObject({ version: 2, libelle: 'Maj' });
      }));

    it('409 : version périmée, code et version actuelle', () =>
      avec(async (a) => {
        await a('POST', '/ecritures', cle('1'), nouvelle);
        const maj = { libelle: 'Maj', montantCentimes: 10, version: 1 };
        expect((await a('PUT', '/ecritures/E1', cle('2'), maj)).status).toBe(200);
        const r = await a('PUT', '/ecritures/E1', cle('3'), maj);
        expect(r.status).toBe(409);
        expect(r.json).toMatchObject({ code: 'CONFLIT_VERSION', status: 409, data: { versionActuelle: 2 } });
      }));

    it('404 : écriture inconnue, code NOT_FOUND', () =>
      avec(async (a) => {
        const r = await a('PUT', '/ecritures/E9', cle('1'), { libelle: 'x', montantCentimes: 1, version: 1 });
        expect(r.status).toBe(404);
        expect(r.json).toMatchObject({ code: 'NOT_FOUND', status: 404 });
      }));
  });
}
