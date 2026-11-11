import { describe, expect, it } from 'vitest';

export type RetourDepot = { status: number; json: unknown };
/** Une cible du dépôt : le serveur en mémoire ou le faux serveur. `cle` absente = pas d'en-tête idempotency-key. */
export type CibleDepot = () => Promise<{
  deposer: (fichiers: string[], cle: string | undefined) => Promise<RetourDepot>;
  /** Un seul fichier sous le nom de partie donné (même corps multipart sur les deux cibles). */
  deposerNomme: (nomPartie: string, contenu: string, cle: string | undefined) => Promise<RetourDepot>;
  /** Plusieurs parties nommées librement (même corps multipart sur les deux cibles). */
  deposerParties: (parties: { nom: string; contenu: string }[], cle: string | undefined) => Promise<RetourDepot>;
  etat: (id: string) => Promise<RetourDepot>;
  relancer: (id: string, cle: string | undefined) => Promise<RetourDepot>;
  fermer: () => Promise<void>;
}>;

type Cible = Awaited<ReturnType<CibleDepot>>;
type Resultat = { statut: string; id?: string; code?: string; recueLe?: string };
/** Statuts relevés sur le vrai serveur (oRPC, notation à crochets), dans l'ordre des cas. */
const ATTENDU_CROCHETS = [
  'indice-1-seul:400:',
  'indices-creux:400:',
  'indice-double:400:',
  'zero-de-tete:400:',
  'sans-indice:200:recue',
  'sans-indice-deux:200:deja_recue,recue',
  'indice-puis-sans-indice:400:',
  'indice-puis-nom-nu:200:deja_recue,deja_recue',
  'nom-nu-deux-fois:200:deja_recue,deja_recue',
  'sans-indice-puis-indice:400:',
  'indice-trop-grand:400:',
  'indices-dans-le-desordre:200:deja_recue,deja_recue',
];
const resultats = (r: RetourDepot) => (r.json as { body: { resultats: Resultat[] } }).body.resultats;

