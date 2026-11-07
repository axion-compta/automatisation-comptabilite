// Fiche L05-T50 : réducteur d'état de conversation.
import { describe, expect, it } from 'vitest';
import { arreter, envoyer, ERREUR_TOUR_INTERROMPU, ETAT_INITIAL, reduire, type EtatConversation } from '../etat.js';

const debut = (id: number) => ({ id, type: 'tour.debut' });
const texte = (id: number, t = 'bonjour') => ({ id, type: 'texte', texte: t });
const proposition = (id: number) => ({ id, type: 'proposition', proposition_id: `p${id}`, niveau: 'B', nombre_objets: 2 });
const fin = (id: number) => ({ id, type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 });
const suite = (evts: unknown[], depart: EtatConversation = ETAT_INITIAL) => evts.reduce<EtatConversation>(reduire, depart);

function graine(depart: number) {
  let s = depart;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function profond<T>(o: T): T {
  if (o !== null && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(profond);
  }
  return o;
}

describe('état de conversation', () => {
  it('etat-initial-vide', () => {
    expect(ETAT_INITIAL).toEqual({ messages: [], dernierId: -1 });
  });

  it('tour-complet', () => {
    const e = suite([debut(0), { id: 1, type: 'etape', etape: 'lecture' }, texte(2, 'a'), texte(3, 'b'), proposition(4), fin(5)]);
    expect(e.tourEnCours).toBeUndefined();
    expect(e.dernierId).toBe(5);
    const m = e.messages[0];
    if (m?.auteur !== 'axion') throw new Error('message attendu');
    expect(m.tour.segments).toEqual(['a', 'b']);
    expect(m.tour.etapes).toEqual(['lecture']);
    expect(m.tour.propositions).toHaveLength(1);
    expect(m.tour.issue).toBe('reponse');
  });

  it('evenement-inconnu-ignore', () => {
    const e = suite([debut(0)]);
    for (const x of [{ id: 1, type: 'inconnu' }, { id: 1, type: 'texte' }, { ...texte(1), en_plus: 1 }]) {
      expect(reduire(e, x)).toBe(e);
    }
  });

  it('doublon-ignore', () => {
    const e = suite([debut(0), texte(1)]);
    expect(reduire(e, texte(1))).toBe(e);
    expect(e.tourEnCours?.segments).toHaveLength(1);
  });

  it('ordre-inverse-ignore', () => {
    const e = suite([debut(0), texte(5)]);
    expect(reduire(e, texte(3))).toBe(e);
    expect(e.dernierId).toBe(5);
  });

  it('arret-garde-les-propositions', () => {
    const e = arreter(suite([debut(0), proposition(1), texte(2)]));
    expect(e.tourEnCours).toBeUndefined();
    const m = e.messages[0];
    if (m?.auteur !== 'axion') throw new Error('message attendu');
    expect(m.tour.propositions.map((p) => p.proposition_id)).toEqual(['p1']);
    expect(arreter(e)).toBe(e);
  });

  it('deux-debuts-de-suite', () => {
    const e = suite([debut(0), proposition(1), debut(2)]);
    const m = e.messages[0];
    if (m?.auteur !== 'axion') throw new Error('message attendu');
    expect(m.tour.erreur).toBe(ERREUR_TOUR_INTERROMPU);
    expect(m.tour.propositions).toHaveLength(1);
    expect(e.tourEnCours?.id).toBe(2);
    expect(e.tourEnCours?.propositions).toEqual([]);
  });

  it('mille-evenements-au-hasard', () => {
    const alea = graine(12345);
    const choix = <T>(l: T[]): T => l[Math.floor(alea() * l.length)] as T;
    const valides = (i: number) => choix<unknown>([debut(i), texte(i), proposition(i), fin(i), { id: i, type: 'etape', etape: 'x' }]);
    const bruits: unknown[] = [null, undefined, {}, [], [1, 2], 0, -1, NaN, Infinity, 1.5, '', 'texte', true, { id: 'a', type: 1 }, { id: NaN, type: 'texte', texte: 'a' }];
    let e = ETAT_INITIAL;
    for (let i = 0; i < 1000; i++) {
      const brut = alea() < 0.5 ? valides(Math.floor(alea() * 400)) : choix(bruits);
      expect(() => (e = reduire(e, brut))).not.toThrow();
      expect(Number.isSafeInteger(e.dernierId)).toBe(true);
      expect(Array.isArray(e.messages)).toBe(true);
    }
  });

  it('etat-non-modifie-en-place', () => {
    let e = profond(envoyer(ETAT_INITIAL, 'salut'));
    for (const x of [debut(0), texte(1), proposition(2), debut(3), fin(4), debut(5), texte(6)]) e = profond(reduire(e, x));
    expect(() => profond(arreter(e))).not.toThrow();
    expect(() => envoyer(e, 'fin')).not.toThrow();
    expect(e.messages[0]).toEqual({ auteur: 'personne', texte: 'salut' });
  });
});
