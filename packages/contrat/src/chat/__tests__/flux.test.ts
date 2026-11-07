import { describe, expect, it } from 'vitest';
import { CODES_ERREUR, ISSUES, NIVEAUX } from '../../../../noyau/src/chat/types.js';
import type { Evenement } from '../evenements.js';
import { DecodeurFlux, encoderEvenement, reprendreApres } from '../flux.js';

const carte = { id: 'k1', titre_code: 'carte.titre', source: { type: 'ecriture', id: 'e1' }, type: 'tva', montant_centimes: 100, devise: 'EUR' };
const choix = [{ code: 'c0', libelle_code: 'choix.0' }, { code: 'c1', libelle_code: 'choix.1' }];
const HUIT = [
  { id: 1, type: 'tour.debut' },
  { id: 2, type: 'etape', etape: 'lue_a' },
  { id: 3, type: 'texte', texte: 'Voici\nune ligne' },
  { id: 4, type: 'carte', carte },
  { id: 5, type: 'proposition', proposition_id: 'p1', niveau: NIVEAUX[0], nombre_objets: 2 },
  { id: 6, type: 'question', choix },
  { id: 7, type: 'erreur', code: CODES_ERREUR[0] },
  { id: 8, type: 'tour.fin', issue: ISSUES[0], cout_micro_centimes: 0 },
] as unknown as Evenement[];
const flux = HUIT.map((e) => encoderEvenement(e.id, e)).join('');
const texte = (id: number) => ({ id, type: 'texte', texte: `t${id}` }) as Evenement;
const MINUTE = 60_000;
const CONSERVATION = 5 * MINUTE;

