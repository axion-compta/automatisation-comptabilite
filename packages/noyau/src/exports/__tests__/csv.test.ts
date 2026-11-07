import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurCsv, ecrireCsv } from '../csv.js';
import type { ColonneCsv } from '../csv.js';
import { neutraliserTexte } from '../neutraliser.js';

const BOM = String.fromCodePoint(0xfeff);
const T: ColonneCsv = { code: 'lib', type: 'texte', entete: 'Libellé' };
const M: ColonneCsv = { code: 'mt', type: 'centimes', entete: 'Montant' };
const un = (valeur: unknown): string => ecrireCsv({ colonnes: [T], lignes: [{ lib: valeur }] }).split('\r\n')[1]!;

/** Petit analyseur CSV : champs entre guillemets (doublés) ou nus, « ; », CRLF. */
function analyser(s: string): string[][] {
  const sansBom = s.startsWith(BOM) ? s.slice(1) : s;
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let guillemets = false;
  for (let i = 0; i < sansBom.length; i++) {
    const c = sansBom[i]!;
    if (guillemets && c === '"' && sansBom[i + 1] === '"') {
      champ += c;
      i++;
    } else if (c === '"') {
      guillemets = !guillemets;
    } else if (guillemets) {
      champ += c;
    } else if (c === ';' || c === '\r') {
      ligne.push(champ);
      champ = '';
      if (c === '\r') {
        lignes.push(ligne);
        ligne = [];
        i++;
      }
    } else {
      champ += c;
    }
  }
  return lignes;
}

describe('écriture CSV', () => {
  it('bom-et-crlf', () => {
    const s = ecrireCsv({ colonnes: [T, M], lignes: [{ lib: 'a', mt: 5 }] });
    expect(s.startsWith(BOM + '"Libellé";"Montant"\r\n')).toBe(true);
    expect(s.endsWith('"a";0,05\r\n')).toBe(true);
    expect(s.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('point-virgule-dans-une-valeur-reste-dans-la-cellule', () => {
    expect(un('a;b')).toBe('"a;b"');
    expect(analyser(ecrireCsv({ colonnes: [T, M], lignes: [{ lib: 'a;b', mt: 1 }] }))[1]).toEqual(['a;b', '0,01']);
  });

  it('guillemet-double', () => {
    expect(un('dit "oui"')).toBe('"dit ""oui"""');
  });

  it('saut-de-ligne-dans-une-valeur-reste-dans-la-cellule', () => {
    expect(un('a\nb')).toBe('"a\nb"');
    expect(ecrireCsv({ colonnes: [T], lignes: [{ lib: 'a\r\nb' }] }).endsWith('"a\r\nb"\r\n')).toBe(true);
    expect(analyser(ecrireCsv({ colonnes: [T], lignes: [{ lib: 'a\nb' }] }))).toHaveLength(2);
  });

  it('formule-prefixee-puis-echappee', () => {
    expect(un('=1+1')).toBe('"\'=1+1"');
    expect(un('="x"')).toBe('"\'=""x"""');
    expect(un('@a')).toBe('"\'@a"');
    expect(un('a=1')).toBe('"a=1"');
  });

  it('entete-dangereux-neutralise', () => {
    const colonnes: ColonneCsv[] = [{ code: 'x', type: 'texte', entete: '=cmd' }];
    const s = ecrireCsv({
      colonnes,
      lignes: [],
      filtresRappeles: ['+filtre'],
      total: { etiquette: '-Total', colonne: 'x', valeurCentimes: centimes(0) },
    });
    expect(s).toBe(BOM + '"\'+filtre"\r\n"\'=cmd"\r\n"\'-Total";0,00\r\n');
    const t = ecrireCsv({
      colonnes: [T, M],
      lignes: [],
      total: { etiquette: '-Total', colonne: 'mt', valeurCentimes: centimes(0) },
    });
    expect(t.endsWith('"\'-Total";0,00\r\n')).toBe(true);
  });

  it('centimes-sans-milliers', () => {
    const lire = (n: number): string => ecrireCsv({ colonnes: [M], lignes: [{ mt: n }] }).split('\r\n')[1]!;
    expect(lire(123456789)).toBe('1234567,89');
    expect(lire(5)).toBe('0,05');
    expect(lire(0)).toBe('0,00');
    const autres: ColonneCsv[] = [
      { code: 'n', type: 'entier', entete: 'N' },
      { code: 'd', type: 'date', entete: 'D' },
    ];
    const l = ecrireCsv({ colonnes: autres, lignes: [{ n: 1234, d: '2025-03-07' }] }).split('\r\n')[1];
    expect(l).toBe('1234;07/03/2025');
  });

  it('negatif-non-prefixe', () => {
    const l = ecrireCsv({ colonnes: [M], lignes: [{ mt: -123456 }] }).split('\r\n')[1];
    expect(l).toBe('-1234,56');
  });

  it('liste-vide-entetes-et-total-zero', () => {
    const s = ecrireCsv({
      colonnes: [T, M],
      lignes: [],
      filtresRappeles: ['Période : 2025'],
      total: { etiquette: 'Total période', colonne: 'mt', valeurCentimes: centimes(0) },
    });
    expect(s).toBe(BOM + '"Période : 2025"\r\n"Libellé";"Montant"\r\n"Total période";0,00\r\n');
    expect(() => ecrireCsv({ colonnes: [T], lignes: [], total: { etiquette: 'x', colonne: 'zz', valeurCentimes: centimes(0) } })).toThrow(
      ErreurCsv,
    );
    expect(ecrireCsv({ colonnes: [T], lignes: [] })).toBe(BOM + '"Libellé"\r\n');
  });

  it('relecture-par-un-analyseur', () => {
    const morceaux = ['a', ';', '"', '\n', '\r\n', '=', '+', '-', '@', ' ', 'é', '\t', '＝', "'"];
    const lignes: Record<string, unknown>[] = [];
    for (let i = 0; i < 200; i++) {
      let v = '';
      for (let k = 0; k <= i % 6; k++) v += morceaux[(i * 7 + k * 3 + (i % 5)) % morceaux.length]!;
      lignes.push({ lib: v, mt: i * 1001 - 50000 });
    }
    const colonnes = [T, M];
    const total = { etiquette: 'Total', colonne: 'mt', valeurCentimes: centimes(-42) };
    const relu = analyser(ecrireCsv({ colonnes, lignes, total }));
    expect(relu).toHaveLength(202);
    lignes.forEach((l, i) => {
      expect(relu[i + 1]![0]).toBe(neutraliserTexte(l['lib'] as string));
      expect(relu[i + 1]![1]).toMatch(/^-?[0-9]+,[0-9]{2}$/);
    });
    expect(relu[201]).toEqual(['Total', '-0,42']);
  });
});
