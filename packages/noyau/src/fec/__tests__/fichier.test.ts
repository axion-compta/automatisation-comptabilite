import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurFichierFec, type OptionsFichierFec, fichierFec, texteFec } from '../fichier.js';
import type { ResultatLignesFec } from '../lignes.js';

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;

const options: OptionsFichierFec = { finDeLigne: CRLF, marqueOrdreOctets: false, finDeLigneFinale: true };

function resultat(entete: string, lignes: string[]): ResultatLignesFec {
  return { entete, lignes, totalDebit: centimes(0), totalCredit: centimes(0) };
}

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurFichierFec ? e.code : 'autre';
  }
  return undefined;
}

describe('fichier FEC en octets', () => {
  it('octets-exacts-petit-fichier', () => {
    const r = resultat('A|B|C', ['x|y|z', '1|2|3']);
    const attendu = [
      0x41, 0x7c, 0x42, 0x7c, 0x43, 0x0d, 0x0a, 0x78, 0x7c, 0x79, 0x7c, 0x7a, 0x0d, 0x0a, 0x31, 0x7c, 0x32,
      0x7c, 0x33, 0x0d, 0x0a,
    ];
    expect(Array.from(fichierFec(r, options))).toEqual(attendu);
    const sansFinale = fichierFec(r, { ...options, finDeLigne: LF, finDeLigneFinale: false });
    expect(Array.from(sansFinale)).toEqual([
      0x41, 0x7c, 0x42, 0x7c, 0x43, 0x0a, 0x78, 0x7c, 0x79, 0x7c, 0x7a, 0x0a, 0x31, 0x7c, 0x32, 0x7c, 0x33,
    ]);
  });

  it('marque-ordre-en-tete', () => {
    const octets = fichierFec(resultat('A', ['b']), { ...options, marqueOrdreOctets: true });
    expect(Array.from(octets.slice(0, 4))).toEqual([0xef, 0xbb, 0xbf, 0x41]);
    expect(octets).toHaveLength(3 + 1 + 2 + 1 + 2);
  });

  it('sans-marque-premier-octet-en-tete', () => {
    const octets = fichierFec(resultat('A', ['b']), options);
    expect(octets[0]).toBe(0x41);
    expect(octets).toHaveLength(1 + 2 + 1 + 2);
  });

  it('aucune-ligne-vide', () => {
    expect(code(() => texteFec(resultat('A', ['']), options))).toBe('ligne_vide');
    expect(code(() => texteFec(resultat('', ['a']), options))).toBe('ligne_vide');
    expect(code(() => texteFec(resultat('A', ['a', '', 'b']), options))).toBe('ligne_vide');
    expect(code(() => texteFec(resultat('A', ['a' + LF + 'b']), options))).toBe('ligne_avec_fin_de_ligne');
    expect(code(() => texteFec(resultat('A', ['a' + CR]), options))).toBe('ligne_avec_fin_de_ligne');
    expect(code(() => fichierFec(resultat('A', ['']), options))).toBe('ligne_vide');
    expect(texteFec(resultat('A', ['a', 'b']), options)).toBe('A' + CRLF + 'a' + CRLF + 'b' + CRLF);
  });

  it('fin-de-ligne-finale-optionnelle', () => {
    const r = resultat('A', ['b']);
    expect(texteFec(r, options)).toBe('A' + CRLF + 'b' + CRLF);
    expect(texteFec(r, { ...options, finDeLigneFinale: false })).toBe('A' + CRLF + 'b');
    // jeu sans mouvement : l'en-tête seul
    expect(texteFec(resultat('A|B', []), options)).toBe('A|B' + CRLF);
    expect(texteFec(resultat('A|B', []), { ...options, finDeLigneFinale: false })).toBe('A|B');
    expect(Array.from(fichierFec(resultat('A', []), options))).toEqual([0x41, 0x0d, 0x0a]);
  });

  it('meme-entree-memes-octets', () => {
    const r = resultat('Journal|Libellé', ['AC|Éé ç 😀', 'AC|Autre']);
    const o = { ...options, marqueOrdreOctets: true };
    const a = fichierFec(r, o);
    const b = fichierFec(r, o);
    expect(a).not.toBe(b);
    expect(Array.from(a)).toEqual(Array.from(b));
    // accents sur 2 octets, caractère hors plan de base sur 4 octets
    expect(Array.from(fichierFec(resultat('é', []), options))).toEqual([0xc3, 0xa9, 0x0d, 0x0a]);
    expect(Array.from(fichierFec(resultat('ç', []), options))).toEqual([0xc3, 0xa7, 0x0d, 0x0a]);
    expect(Array.from(fichierFec(resultat('😀', []), options))).toEqual([0xf0, 0x9f, 0x98, 0x80, 0x0d, 0x0a]);
  });

  it('fin-de-ligne-invalide-refusee', () => {
    const r = resultat('A', ['b']);
    for (const finDeLigne of [CR, '', ' ', LF + LF, LF + CR, CRLF + CRLF, 'x']) {
      expect(code(() => texteFec(r, { ...options, finDeLigne }))).toBe('option_invalide');
      expect(code(() => fichierFec(r, { ...options, finDeLigne }))).toBe('option_invalide');
    }
    const partielles: unknown[] = [
      {},
      { finDeLigne: CRLF },
      { finDeLigne: CRLF, marqueOrdreOctets: true },
      { finDeLigne: CRLF, finDeLigneFinale: true },
      { marqueOrdreOctets: true, finDeLigneFinale: true },
      { finDeLigne: CRLF, marqueOrdreOctets: 'oui', finDeLigneFinale: true },
      { finDeLigne: CRLF, marqueOrdreOctets: true, finDeLigneFinale: 1 },
      undefined,
      null,
    ];
    for (const p of partielles) {
      expect(code(() => texteFec(r, p as never))).toBe('option_invalide');
      expect(code(() => fichierFec(r, p as never))).toBe('option_invalide');
    }
    expect(code(() => texteFec(r, { ...options, finDeLigne: LF }))).toBeUndefined();
  });
});
