import { describe, expect, it } from 'vitest';
import { resoudre, TamponReferences, type Segment } from '../references.js';

const src = { type: 'ecriture', id: 'e1' };
const res = {
  ap1: {
    total: { valeur: 48250, nature: 'montant', source: src },
    jour: { valeur: '2026-03-01', nature: 'date', source: { type: 'piece', id: 'p9' } },
  },
  ap2: { taux: { valeur: 'T1', nature: 'taux', source: src } },
} as const;
const r = (nom: string) => `{{ref:${nom}}}`;
const valeur = (v: string | number, nature: string, source = src) => ({ sorte: 'valeur', valeur: v, nature, source });
const texte = (t: string) => ({ sorte: 'texte', texte: t });
const INCONNU = { sorte: 'inconnu' };
const flux = (morceaux: string[], resultats: Parameters<typeof resoudre>[1] = res): Segment[] => {
  const t = new TamponReferences(resultats);
  return [...morceaux.flatMap((m) => t.pousser(m)), ...t.terminer()];
};
const fusion = (segs: Segment[]): Segment[] =>
  segs.reduce<Segment[]>((acc, s) => {
    const d = acc[acc.length - 1];
    if (d?.sorte === 'texte' && s.sorte === 'texte') acc[acc.length - 1] = { sorte: 'texte', texte: d.texte + s.texte };
    else acc.push(s);
    return acc;
  }, []);

describe('references', () => {
  it('remplacement-simple', () => {
    expect(resoudre(`Total ${r('ap1.total')} ok`, res)).toEqual([
      texte('Total '),
      valeur(48250, 'montant'),
      texte(' ok'),
    ]);
    expect(resoudre(r('ap1.jour'), res)).toEqual([valeur('2026-03-01', 'date', { type: 'piece', id: 'p9' })]);
  });

  it('reference-inconnue', () => {
    expect(resoudre(r('zz.total'), res)).toEqual([INCONNU]);
    expect(resoudre(r('constructor.total'), res)).toEqual([INCONNU]);
    expect(resoudre(r('ap1.constructor'), res)).toEqual([INCONNU]);
  });

  it('champ-inconnu', () => {
    expect(resoudre(`a ${r('ap1.autre')} b`, res)).toEqual([texte('a '), INCONNU, texte(' b')]);
    expect(resoudre(r('ap2.total'), res)).toEqual([INCONNU]);
  });

  it('reference-coupee-en-deux', () => {
    const t = new TamponReferences(res);
    expect(t.pousser('Total {{ref:ap1.to')).toEqual([texte('Total ')]);
    expect(t.pousser('tal}} fin')).toEqual([valeur(48250, 'montant'), texte(' fin')]);
    expect(t.terminer()).toEqual([]);
    expect(fusion(flux(['x {', '{ref:ap1.total}', '} y']))).toEqual([texte('x '), valeur(48250, 'montant'), texte(' y')]);
    expect(fusion(flux(['x {{ref:ap1.total}', '} y']))).toEqual([texte('x '), valeur(48250, 'montant'), texte(' y')]);
  });

  it('reference-coupee-caractere-par-caractere', () => {
    const entree = `A ${r('ap1.total')} B ${r('ap2.taux')}.`;
    const attendu = resoudre(entree, res);
    const segments = flux([...entree]);
    expect(fusion(segments)).toEqual(fusion(attendu));
    expect(segments.some((s) => s.sorte === 'texte' && s.texte.includes('{'))).toBe(false);
  });

  it('accolades-simples-gardees', () => {
    expect(resoudre('a {b} c { d } }', res)).toEqual([texte('a {b} c { d } }')]);
    expect(fusion(flux(['a {b', '} c {', ' d']))).toEqual([texte('a {b} c { d')]);
    expect(resoudre('{{Mal Formé}} {{ref:A.b}} {{ref:ap1}}', res)).toEqual([texte('Mal Formé ref:A.b ref:ap1')]);
    expect(resoudre('{{{ref:ap1.total}}}', res)).toEqual([texte('{'), valeur(48250, 'montant'), texte('}')]);
  });

  it('reference-jamais-fermee', () => {
    expect(flux(['avant {{ref:ap1.tot'])).toEqual([texte('avant '), INCONNU]);
    expect(flux(['avant {{ref:'])).toEqual([texte('avant '), INCONNU]);
    expect(flux(['fin {'])).toEqual([texte('fin '), texte('{')]);
    const t = new TamponReferences(res);
    t.pousser('{{ref:ap1.total');
    expect(t.terminer()).toEqual([INCONNU]);
    expect(t.terminer()).toEqual([]);
  });

  it('deux-references-collees', () => {
    expect(resoudre(`${r('ap1.total')}${r('ap2.taux')}`, res)).toEqual([valeur(48250, 'montant'), valeur('T1', 'taux')]);
    expect(flux([`${r('ap1.total')}{{ref:ap`, `2.taux}}`])).toEqual([valeur(48250, 'montant'), valeur('T1', 'taux')]);
    expect(resoudre(`${r('ap1.total')}${r('zz.x')}`, res)).toEqual([valeur(48250, 'montant'), INCONNU]);
  });

  it('texte-vide-et-morceaux-vides', () => {
    expect(resoudre('', res)).toEqual([]);
    const t = new TamponReferences(res);
    expect(t.pousser('')).toEqual([]);
    expect(t.pousser('{{ref:ap1.total')).toEqual([]);
    expect(t.pousser('')).toEqual([]);
    expect(t.pousser('}}')).toEqual([valeur(48250, 'montant')]);
    expect(t.terminer()).toEqual([]);
    expect(new TamponReferences({}).terminer()).toEqual([]);
  });

  it('valeur-nan-ou-infinity-refusee', () => {
    const mauvais = {
      a: {
        nan: { valeur: Number.NaN, nature: 'montant', source: src },
        inf: { valeur: Infinity, nature: 'montant', source: src },
        moins: { valeur: -Infinity, nature: 'nombre', source: src },
        nature: { valeur: 1, nature: 'prix', source: src },
        objet: { valeur: {}, nature: 'nombre', source: src },
        source: { valeur: 1, nature: 'nombre', source: { type: 'x' } },
        bon: { valeur: 0, nature: 'nombre', source: src },
      },
    } as unknown as Parameters<typeof resoudre>[1];
    for (const champ of ['nan', 'inf', 'moins', 'nature', 'objet', 'source']) {
      expect(resoudre(r(`a.${champ}`), mauvais)).toEqual([INCONNU]);
    }
    expect(resoudre(r('a.bon'), mauvais)).toEqual([valeur(0, 'nombre')]);
  });
});