describe('flux du chat', () => {
  it('aller-retour-huit-types', () => {
    expect(encoderEvenement(3, HUIT[2]!)).toBe(`id: 3\nevent: texte\ndata: ${JSON.stringify(HUIT[2])}\n\n`);
    expect(encoderEvenement(3, HUIT[2]!).split('\n')).toHaveLength(5);
    const d = new DecodeurFlux();
    expect(d.pousser(flux)).toEqual(HUIT);
    expect(d.ignores).toBe(0);
    for (const mauvais of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2]) {
      expect(() => encoderEvenement(mauvais, HUIT[0]!)).toThrow(RangeError);
    }
  });

  it('evenement-coupe-en-trois-morceaux', () => {
    const d = new DecodeurFlux();
    const un = encoderEvenement(1, HUIT[2]!);
    const a = Math.floor(un.length / 3);
    expect(d.pousser(un.slice(0, a))).toEqual([]);
    expect(d.pousser(un.slice(a, 2 * a))).toEqual([]);
    expect(d.pousser(un.slice(2 * a))).toEqual([{ ...HUIT[2], id: 1 }]);
    const e = new DecodeurFlux();
    const sortie = [...flux].flatMap((c) => e.pousser(c));
    expect(sortie).toEqual(HUIT);
  });

  it('fin-de-ligne-crlf', () => {
    const crlf = flux.replace(/\n/g, '\r\n');
    expect(new DecodeurFlux().pousser(crlf)).toEqual(HUIT);
    const d = new DecodeurFlux();
    expect([...crlf].flatMap((c) => d.pousser(c))).toEqual(HUIT);
    const cr = flux.replace(/\n/g, '\r');
    expect(new DecodeurFlux().pousser(cr + '\r')).toEqual(HUIT);
  });

  it('commentaire-ignore', () => {
    const d = new DecodeurFlux();
    const avec = `: ping\n\n${encoderEvenement(1, HUIT[0]!)}: battement\n${encoderEvenement(2, HUIT[1]!)}`;
    expect(d.pousser(avec).map((e) => e.id)).toEqual([1, 2]);
    expect(d.pousser(': seul\n\n')).toEqual([]);
    expect(d.ignores).toBe(0);
  });

  it('id-non-croissant-ignore', () => {
    const d = new DecodeurFlux();
    const sortie = d.pousser(encoderEvenement(3, texte(3)) + encoderEvenement(3, texte(3)) + encoderEvenement(2, texte(2)) + encoderEvenement(4, texte(4)));
    expect(sortie.map((e) => e.id)).toEqual([3, 4]);
    expect(d.ignores).toBe(2);
    expect(d.pousser(encoderEvenement(4, texte(4)))).toEqual([]);
    expect(d.ignores).toBe(3);
    expect(d.pousser(encoderEvenement(5, texte(5))).map((e) => e.id)).toEqual([5]);
    // événements illisibles : ignorés sans lever
    const e = new DecodeurFlux();
    const sale = ['id: 1\nevent: texte\ndata: {pas du json\n\n', 'id: 2\nevent: inconnu\ndata: {"type":"inconnu"}\n\n', 'id: abc\ndata: {}\n\n', 'data: {"type":"tour.debut"}\n\n', 'id: -4\ndata: {"type":"tour.debut"}\n\n', 'id: 1.5\ndata: {"type":"tour.debut"}\n\n', 'id: 9\nevent: etape\ndata: {"type":"tour.debut"}\n\n'];
    expect(e.pousser(sale.join(''))).toEqual([]);
    expect(e.pousser(encoderEvenement(1, HUIT[0]!)).map((x) => x.id)).toEqual([1]);
  });

  it('reprise-apres-sept', () => {
    const t0 = 1_000_000;
    const journal = HUIT.concat([texte(9), texte(10)]).map((evt) => ({ id: evt.id, horodatage: t0 + evt.id * 1000, evt }));
    const apres = reprendreApres(journal, 7, t0 + 4 * MINUTE, CONSERVATION);
    expect(apres.map((e) => e.id)).toEqual([8, 9, 10]);
    // coupure puis reprise par le décodeur : aucun doublon
    const d = new DecodeurFlux();
    const recu = d.pousser(journal.slice(0, 7).map((j) => encoderEvenement(j.id, j.evt)).join(''));
    const repris = new DecodeurFlux();
    const suite = repris.pousser(apres.map((e) => encoderEvenement(e.id, e)).join(''));
    expect([...recu, ...suite].map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(reprendreApres(journal, 10, t0 + MINUTE, CONSERVATION)).toEqual([]);
    expect(reprendreApres([...journal].reverse(), 7, t0 + MINUTE, CONSERVATION).map((e) => e.id)).toEqual([8, 9, 10]);
  });

  it('reprise-au-dela-de-la-conservation-vide', () => {
    const t0 = 1_000_000;
    const journal = [1, 2, 3].map((id) => ({ id, horodatage: t0 + id, evt: texte(id) }));
    expect(reprendreApres(journal, 1, t0 + CONSERVATION + 100, CONSERVATION)).toEqual([]);
    expect(reprendreApres(journal, 1, t0 + CONSERVATION + 2, CONSERVATION).map((e) => e.id)).toEqual([2, 3]);
    expect(reprendreApres(journal, 1, t0 + CONSERVATION + 3, CONSERVATION).map((e) => e.id)).toEqual([3]);
    expect(reprendreApres(journal, 1, t0 + 10, 0)).toEqual([]);
    for (const mauvais of [NaN, -1, Infinity]) expect(reprendreApres(journal, 1, t0 + 10, mauvais)).toEqual([]);
    expect(reprendreApres(journal, 1, NaN, CONSERVATION)).toEqual([]);
  });

  it('dernier-id-invalide', () => {
    const t0 = 1_000_000;
    const journal = [1, 2, 3].map((id) => ({ id, horodatage: t0, evt: texte(id) }));
    for (const mauvais of [NaN, -1, 2.5, '7', undefined, null, Infinity]) {
      expect(reprendreApres(journal, mauvais as never, t0, CONSERVATION).map((e) => e.id)).toEqual([1, 2, 3]);
    }
    expect(reprendreApres(journal, 0, t0, CONSERVATION)).toHaveLength(3);
  });

  it('journal-vide', () => {
    expect(reprendreApres([], 7, 0, CONSERVATION)).toEqual([]);
    expect(reprendreApres([], NaN, 0, CONSERVATION)).toEqual([]);
    expect(new DecodeurFlux().pousser('')).toEqual([]);
    expect(new DecodeurFlux().pousser('\n\n\n\n')).toEqual([]);
  });

  it('decodeur-sans-exception-sur-morceaux-aleatoires', () => {
    let s = 12345;
    const alea = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const frag = ['id: ', 'id: 5', 'event: ', 'data: ', '{"', '"type":"texte"', '"texte":"x"', '}', '\n', '\r', '\r\n', '\n\n', ':', ' ', 'é', '\u0000', '9'.repeat(30), 'tour.debut', encoderEvenement(40, texte(40))];
    const d = new DecodeurFlux();
    const vus: number[] = [];
    for (let i = 0; i < 1000; i++) {
      let m = '';
      for (let k = Math.floor(alea() * 6); k >= 0; k--) m += frag[Math.floor(alea() * frag.length)];
      expect(() => vus.push(...d.pousser(m).map((e) => e.id))).not.toThrow();
    }
    expect(vus.every((id, i) => i === 0 || id > vus[i - 1]!)).toBe(true);
    expect(() => d.pousser(42 as never)).not.toThrow();
    expect(d.pousser(undefined as never)).toEqual([]);
  });
});
