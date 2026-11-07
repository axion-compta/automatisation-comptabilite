import { describe, expect, it } from 'vitest';
import { ErreurExtrait, echapperHtml, extrait, grouper, paginer, trier } from '../extrait.js';

const sansMark = (s: string): string => s.replaceAll('<mark>', '').replaceAll('</mark>', '');
const code = (f: () => unknown): string | undefined => {
  try {
    f();
    return undefined;
  } catch (e) {
    return e instanceof ErreurExtrait ? e.code : 'autre';
  }
};

describe('recherche : extrait', () => {
  it.each([Number.NaN, Infinity, -5, 0, 2.5])('longueur-invalide-%s', (l) => {
    expect(code(() => extrait('alpha facture', ['facture'], false, l))).toBe('limite_invalide');
  });

  it('curseur-bits-de-bourrage-non-canonique', () => {
    const c = Buffer.from(JSON.stringify({ d: 1 })).toString('base64url');
    expect(paginer([1, 2, 3], { limite: 1, curseur: c }).elements).toEqual([2]);
    const alt = `${c.slice(0, -1)}R`;
    expect(Buffer.from(alt, 'base64url').toString()).toBe('{"d":1}');
    expect(code(() => paginer([1, 2, 3], { limite: 1, curseur: alt }))).toBe('curseur_invalide');
  });

  it('echapperHtml-cinq-caracteres', () => {
    expect(echapperHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('script-echappe', () => {
    const r = extrait('avant <script>alert(1)</script> facture', ['facture'], false, 200);
    expect(r).not.toContain('<script');
    expect(r).toContain('&lt;script&gt;');
    expect(r).toContain('<mark>facture</mark>');
  });

  it('hyperlink-texte-intact-echappe', () => {
    const r = extrait('=HYPERLINK("http://exemple.fr","x") facture', ['facture'], false, 200);
    expect(r).toBe('=HYPERLINK(&quot;http://exemple.fr&quot;,&quot;x&quot;) <mark>facture</mark>');
  });

  it('seules-balises-mark', () => {
    const r = extrait('<b>a</b> & "c" <i>facture</i> <img src=x>', ['facture', 'img'], false, 200);
    expect(sansMark(r)).not.toContain('<');
    expect(r.match(/<mark>/g)).toHaveLength(2);
  });

  it('accent-trouve-texte-d-origine-rendu', () => {
    expect(extrait('Une Facturé du mois', ['fact'], true, 200)).toBe('Une <mark>Facturé</mark> du mois');
    expect(extrait('Une Facturé du mois', ['fact'], false, 200)).not.toContain('<mark>');
  });

  it('pas-de-mark-imbrique', () => {
    const r = extrait('facture facturation facture', ['facture', 'fact'], true, 200);
    expect(r).toBe('<mark>facture</mark> <mark>facturation</mark> <mark>facture</mark>');
    expect(r).not.toMatch(/<mark>[^<]*<mark>/);
  });

  it('mot-absent-debut-du-texte', () => {
    expect(extrait('alpha beta gamma delta', ['zzz'], false, 11)).toBe('alpha beta');
    expect(extrait('alpha beta', [], false, 200)).toBe('alpha beta');
    expect(extrait('', ['a'], false, 20)).toBe('');
    expect(extrait('a'.repeat(30), [], false, 10)).toBe('a'.repeat(10));
  });

  it('fenetre-autour-de-la-correspondance', () => {
    const texte = `${'aaaa '.repeat(30)}cible ${'bbbb '.repeat(30)}`;
    const r = extrait(texte, ['cible'], false, 40);
    expect(r).toContain('<mark>cible</mark>');
    expect([...sansMark(r)].length).toBeLessThanOrEqual(40);
    expect(sansMark(r).startsWith('a') || sansMark(r).startsWith('c')).toBe(true);
  });

  it('points-de-code-non-coupes', () => {
    const r = extrait('😀😀 mot 😀😀', ['mot'], false, 5);
    expect(r).toContain('<mark>mot</mark>');
    expect(r).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('tri-score-date-id', () => {
    const entree = [
      { score: 1, date: '2026-01-01', id: 'b' },
      { score: 2, date: '2026-01-01', id: 'c' },
      { score: 1, date: '2026-02-01', id: 'z' },
      { score: 1, date: '2026-01-01', id: 'a' },
    ];
    const copie = structuredClone(entree);
    expect(trier(entree).map((r) => r.id)).toEqual(['c', 'z', 'a', 'b']);
    expect(entree).toEqual(copie);
  });

  it('pagination-curseur-et-curseur-invalide', () => {
    const liste = [1, 2, 3, 4, 5];
    const p1 = paginer(liste, { limite: 2 });
    expect(p1.elements).toEqual([1, 2]);
    const p2 = paginer(liste, { limite: 2, curseur: p1.curseurSuivant });
    expect(p2.elements).toEqual([3, 4]);
    const p3 = paginer(liste, { limite: 2, curseur: p2.curseurSuivant });
    expect(p3).toEqual({ elements: [5] });
    expect(paginer([], { limite: 2 })).toEqual({ elements: [] });
    expect(paginer([1, 2], { limite: 2 })).toEqual({ elements: [1, 2] });
    expect(p1.curseurSuivant).toMatch(/^[A-Za-z0-9_-]+$/);
    const enc = (s: string): string => Buffer.from(s).toString('base64url');
    for (const mauvais of ['%%%', 'abc', enc('x'), enc('{}'), enc('{"d":-1}'), enc('{"d":1.5}'), enc('{"d":99}'), enc('{"d":"1"}')]) {
      expect(code(() => paginer(liste, { limite: 2, curseur: mauvais }))).toBe('curseur_invalide');
    }
    expect(code(() => paginer(liste, { limite: 2, curseur: '' }))).toBe('curseur_invalide');
    for (const limite of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => paginer(liste, { limite }))).toBe('limite_invalide');
    }
  });

  it('groupes-cinq-par-type', () => {
    const liste = Array.from({ length: 12 }, (_, i) => ({ type: i % 2 === 0 ? 'facture' : 'client', i }));
    const g = grouper(liste, 5);
    expect(g.get('facture')?.map((x) => x.i)).toEqual([0, 2, 4, 6, 8]);
    expect(g.get('client')?.map((x) => x.i)).toEqual([1, 3, 5, 7, 9]);
    expect(grouper([] as { type: string }[], 5).size).toBe(0);
    expect(code(() => grouper(liste, 0))).toBe('limite_invalide');
  });
});
