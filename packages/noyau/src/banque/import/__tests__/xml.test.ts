import { describe, expect, it } from 'vitest';
import { ErreurXml, lireXml, trouver, trouverTous, type NoeudXml } from '../xml.js';

const LIM = { profondeurMax: 64, noeudsMax: 1000 };

function code(texte: string, limites = LIM): string | undefined {
  try {
    lireXml(texte, limites);
  } catch (e) {
    if (e instanceof ErreurXml) {
      expect(e.message).toBe(e.code);
      return e.code;
    }
    return 'autre';
  }
  return undefined;
}

const n = (nom: string, texte = '', enfants: NoeudXml[] = [], attributs: Record<string, string> = {}): NoeudXml => ({ nom, attributs, enfants, texte });

describe('lecteur XML minimal et sûr', () => {
  it('arbre-simple', () => {
    const racine = lireXml('<?xml version="1.0"?>\n<a id="1" k=\'v&amp;w\'>\n  <b>un</b>\n  <b> deux </b>\n  <c/><d x="1"></d>\n</a>', LIM);
    expect(racine).toEqual(n('a', '', [n('b', 'un'), n('b', 'deux'), n('c'), n('d', '', [], { x: '1' })], { id: '1', k: 'v&w' }));
    expect(lireXml('<a/>', LIM)).toEqual(n('a'));
    expect(lireXml('\uFEFF  <a>x</a>  \n', LIM)).toEqual(n('a', 'x'));
    expect(lireXml('<a>x<b/>y</a>', LIM).texte).toBe('xy');
    expect(lireXml('<a><b><c>z</c></b><b/></a>', LIM)).toEqual(n('a', '', [n('b', '', [n('c', 'z')]), n('b')]));
    const doc = lireXml('<a><b><c>1</c></b><b><c>2</c><d/></b><c>3</c></a>', LIM);
    expect(trouver(doc, ['b', 'c'])?.texte).toBe('1');
    expect(trouver(doc, ['b', 'd'])?.nom).toBe('d');
    expect(trouver(doc, ['b', 'x'])).toBeUndefined();
    expect(trouver(doc, ['x', 'c'])).toBeUndefined();
    expect(trouver(doc, [])).toBe(doc);
    expect(trouverTous(doc, 'c').map((x) => x.texte)).toEqual(['1', '2', '3']);
    expect(trouverTous(doc, 'a')).toEqual([]);
    for (const t of ['', '   ', 'texte', '<a>', '<a/><b/>', '<a/>x', '<a b/>', '<a b=c/>', '<a b="1" b="2"/>', '<a b="<"/>', '<1a/>', '<a><</a>', '<a></a', '</a>', '<a/', '<a b="1', '<a:/>']) {
      expect(code(t), t).toBe('xml_invalide');
    }
  });

  it('prefixes-retires', () => {
    const racine = lireXml('<ns1:Doc xmlns:ns1="urn:fictif" xmlns="urn:autre"><ns2:Ntry ns2:id="7">x</ns2:Ntry><Ntry/></ns1:Doc>', LIM);
    expect(racine.nom).toBe('Doc');
    expect(racine.attributs).toEqual({ 'xmlns:ns1': 'urn:fictif', xmlns: 'urn:autre' });
    expect(racine.enfants.map((e) => e.nom)).toEqual(['Ntry', 'Ntry']);
    expect(racine.enfants[0]?.attributs).toEqual({ 'ns2:id': '7' });
    expect(trouverTous(racine, 'Ntry')).toHaveLength(2);
    expect(code('<a:b></a:c>')).toBe('xml_invalide');
    expect(code('<a:b></b>')).toBe('xml_invalide');
  });

  it('entites-predefinies-et-numeriques', () => {
    expect(lireXml('<a>&lt;&gt;&amp;&quot;&apos;</a>', LIM).texte).toBe('<>&"\'');
    expect(lireXml('<a>&#233;&#xE9;&#x1F600;&#65;</a>', LIM).texte).toBe('éé\u{1F600}A');
    expect(lireXml('<a v="&lt;&#x41;"/>', LIM).attributs).toEqual({ v: '<A' });
    expect(lireXml('<a>&amp;lt;</a>', LIM).texte).toBe('&lt;');
    for (const e of ['&x;', '&;', '&', '&amp', '&#;', '&#x;', '&#0;', '&#x0;', '&#xFFFFFFFF;', '&#1114112;', '&#xD800;', '&#1;', '&#xg;', '&#-1;', '&LT;', '&#12345678;', '&#x110000;']) {
      expect(code(`<a>${e}</a>`), e).toBe('entite_inconnue');
    }
    expect(code('<a v="&x;"/>')).toBe('entite_inconnue');
    expect(lireXml('<a>&#9;&#xA;&#13;&#x10FFFF;</a>', LIM).texte).toBe('\u{10FFFF}');
  });

  it('cdata-et-commentaires', () => {
    expect(lireXml('<a><!-- <b/> --><![CDATA[<x> & &amp; ]]>fin<!--c--></a>', LIM)).toEqual(n('a', '<x> & &amp; fin'));
    expect(lireXml('<!-- avant --><a/><!-- après -->', LIM)).toEqual(n('a'));
    expect(lireXml('<a><![CDATA[]]></a>', LIM).texte).toBe('');
    for (const t of ['<a><!-- ouvert</a>', '<a><![CDATA[ouvert</a>', '<![CDATA[x]]><a/>', '<a><!x></a>', '<a><?pi</a>']) {
      expect(code(t), t).toBe('xml_invalide');
    }
    expect(lireXml('<a><?pi x?></a>', LIM)).toEqual(n('a'));
  });

  it('doctype-refuse', () => {
    expect(code('<!DOCTYPE a><a/>')).toBe('doctype_refuse');
    expect(code('<?xml version="1.0"?><!DOCTYPE a [ ]><a/>')).toBe('doctype_refuse');
    expect(code('<a><!doctype a></a>')).toBe('doctype_refuse');
    expect(code('<a/><!ENTITY x "y">')).toBe('doctype_refuse');
    expect(code('<a><!-- <!DOCTYPE a> --></a>')).toBe('doctype_refuse');
    expect(code('<a><![CDATA[<!ENTITY]]></a>')).toBe('doctype_refuse');
  });

  it('entite-externe-refusee', () => {
    const piege = '<?xml version="1.0"?>\n<!DOCTYPE a [<!ENTITY x SYSTEM "file:///fichier-fictif">]>\n<a>&x;</a>';
    expect(code(piege)).toBe('doctype_refuse');
    expect(code('<a>&x;</a>')).toBe('entite_inconnue');
    expect(code('<!ENTITY x SYSTEM "http://exemple.fr/x"><a>&x;</a>')).toBe('doctype_refuse');
  });

  it('bombe-d-entites-refusee', () => {
    const lol = '<!DOCTYPE lol [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;">]><lol>&c;</lol>';
    expect(code(lol)).toBe('doctype_refuse');
    expect(code('<lol>&c;&c;</lol>')).toBe('entite_inconnue');
    expect(code(`<a>${'&amp;'.repeat(5000)}</a>`)).toBeUndefined();
    expect(lireXml(`<a>${'&amp;'.repeat(5000)}</a>`, LIM).texte).toHaveLength(5000);
  });

  it('trop-profond-refuse', () => {
    const imbrique = (p: number): string => '<a>'.repeat(p) + '</a>'.repeat(p);
    expect(code(imbrique(64))).toBeUndefined();
    expect(code(imbrique(65))).toBe('trop_profond');
    expect(code(imbrique(3), { profondeurMax: 2, noeudsMax: 10 })).toBe('trop_profond');
    expect(code(imbrique(2), { profondeurMax: 2, noeudsMax: 10 })).toBeUndefined();
    expect(code(imbrique(1), { profondeurMax: 1, noeudsMax: 10 })).toBeUndefined();
    expect(code('<a><b/><b/><b/></a>', { profondeurMax: 5, noeudsMax: 4 })).toBeUndefined();
    expect(code('<a><b/><b/><b/><b/></a>', { profondeurMax: 5, noeudsMax: 4 })).toBe('trop_de_noeuds');
    expect(code('<a>' + '<b/>'.repeat(50) + '</a>', { profondeurMax: 5, noeudsMax: 50 })).toBe('trop_de_noeuds');
    const profond = 100000;
    expect(code('<a>'.repeat(profond), { profondeurMax: 1e6, noeudsMax: 1e6 })).toBe('xml_invalide');
    const racine = lireXml(imbrique(profond), { profondeurMax: 1e6, noeudsMax: 1e6 });
    expect(trouverTous(racine, 'a')).toHaveLength(profond - 1);
    for (const v of [Number.NaN, Infinity, -Infinity, 0, -1, 1.5, 2 ** 53]) {
      expect(code('<a/>', { profondeurMax: v, noeudsMax: 10 }), String(v)).toBe('limites_invalides');
      expect(code('<a/>', { profondeurMax: 10, noeudsMax: v }), String(v)).toBe('limites_invalides');
    }
  });

  it('balises-croisees-refusees', () => {
    for (const t of ['<a><b></a></b>', '<a><b></b>', '<a></b>', '<a><b></a>', '<a></a></a>', '<a><b/></c>']) {
      expect(code(t), t).toBe('xml_invalide');
    }
    expect(code('<a><b></b></a>')).toBeUndefined();
    expect(code('<a>mon <secret-fictif></a>')).toBe('xml_invalide');
  });
});
