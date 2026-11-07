import { describe, expect, it } from 'vitest';
import { ErreurCsv, ligneDeTotal, lireCsv } from '../csv.js';

function code(action: () => unknown): { code?: string; message?: string } {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurCsv ? { code: e.code, message: e.message } : { code: 'autre' };
  }
  return {};
}

const L = (rang: number, ...cellules: string[]) => ({ rang, cellules });

describe('lecture d’un CSV', () => {
  it('trois-lignes-point-virgule', () => {
    const r = lireCsv('date;libelle;montant\n01/02/2026;Achat fictif;12,50\n02/02/2026;Vente fictive;\n03/02/2026;;3\n', ';');
    expect(r.entete).toEqual(['date', 'libelle', 'montant']);
    expect(r.lignes).toEqual([L(1, '01/02/2026', 'Achat fictif', '12,50'), L(2, '02/02/2026', 'Vente fictive', ''), L(3, '03/02/2026', '', '3')]);
    expect(r.rejets).toEqual([]);
    const fins = lireCsv('a,b\r\n1,2\r3,4\n5,6', ',');
    expect(fins.lignes).toEqual([L(1, '1', '2'), L(2, '3', '4'), L(3, '5', '6')]);
    expect(lireCsv('a\tb\n1\t2', '\t').lignes).toEqual([L(1, '1', '2')]);
    const vides = lireCsv('a;b\n\n  \n1;2\n\n', ';');
    expect(vides.lignes).toEqual([L(3, '1', '2')]);
    expect(vides.rejets).toEqual([]);
    expect(lireCsv('a;b\n1;2\n1;2', ';').lignes).toEqual([L(1, '1', '2'), L(2, '1', '2')]);
    expect(lireCsv('a\n1\n2', ';')).toEqual({ entete: ['a'], lignes: [L(1, '1'), L(2, '2')], rejets: [] });
    expect(lireCsv('a,b\n1,2', ';')).toEqual({ entete: ['a,b'], lignes: [L(1, '1,2')], rejets: [] });
  });

  it('guillemets-et-separateur-interne', () => {
    const r = lireCsv('a;b\n"x;y";"dit ""oui"""\n"";"a""b"\nz"q;w', ';');
    expect(r.lignes).toEqual([L(1, 'x;y', 'dit "oui"'), L(2, '', 'a"b'), L(3, 'z"q', 'w')]);
    expect(lireCsv('"a;1";b\n1;2', ';').entete).toEqual(['a;1', 'b']);
    expect(lireCsv('a;b\n1;"2"x', ';').lignes).toEqual([L(1, '1', '2x')]);
  });

  it('retour-ligne-dans-guillemets', () => {
    const r = lireCsv('a;b\n"l1\nl2";x\n"c\r\nd";y\n5;6', ';');
    expect(r.lignes).toEqual([L(1, 'l1\nl2', 'x'), L(3, 'c\r\nd', 'y'), L(5, '5', '6')]);
    expect(r.rejets).toEqual([]);
  });

  it('en-tete-seul-zero-ligne', () => {
    expect(lireCsv('a;b;c', ';')).toEqual({ entete: ['a', 'b', 'c'], lignes: [], rejets: [] });
    expect(lireCsv('a;b;c\n\n', ';').lignes).toEqual([]);
    expect(lireCsv('', ';')).toEqual({ entete: [], lignes: [], rejets: [] });
    expect(lireCsv('\n \n', ';')).toEqual({ entete: [], lignes: [], rejets: [] });
    expect(lireCsv('seul', ';')).toEqual({ entete: ['seul'], lignes: [], rejets: [] });
    expect(code(() => lireCsv('', ';', 1)).code).toBe('entete_invalide');
  });

  it('colonnes-en-trop-rejet-numerote', () => {
    const r = lireCsv('a;b\n1;2\n3;4;5\n6\n\n7;8', ';');
    expect(r.lignes).toEqual([L(1, '1', '2'), L(5, '7', '8')]);
    expect(r.rejets).toEqual([
      { rang: 2, brut: '3;4;5', motif: 'nombre_de_colonnes' },
      { rang: 3, brut: '6', motif: 'nombre_de_colonnes' },
    ]);
    expect(r.lignes.length + r.rejets.length).toBe(4);
  });

  it('guillemet-non-ferme-rejet', () => {
    const r = lireCsv('a;b\n1;2\n3;"4\n5;6', ';');
    expect(r.lignes).toEqual([L(1, '1', '2')]);
    expect(r.rejets).toEqual([{ rang: 2, brut: '3;"4\n5;6', motif: 'guillemet_non_ferme' }]);
    expect(code(() => lireCsv('"a;b\n1;2', ';')).code).toBe('entete_invalide');
  });

  it('ligne-de-total-mise-a-part', () => {
    const lignes = [L(1, '01/02/2026', 'Achat', '5'), L(2, '', ' TOTAL des mouvements', '5')];
    expect(ligneDeTotal(lignes)).toEqual({ lignes: [lignes[0]], total: lignes[1] });
    expect(ligneDeTotal([L(1, 'TOTALE', '1')]).total).toEqual(L(1, 'TOTALE', '1'));
    expect(ligneDeTotal([L(1, '01/02/2026', 'Total carte', '5')])).toEqual({ lignes: [L(1, '01/02/2026', 'Total carte', '5')], total: null });
    expect(ligneDeTotal([L(1, '20260201', 'Total', '5')]).total).toBeNull();
    expect(ligneDeTotal([L(1, 'Total', '5'), L(2, 'Achat', '5')]).total).toBeNull();
    expect(ligneDeTotal([L(1, 'Subtotal', '5')]).total).toBeNull();
    expect(ligneDeTotal([])).toEqual({ lignes: [], total: null });
    const r = lireCsv('a;b\n1;2\nTotal;3', ';');
    expect(ligneDeTotal(r.lignes).lignes).toEqual([L(1, '1', '2')]);
  });

  it('titre-avant-en-tete', () => {
    const texte = 'Relevé fictif\n\ndate;montant\n01/02/2026;5\n';
    const r = lireCsv(texte, ';', 1);
    expect(r.entete).toEqual(['date', 'montant']);
    expect(r.lignes).toEqual([L(1, '01/02/2026', '5')]);
    expect(lireCsv(texte, ';').entete).toEqual(['Relevé fictif']);
    expect(lireCsv('t\nh;i\n1;2', ';', 1).lignes).toEqual([L(1, '1', '2')]);
    for (const n of [-1, Number.NaN, Infinity, 1.5, 3, 99]) {
      expect(code(() => lireCsv('a;b\n1;2', ';', n)).code).toBe('entete_invalide');
    }
    for (const s of ['', ';;', '"', '\n', 'x']) expect(code(() => lireCsv('a', s as ';')).code).toBe('separateur_invalide');
    const secret = code(() => lireCsv('a;b\n1;2', ';', 7));
    expect(secret.message).toBe('entete_invalide');
  });
});
