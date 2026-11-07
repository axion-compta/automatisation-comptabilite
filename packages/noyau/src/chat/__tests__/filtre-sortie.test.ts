import { describe, expect, it } from 'vitest';
import { filtrerSortie } from '../filtre-sortie.js';

const SRC = '⟦voir_source⟧';
const LEX = '⟦lexique⟧';
const f = (t: string, lexique: readonly string[] = []) => filtrerSortie(t, { lexique });
const nb = (t: string, sorte: string, lexique: readonly string[] = []) =>
  f(t, lexique).retraits.find((r) => r.sorte === sorte)?.nombre;

describe('filtrerSortie', () => {
  it('lien-retire', () => {
    for (const u of ['http://a.exemple.fr/x?y=z', 'HTTPS://a.exemple.fr', 'javascript:alert', 'data:text/plain;base64,QQ']) {
      expect(f(`voir ${u} ici`).texte).toBe('voir  ici');
    }
    expect(nb('a http://x.fr b https://y.fr', 'lien')).toBe(2);
  });

  it('www-sans-protocole-retire', () => {
    expect(f('allez sur www.exemple.fr/page ok')).toEqual({ texte: 'allez sur  ok', retraits: [{ sorte: 'lien', nombre: 1 }] });
  });

  it('lien-markdown-garde-le-texte', () => {
    const r = f('un [guide utile](https://a.exemple.fr/g) ici');
    expect(r.texte).toBe('un guide utile ici');
    expect(r.retraits).toEqual([{ sorte: 'lien', nombre: 1 }]);
    expect(f('[x](y) et [z](w)').texte).toBe('x et z');
    expect(f('[[x](y)](evil.exemple.fr)').texte).toBe('x');
  });

  it('image-retiree', () => {
    const r = f('avant ![logo](https://a.exemple.fr/l.png) après');
    expect(r.texte).toBe('avant  après');
    expect(r.retraits).toEqual([{ sorte: 'image', nombre: 1 }]);
  });

  it('html-retire', () => {
    expect(f('a <b>gras</b> c').texte).toBe('a gras c');
    const r = f('x <script>\nalert(\n"a")\n</script> y');
    expect(r.texte).not.toMatch(/[<>]/);
    expect(r.texte).toContain('x');
    expect(r.texte).toContain('y');
    expect(f('<scr<script>ipt>alert(1)</scr</script>ipt>').texte).not.toMatch(/[<>]/);
    expect(f('<<b>img src=x onerror=y>').texte).not.toMatch(/[<>]/);
    expect(nb('<p a="1\n2">t</p>', 'html')).toBe(2);
  });

  it('email-retire', () => {
    const r = f('écrire à jeanne.test+x@exemple.fr svp');
    expect(r.texte).toBe('écrire à  svp');
    expect(r.retraits).toEqual([{ sorte: 'email', nombre: 1 }]);
  });

  it('montant-en-dur-retire', () => {
    expect(f('Total 1 250,00 € dû')).toEqual({ texte: `Total ${SRC} dû`, retraits: [{ sorte: 'chiffre', nombre: 1 }] });
    expect(f('de 12 à 30 jours').texte).toBe(`de ${SRC} à ${SRC} jours`);
    expect(f('1 250,5 et 1 000').texte).toBe(`${SRC} et ${SRC}`);
    expect(nb('3 puis 4', 'chiffre')).toBe(2);
  });

  it('chiffres-unicode-retires', () => {
    expect(f('code １２ ok').texte).toBe(`code ${SRC} ok`);
    expect(f('٣٤ et ५').texte).toBe(`${SRC} et ${SRC}`);
  });

  it('reference-intacte', () => {
    const t = 'voir {{ref:constat.champ_42}} et {{ref:ecr.total_1}}';
    expect(f(t)).toEqual({ texte: t, retraits: [] });
    const mal = f('{{ref:1 250,00 € http://evil.fr <b>x</b>}}').texte;
    expect(mal).not.toMatch(/[<>]|http|\d/);
    expect(f('{{ref:a1.b2}} vaut 5').texte).toBe(`{{ref:a1.b2}} vaut ${SRC}`);
  });

  it('lexique-remplace', () => {
    const lex = ['Zorglub', 'trucmuche'];
    const r = f('Le ZORGLUB et le trucmûché, zorglubes aussi', lex);
    expect(r.texte).toBe(`Le ${LEX} et le ${LEX}, zorglubes aussi`);
    expect(r.retraits).toEqual([{ sorte: 'lexique', nombre: 2 }]);
    expect(f('un Zorglub', ['Zorglub', '']).texte).toBe(`un ${LEX}`);
    expect(f('éléphant', ['ELEPHANT']).texte).toBe(LEX);
  });

  it('texte-vide-et-lexique-vide', () => {
    expect(f('')).toEqual({ texte: '', retraits: [] });
    expect(f('rien à signaler')).toEqual({ texte: 'rien à signaler', retraits: [] });
    expect(f('', ['zorglub'])).toEqual({ texte: '', retraits: [] });
  });

  it('entrées volumineuses : fin rapide', () => {
    const cas = ['[', '<', '![', '1 ', 'a@', 'http://', '{{ref:', 'a.'].map((m) => m.repeat(50000));
    const debut = Date.now();
    for (const c of cas) f(c, ['zorglub']);
    expect(Date.now() - debut).toBeLessThan(1000);
  });
});
