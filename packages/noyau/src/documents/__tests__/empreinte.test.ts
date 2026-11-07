import { describe, expect, it } from 'vitest';
import {
  empreinteSha256,
  ErreurDocument,
  lireManifeste,
  manifeste,
  verifierManifeste,
} from '../empreinte.js';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurDocument);
    return (e as ErreurDocument).code;
  }
  return undefined;
}

describe('empreinte', () => {
  it('vecteur-connu-abc', () => {
    expect(empreinteSha256('abc')).toBe(ABC);
    expect(empreinteSha256('')).toMatch(/^e3b0c442/);
    expect(empreinteSha256(new Uint8Array(0))).toMatch(/^e3b0c442/);
  });

  it('chaine-et-octets-identiques', () => {
    expect(empreinteSha256(new Uint8Array([97, 98, 99]))).toBe(ABC);
    expect(empreinteSha256('é')).toBe(empreinteSha256(new Uint8Array([195, 169])));
  });

  it('manifeste-trie-par-nom', () => {
    const a = { nom: 'a.txt', octets: 'abc' };
    const b = { nom: 'b.txt', octets: '' };
    const attendu = `${ABC}  a.txt\n${empreinteSha256('')}  b.txt\n`;
    expect(manifeste([a, b])).toBe(attendu);
    expect(manifeste([b, a])).toBe(attendu);
    expect(manifeste([])).toBe('');
  });

  it('manifeste-recalcule-identique', () => {
    const fichiers = [
      { nom: 'fec 2026.txt', octets: 'ligne' },
      { nom: 'vide', octets: new Uint8Array(0) },
    ];
    const texte = manifeste(fichiers);
    expect(verifierManifeste(texte, fichiers)).toEqual({
      ok: true,
      manquants: [],
      modifies: [],
      enTrop: [],
    });
    expect(verifierManifeste(texte.slice(0, -1), fichiers).ok).toBe(true);
    expect(lireManifeste(texte)).toEqual([
      { nom: 'fec 2026.txt', sha256: empreinteSha256('ligne') },
      { nom: 'vide', sha256: empreinteSha256('') },
    ]);
    expect(lireManifeste('')).toEqual([]);
    const sep = [{ nom: 'a\u2028b', octets: '' }];
    expect(verifierManifeste(manifeste(sep), sep).ok).toBe(true);
    expect(verifierManifeste('', []).ok).toBe(true);
  });

  it('fichier-modifie-detecte', () => {
    const a = { nom: 'a', octets: new Uint8Array([1, 2, 3]) };
    const a2 = { nom: 'a', octets: new Uint8Array([1, 2, 4]) };
    const [b, c, d] = [
      { nom: 'b', octets: 'x' },
      { nom: 'c', octets: 'y' },
      { nom: 'd', octets: 'z' },
    ];
    const res = (p: object) => ({ ok: false, manquants: [], modifies: [], enTrop: [], ...p });
    const texte = manifeste([a, b, c]);
    expect(verifierManifeste(texte, [a2, b, c])).toEqual(res({ modifies: ['a'] }));
    expect(verifierManifeste(texte, [a, c])).toEqual(res({ manquants: ['b'] }));
    expect(verifierManifeste(texte, [a, b, c, d])).toEqual(res({ enTrop: ['d'] }));
    expect(verifierManifeste(texte, [a2, c, d])).toEqual(
      res({ manquants: ['b'], modifies: ['a'], enTrop: ['d'] }),
    );
    expect(verifierManifeste(texte, []).manquants).toEqual(['a', 'b', 'c']);
    const h = empreinteSha256('');
    const nonTrie = `${h}  b\n${h}  a\n`;
    expect(verifierManifeste(nonTrie, []).manquants).toEqual(['a', 'b']);
  });

  it('nom-en-double-refuse', () => {
    expect(
      codeErreur(() =>
        manifeste([
          { nom: 'a', octets: '1' },
          { nom: 'a', octets: '2' },
        ]),
      ),
    ).toBe('nom_en_double');
    const dupli = `${ABC}  a\n${ABC}  a\n`;
    expect(codeErreur(() => lireManifeste(dupli))).toBe('manifeste_illisible');
  });

  it('nom-avec-barre-refuse', () => {
    for (const nom of ['', 'a/b', 'a\\b', 'a\nb', 'a\rb']) {
      expect(codeErreur(() => manifeste([{ nom, octets: '' }]))).toBe('nom_invalide');
    }
    expect(codeErreur(() => manifeste([{ nom: ' a b ', octets: '' }]))).toBeUndefined();
  });

  it('manifeste-illisible-refuse', () => {
    const mauvaises = [
      'abc  a\n',
      `${ABC} a\n`,
      `${ABC}  \n`,
      `${ABC.toUpperCase()}  a\n`,
      `${ABC}  a\n\n${ABC}  b\n`,
      `${ABC}  a/b\n`,
      `${ABC}  a\r\n`,
    ];
    for (const m of mauvaises) {
      expect(codeErreur(() => lireManifeste(m))).toBe('manifeste_illisible');
    }
  });
});
