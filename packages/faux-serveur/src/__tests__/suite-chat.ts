import { describe, expect, it } from 'vitest';
import { DecodeurFlux } from '../../../contrat/src/chat/flux.js';

export type RetourTexte = { status: number; texte: string; type: string };
export type AppelerTexte = (chemin: string, entetes: Record<string, string>, corps?: unknown) => Promise<RetourTexte>;
/** Une cible neuve du chat : le vrai serveur ou le faux (POST, réponse lue comme texte). */
export type CibleChat = () => Promise<{ appeler: AppelerTexte; fermer: () => Promise<void> }>;

const demande = (id = 'msg-0001', plus: Record<string, unknown> = {}) => ({
  message_id: id,
  conversation_id: 'conv-0001',
  texte: 'Bonjour',
  puces: [],
  canal: 'clavier',
  ...plus,
});
const cle = (id: string) => ({ 'idempotency-key': id });
const lire = (texte: string) => new DecodeurFlux().pousser(texte);

/** Suite commune du chat : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteChat(nom: string, cible: CibleChat): void {
  describe('suite du chat commune : ' + nom, () => {
    const avec = async (f: (a: AppelerTexte) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const envoyer = (a: AppelerTexte, id = 'msg-0001', plus: Record<string, unknown> = {}, entetes: Record<string, string> = {}) =>
      a('/chat/messages', { ...cle(id), ...entetes }, demande(id, plus));

    it('flux-ordonne', () =>
      avec(async (a) => {
        const r = await envoyer(a);
        expect(r.status).toBe(200);
        expect(r.type).toContain('text/event-stream');
        const evts = lire(r.texte);
        expect(evts.map((e) => e.type)).toEqual(['tour.debut', 'etape', 'texte', 'tour.fin']);
        expect(evts.map((e) => e.id)).toEqual([1, 2, 3, 4]);
        expect(evts[3]).toMatchObject({ type: 'tour.fin', issue: 'reponse' });
      }));

    it('meme-message-meme-flux, autre message autre tour', () =>
      avec(async (a) => {
        const premier = await envoyer(a);
        expect((await envoyer(a)).texte).toBe(premier.texte);
        expect((await envoyer(a, 'msg-0002')).status).toBe(200);
      }));

    it('texte-trop-long-400 (et texte vide, clé différente, champ de société)', () =>
      avec(async (a) => {
        for (const plus of [{ texte: 'x'.repeat(100000) }, { texte: '' }, { societe_id: 'soc_b' }]) {
          expect([Object.keys(plus)[0], (await envoyer(a, 'msg-0001', plus)).status]).toEqual([Object.keys(plus)[0], 400]);
        }
        expect((await a('/chat/messages', cle('autre-cle-1'), demande())).status).toBe(400);
        expect((await a('/chat/messages', {}, demande())).status).toBe(400);
      }));

    it('arret-coupe-le-flux : tour connu arrêté, flux rejoué terminé par tour.fin', () =>
      avec(async (a) => {
        await envoyer(a);
        const arret = await a('/chat/tours/msg-0001/arreter', cle('arret-0001'));
        expect(arret.status).toBe(200);
        expect(JSON.parse(arret.texte)).toEqual({ body: { tour_id: 'msg-0001', arrete: true } });
        const evts = lire((await envoyer(a)).texte);
        expect(evts.at(-1)).toMatchObject({ type: 'tour.fin' });
        expect((await a('/chat/tours/msg-0001/arreter', {})).status).toBe(400);
      }));

    it('reprise-apres-coupure (T-CHT-12) : Last-Event-ID, aucun doublon, flux complet', () =>
      avec(async (a) => {
        const decodeur = new DecodeurFlux();
        const coupe = await envoyer(a, 'msg-0001', {}, { 'x-coupure': '2' });
        const debut = decodeur.pousser(coupe.texte);
        expect(debut.length).toBeGreaterThanOrEqual(2);
        const suite = await envoyer(a, 'msg-0001', {}, { 'last-event-id': String(decodeur.dernierId) });
        const fin = decodeur.pousser(suite.texte);
        const tous = [...debut, ...fin];
        expect(tous.map((e) => e.id)).toEqual([1, 2, 3, 4]);
        expect(tous.at(-1)).toMatchObject({ type: 'tour.fin' });
      }));

    it('tour-inconnu-404', () =>
      avec(async (a) => {
        const r = await a('/chat/tours/inconnu/arreter', cle('arret-0001'));
        expect(r.status).toBe(404);
        expect(JSON.parse(r.texte)).toMatchObject({ defined: true, code: 'TOUR_INCONNU', status: 404 });
      }));
  });
}
