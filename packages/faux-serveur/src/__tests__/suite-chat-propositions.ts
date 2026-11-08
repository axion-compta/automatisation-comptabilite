import { describe, expect, it } from 'vitest';
import type { Appeler } from './suite-contrat.js';

export const MIN = 60_000;
export const DEBUT = '2031-03-10T08:00:00.000Z';
export const REGLAGES = { validiteMs: 30 * MIN, toastMs: 10 * MIN, historiqueMs: 60 * MIN };
/** Jeu commun aux deux cibles : une proposition de niveau B, une de niveau I (fermé). */
export const AJOUTS = [
  { id: 'prp-0001', outil: 'enregistrer_ecriture', niveau: 'B' as const, cibles: ['ecr-1'], avant: { montant: 0 }, apres: { montant: 4200 } },
  { id: 'prp-0002', outil: 'enregistrer_ecriture', niveau: 'I' as const, cibles: ['ecr-2'], avant: { montant: 0 }, apres: { montant: 100 } },
];
export type ScenarioPropositions = { acteur: 'personne' | 'compte_service' };
/** Cible neuve avec acteur et horloge injectés (jamais lus dans la requête) ; `avancer` fait avancer l'horloge. */
export type CiblePropositions = (s: ScenarioPropositions) => Promise<{ appeler: Appeler; avancer: (ms: number) => void; fermer: () => Promise<void> }>;

const cle = (c = 'cle-00001') => ({ 'idempotency-key': c });
const CHEMIN = '/chat/propositions/';
const CHAMPS_TEXTE = ['texte', 'entree', 'sortie', 'prompt', 'consigne', 'contenu'];
const cles = (v: unknown): string[] => (typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...cles(x)]) : []);
const code = (r: { json: unknown }) => (r.json as { code?: string }).code;
const corps = (r: { json: unknown }) => (r.json as { body: Record<string, unknown> }).body;

/** Suite commune des propositions du chat : jouée sur le vrai serveur et sur le faux. */
export function suiteChatPropositions(nom: string, cible: CiblePropositions): void {
  describe('suite des propositions du chat commune : ' + nom, () => {
    const avec = async (f: (a: Appeler, avancer: (ms: number) => void) => Promise<void>, s: ScenarioPropositions = { acteur: 'personne' }) => {
      const c = await cible(s);
      try {
        await f(c.appeler, c.avancer);
      } finally {
        await c.fermer();
      }
    };
    const appliquer = (a: Appeler, c = 'cle-00001', id = 'prp-0001', entetes: Record<string, string> = cle(c)) => a('POST', `${CHEMIN}${id}/appliquer`, entetes);
    const annuler = (a: Appeler, c = 'cle-annul') => a('POST', `${CHEMIN}prp-0001/annuler`, cle(c));
    const lire = async (a: Appeler) => corps(await a('GET', CHEMIN + 'prp-0001'));

    it('appliquer-puis-meme-cle', () =>
      avec(async (a, avancer) => {
        expect(await lire(a)).toMatchObject({ id: 'prp-0001', etat: 'proposee', niveau: 'B', nombre_objets: 1 });
        const x = await appliquer(a);
        expect(x.status).toBe(200);
        expect(corps(x)).toMatchObject({ etat: 'appliquee', applique_le: DEBUT });
        avancer(MIN);
        expect((await appliquer(a)).json).toEqual(x.json);
        expect(await appliquer(a, 'autre-cle-1').then((r) => r.status)).toBe(400);
        expect((await lire(a)).etat).toBe('appliquee');
        expect((await appliquer(a, undefined, 'prp-0001', {})).status).toBe(400);
      }));

    it('compte-de-service-403', () =>
      avec(async (a) => {
        const r = await appliquer(a, undefined, 'prp-0001', { ...cle(), 'x-acteur': 'personne' });
        expect([r.status, code(r)]).toEqual([403, 'ACTEUR_NON_HUMAIN']);
        expect((await lire(a)).etat).toBe('proposee');
      }, { acteur: 'compte_service' }));

    it('expiree-409', () =>
      avec(async (a, avancer) => {
        avancer(REGLAGES.validiteMs);
        const r = await appliquer(a);
        expect([r.status, code(r)]).toEqual([409, 'PROPOSITION_EXPIREE']);
      }));

    it('niveau-i-423', () =>
      avec(async (a) => {
        const r = await appliquer(a, undefined, 'prp-0002');
        expect([r.status, code(r)]).toEqual([423, 'NIVEAU_FERME']);
      }));

    it('annuler-dans-la-fenetre', () =>
      avec(async (a, avancer) => {
        await appliquer(a);
        avancer(REGLAGES.toastMs + MIN);
        const r = await annuler(a);
        expect(r.status).toBe(200);
        expect(corps(r).etat).toBe('annulee');
        expect((await annuler(a)).json).toEqual(r.json);
        expect((await annuler(a, 'autre-cle-1')).status).toBe(400);
      }));

    it('annuler-trop-tard-409', () =>
      avec(async (a, avancer) => {
        expect((await annuler(a)).status).toBe(404);
        await appliquer(a);
        avancer(REGLAGES.historiqueMs);
        const r = await annuler(a);
        expect([r.status, code(r)]).toEqual([409, 'ANNULATION_EXPIREE']);
        expect((await lire(a)).etat).toBe('appliquee');
      }));

    it('pourquoi-sans-texte', () =>
      avec(async (a) => {
        const r = await a('GET', CHEMIN + 'prp-0001/pourquoi');
        expect(r.status).toBe(200);
        const { decision, appel } = corps(r) as { decision: Record<string, unknown>; appel: Record<string, unknown> };
        expect(Object.keys(decision)).toEqual(expect.arrayContaining(['demandeur', 'source_proposition', 'confiance']));
        expect(appel).toHaveProperty('modele');
        expect(cles(corps(r)).filter((k) => CHAMPS_TEXTE.includes(k))).toEqual([]);
      }));

    it('inconnue-404', () =>
      avec(async (a) => {
        for (const [methode, suite] of [['GET', ''], ['GET', '/pourquoi'], ['POST', '/appliquer'], ['POST', '/annuler']] as const) {
          const r = await a(methode, `${CHEMIN}nulle${suite}`, methode === 'POST' ? cle() : {});
          expect([suite, r.status, code(r)]).toEqual([suite, 404, 'PROPOSITION_INCONNUE']);
        }
      }));
  });
}