/** Suite commune du dépôt : écrite une fois, jouée sur le vrai serveur et sur le faux. Chaque test a sa propre cible (état neuf). */
export function suiteDepot(nom: string, cible: CibleDepot): void {
  describe('suite commune du dépôt : ' + nom, () => {
    const avec = (f: (c: Cible) => Promise<void>) => async () => {
      const c = await cible();
      try {
        await f(c);
      } finally {
        await c.fermer();
      }
    };

    it('un-fichier-sous-le-nom-fichiers-sans-crochets-refuse-400', avec(async (c) => {
      expect((await c.deposerNomme('fichiers', '%PDF-1.4 fictif A', 'cle-fictive-090')).status).toBe(400);
      expect((await c.deposerNomme('fichiers[0]', '%PDF-1.4 fictif A', 'cle-fictive-091')).status).toBe(200);
    }));

    it('notation-a-crochets-memes-statuts-vrai-et-faux', avec(async (c) => {
      const A = '%PDF-1.4 fictif A';
      const B = '%PDF-1.4 fictif B';
      const cas: [string, { nom: string; contenu: string }[]][] = [
        ['indice-1-seul', [{ nom: 'fichiers[1]', contenu: A }]],
        ['indices-creux', [{ nom: 'fichiers[0]', contenu: A }, { nom: 'fichiers[2]', contenu: B }]],
        ['indice-double', [{ nom: 'fichiers[0]', contenu: A }, { nom: 'fichiers[0]', contenu: B }]],
        ['zero-de-tete', [{ nom: 'fichiers[01]', contenu: A }]],
        ['sans-indice', [{ nom: 'fichiers[]', contenu: A }]],
        ['sans-indice-deux', [{ nom: 'fichiers[]', contenu: A }, { nom: 'fichiers[]', contenu: B }]],
        ['indice-puis-sans-indice', [{ nom: 'fichiers[0]', contenu: A }, { nom: 'fichiers[]', contenu: B }]],
        ['indice-puis-nom-nu', [{ nom: 'fichiers[0]', contenu: A }, { nom: 'fichiers', contenu: B }]],
        ['nom-nu-deux-fois', [{ nom: 'fichiers', contenu: A }, { nom: 'fichiers', contenu: B }]],
        ['sans-indice-puis-indice', [{ nom: 'fichiers[]', contenu: A }, { nom: 'fichiers[0]', contenu: B }]],
        ['indice-trop-grand', [{ nom: 'fichiers[10000]', contenu: A }]],
        ['indices-dans-le-desordre', [{ nom: 'fichiers[1]', contenu: B }, { nom: 'fichiers[0]', contenu: A }]],
      ];
      const sorties: string[] = [];
      for (const [i, [nom, parties]] of cas.entries()) {
        const r = await c.deposerParties(parties, `cle-fictive-2${i}`);
        sorties.push(`${nom}:${r.status}:${r.status === 200 ? resultats(r).map((x) => x.statut).join(',') : ''}`);
      }
      expect(sorties).toEqual(ATTENDU_CROCHETS);
    }));

    it('trois-fichiers-trois-recues-dans-lordre', avec(async (c) => {
      const r = await c.deposer(['%PDF-1.4 fictif A', '%PDF-1.4 fictif B', '%PDF-1.4 fictif C'], 'cle-fictive-001');
      expect(r.status).toBe(200);
      const l = resultats(r);
      expect(l.map((x) => x.statut)).toEqual(['recue', 'recue', 'recue']);
      expect(new Set(l.map((x) => x.id)).size).toBe(3);
    }));

    it('meme-fichier-deux-fois-deja-recue', avec(async (c) => {
      const l = resultats(await c.deposer(['%PDF-1.4 fictif A', '%PDF-1.4 fictif A'], 'cle-fictive-002'));
      expect(l.map((x) => x.statut)).toEqual(['recue', 'deja_recue']);
      expect(l[1]?.id).toBe(l[0]?.id);
      expect(typeof l[1]?.recueLe).toBe('string');
    }));

    it('fichier-refuse-code-et-raison', avec(async (c) => {
      const l = resultats(await c.deposer(['%PDF-1.4 fictif A', 'contenu brut sans signature'], 'cle-fictive-003'));
      expect(l.map((x) => x.statut)).toEqual(['recue', 'refusee']);
      expect(l[1]?.code).toBe('type_refuse');
    }));

    it('meme-cle-memes-octets-meme-reponse', avec(async (c) => {
      const un = await c.deposer(['%PDF-1.4 fictif A'], 'cle-fictive-004');
      const deux = await c.deposer(['%PDF-1.4 fictif A'], 'cle-fictive-004');
      expect(deux.json).toEqual(un.json);
    }));

    it('etat-d-une-piece-recue-et-inconnue-404', avec(async (c) => {
      const id = resultats(await c.deposer(['%PDF-1.4 fictif A'], 'cle-fictive-005'))[0]?.id ?? '';
      const e = await c.etat(id);
      expect([e.status, e.json]).toEqual([200, { body: { etat: 'recue' } }]);
      expect((await c.etat('inconnue-xyz')).status).toBe(404);
    }));

    it('relance-409-hors-erreur-et-404-si-inconnue', avec(async (c) => {
      const id = resultats(await c.deposer(['%PDF-1.4 fictif A'], 'cle-fictive-006'))[0]?.id ?? '';
      expect((await c.relancer(id, 'cle-fictive-007')).status).toBe(409);
      expect((await c.relancer('inconnue-xyz', 'cle-fictive-008')).status).toBe(404);
    }));

    it('sans-en-tete-idempotency-key-400', avec(async (c) => {
      expect((await c.deposer(['%PDF-1.4 fictif A'], undefined)).status).toBe(400);
      expect((await c.relancer('piece-001', undefined)).status).toBe(400);
    }));

    it('etat-neuf-entre-deux-cibles', avec(async (c) => {
      const l = resultats(await c.deposer(['%PDF-1.4 fictif A'], 'cle-fictive-009'));
      expect(l[0]?.statut).toBe('recue');
    }));
  });
}
