import { describe, expect, it } from 'vitest';
import { ErreurExploitation } from '../../exploitation/types.js';
import { arborescence, cheminPiece, indexPieces } from '../arborescence.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurExploitation ? e.code : 'autre';
  }
  return undefined;
}

const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);
const piece = (id: string, empreinte: string, ecritures: string[], extension = 'pdf', recueLe = '2026-03-10') => ({
  id,
  empreinte,
  recueLe,
  extension,
  ecritures,
});
const base = { exercices: [{ code: '2026', fecNom: 'fec-2026.txt' }], pieces: [], avecConversations: true, avecParametrages: true };

describe('arborescence export complet', () => {
  it('chemin-piece-par-empreinte-et-mois', () => {
    expect(cheminPiece({ empreinte: H1, recueLe: '2026-03-10', extension: 'pdf' })).toBe(`pieces/2026/03/${H1}.pdf`);
    expect(cheminPiece({ empreinte: H2, recueLe: '2025-12-31', extension: 'png' })).toBe(`pieces/2025/12/${H2}.png`);
    expect(code(() => cheminPiece({ empreinte: 'xyz', recueLe: '2026-03-10', extension: 'pdf' }))).toBe('empreinte_invalide');
    for (const d of ['2026-02-30', '2026-3-1', '']) {
      expect(code(() => cheminPiece({ empreinte: H1, recueLe: d, extension: 'pdf' }))).toBe('date_invalide');
    }
  });

  it('extension-normalisee-ou-refusee', () => {
    expect(cheminPiece({ empreinte: H1, recueLe: '2026-03-10', extension: 'PDF' }).endsWith('.pdf')).toBe(true);
    for (const e of ['p d f', '../x', 'abcdefghi', '', 'pd.f']) {
      expect(code(() => cheminPiece({ empreinte: H1, recueLe: '2026-03-10', extension: e }))).toBe('chemin_invalide');
    }
    expect(cheminPiece({ empreinte: H1, recueLe: '2026-03-10', extension: 'abcdefgh' }).endsWith('.abcdefgh')).toBe(true);
  });

  it('meme-empreinte-un-seul-fichier-deux-lignes', () => {
    const pieces = [piece('p2', H1, ['e2']), piece('p1', H1, ['e1'])];
    const lignes = indexPieces(pieces);
    expect(lignes).toHaveLength(2);
    expect(new Set(lignes.map((l) => l.chemin)).size).toBe(1);
    const a = arborescence({ ...base, pieces });
    expect(a.filter((c) => c.startsWith('pieces/') && c !== 'pieces/index.csv')).toHaveLength(1);
  });

  it('meme-empreinte-dates-et-extensions-differentes', () => {
    const pieces = [
      piece('p3', H1, ['e3'], 'jpg', '2026-03-10'),
      piece('p2', H1, ['e2'], 'pdf', '2026-04-01'),
      piece('p1', H1, ['e1'], 'pdf', '2026-03-10'),
      piece('p0', H1, ['e0'], 'pdf', '2026-03-10'),
    ];
    const chemin = `pieces/2026/03/${H1}.pdf`;
    expect(indexPieces(pieces)).toEqual([
      { chemin, pieceId: 'p0', ecritures: 'e0' },
      { chemin, pieceId: 'p1', ecritures: 'e1' },
      { chemin, pieceId: 'p2', ecritures: 'e2' },
      { chemin, pieceId: 'p3', ecritures: 'e3' },
    ]);
    expect(arborescence({ ...base, pieces }).filter((c) => c.startsWith('pieces/') && c !== 'pieces/index.csv')).toEqual([chemin]);
    const b = indexPieces([piece('b', H1, []), piece('a', H1, [])]);
    expect(b.map((l) => l.pieceId)).toEqual(['a', 'b']);
    expect(indexPieces([piece('x', H2, ['e1']), piece('y', H1, ['e1'])]).map((l) => l.pieceId)).toEqual(['y', 'x']);
    expect(code(() => cheminPiece({ empreinte: H1, recueLe: '2026-03-10', extension: 5 as unknown as string }))).toBe('chemin_invalide');
    expect(code(() => indexPieces([piece('p', H1, ['e1|e2'])]))).toBe('chemin_invalide');
  });

  it('index-trie-et-ecritures-triees', () => {
    const lignes = indexPieces([piece('p1', H2, ['e9', 'e10', 'e1']), piece('p2', H1, ['e3'])]);
    expect(lignes).toEqual([
      { chemin: `pieces/2026/03/${H1}.pdf`, pieceId: 'p2', ecritures: 'e3' },
      { chemin: `pieces/2026/03/${H2}.pdf`, pieceId: 'p1', ecritures: 'e1|e10|e9' },
    ]);
    const entree = ['e2', 'e1'];
    indexPieces([piece('p', H1, entree)]);
    expect(entree).toEqual(['e2', 'e1']);
  });

  it('arborescence-complete-triee', () => {
    const a = arborescence({
      ...base,
      exercices: [{ code: '2026', fecNom: 'fec-2026.txt' }, { code: '2025', fecNom: 'fec-2025.txt' }],
      pieces: [piece('p1', H1, ['e1'])],
    });
    expect(a).toEqual([
      'LISEZMOI.txt',
      'comptable/balance.csv',
      'comptable/grand-livre.csv',
      'comptable/journaux.csv',
      'conversations/conversations.txt',
      'fec/fec-2025.txt',
      'fec/fec-2026.txt',
      'parametrages/fournisseurs.jsonl',
      'parametrages/memoire.jsonl',
      'parametrages/modeles.jsonl',
      'parametrages/regles.jsonl',
      `pieces/2026/03/${H1}.pdf`,
      'pieces/index.csv',
    ]);
    expect(a).toEqual([...a].sort());
    expect(code(() => arborescence({ ...base, exercices: [{ code: '1', fecNom: 'x.txt' }, { code: '2', fecNom: 'x.txt' }] }))).toBe('chemin_en_double');
  });

  it('options-retirent-conversations-et-parametrages', () => {
    const a = arborescence({ ...base, avecConversations: false, avecParametrages: false });
    expect(a.some((c) => c.startsWith('conversations/') || c.startsWith('parametrages/'))).toBe(false);
    expect(a).toContain('LISEZMOI.txt');
    expect(a).toContain('pieces/index.csv');
    expect(arborescence({ ...base, avecParametrages: false })).toContain('conversations/conversations.txt');
    expect(arborescence({ ...base, avecConversations: false })).toContain('parametrages/regles.jsonl');
  });

  it('fec-nom-dangereux-refuse', () => {
    for (const n of ['.', '  ', '..', 'ab', '../a.txt', 'a/b', 'a\\b', '', 'a..b', `a${String.fromCharCode(0)}b`, `a${String.fromCharCode(10)}b`]) {
      expect(code(() => arborescence({ ...base, exercices: [{ code: '2026', fecNom: n }] }))).toBe('chemin_invalide');
    }
    expect(code(() => arborescence({ ...base, exercices: [{ code: '2026', fecNom: 'fec.v2.txt' }] }))).toBeUndefined();
  });

  it('aucune-piece-index-vide', () => {
    expect(indexPieces([])).toEqual([]);
    const a = arborescence(base);
    expect(a.filter((c) => c.startsWith('pieces/'))).toEqual(['pieces/index.csv']);
    expect(arborescence({ ...base, exercices: [] }).some((c) => c.startsWith('fec/'))).toBe(false);
  });
});
