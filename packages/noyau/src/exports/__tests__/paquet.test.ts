import { describe, expect, it } from 'vitest';
import { empreinteSha256 as h, verifierManifeste } from '../../documents/empreinte.js';
import { composerPaquet, ErreurPaquet } from '../paquet.js';

const FMT = { separateurCsv: ';', finDeLigne: '\n' };
const enc = (t: string) => new TextEncoder().encode(t);
const piece = (ref: string, ecr: string[], nom = `${ref}.jpg`) => ({
  pieceRef: ref,
  ecritureIds: ecr,
  nom,
  octets: enc(`photo ${ref}`),
  empreinteOriginale: h(enc(`photo ${ref}`)),
});
const doc = (nom: string, nature: string, type = 'etat') => ({ nom, nature, type, octets: enc(nom) });
const base = { mode: 'autonome', exerciceStatut: 'cloture', travail: false, documents: [], pieces: [] };
const compose = (e: object, f: object = FMT) => composerPaquet({ ...base, ...e } as never, f as never);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurPaquet ? e.code : 'autre';
  }
  return undefined;
};
const noms = (r: { fichiers: { nom: string }[] }) => r.fichiers.map((f) => f.nom);
const P3 = [piece('P3', ['E3']), piece('P1', ['E2', 'E1']), piece('P2', ['E2'])];
const idx = (p: string, e: string, s = ';', f = '\n') => `${p}${s}${e}${s}${h(enc(`photo ${p}`))}${f}`;

describe('paquet', () => {
  it('trois-pieces-trois-lignes', () => {
    const r = compose({ pieces: [piece('P1', ['E1']), piece('P3', ['E3']), piece('P2', ['E2'])] });
    expect(r.indexPieces).toBe(`PieceRef;Ecriture;Empreinte\n${idx('P1', 'E1')}${idx('P2', 'E2')}${idx('P3', 'E3')}`);
    expect(ErreurPaquet.name).toBe('ErreurPaquet');
  });

  it('tri-ordre-inverse-et-format-en-argument', () => {
    const a = compose({ pieces: P3 });
    const b = compose({ pieces: [...P3].reverse() });
    expect(a.indexPieces.split('\n').slice(1, 4).map((l) => l.slice(0, 5))).toEqual(['P1;E1', 'P1;E2', 'P2;E2']);
    expect(b).toEqual(a);
    const csv = compose({ pieces: [piece('P1', ['E1', 'E1'])] }, { separateurCsv: ',', finDeLigne: '\r\n' });
    expect(csv.indexPieces).toBe(`PieceRef,Ecriture,Empreinte\r\n${idx('P1', 'E1', ',', '\r\n')}`);
  });

  it('manifeste-verifie', () => {
    const r = compose({ pieces: P3, documents: [doc('livre.csv', 'indicatif', 'paquet')] });
    expect(noms(r)).toEqual(['P1.jpg', 'P2.jpg', 'P3.jpg', 'index_pieces.csv', 'livre.csv']);
    expect(verifierManifeste(r.manifeste, r.fichiers).ok).toBe(true);
    const casse = r.fichiers.map((f) => (f.nom === 'P1.jpg' ? { nom: f.nom, octets: enc('autre') } : f));
    expect(verifierManifeste(r.manifeste, casse).modifies).toEqual(['P1.jpg']);
  });

  it('aucune-piece-index-reduit-a-lentete', () => {
    const r = compose({});
    expect(r.indexPieces).toBe('PieceRef;Ecriture;Empreinte\n');
    expect(noms(r)).toEqual(['index_pieces.csv']);
    expect(r.exclus).toEqual([]);
  });

  it('travail-exclu-par-defaut', () => {
    const r = compose({ documents: [doc('fec_TRAVAIL.txt', 'travail', 'fec'), doc('n.txt', 'indicatif', 'paquet')] });
    expect(noms(r)).toEqual(['index_pieces.csv', 'n.txt']);
    expect(r.exclus).toEqual([]);
  });

  it('travail-inclus-si-demande', () => {
    const r = compose({ travail: true, documents: [doc('fec_TRAVAIL.txt', 'travail', 'fec')] });
    expect(noms(r)).toEqual(['fec_TRAVAIL.txt', 'index_pieces.csv']);
  });

  it('officiel-exclu-en-saisie-seule', () => {
    const cas = [
      ['saisie_seule', 'cloture', 'etat', false],
      ['autonome', 'cloture', 'etat', true],
      ['autonome', 'ouvert', 'fec', false],
      ['autonome', 'cloture', 'fec', true],
    ] as const;
    for (const [mode, exerciceStatut, type, inclus] of cas) {
      const r = compose({ mode, exerciceStatut, documents: [doc('x.pdf', 'officiel', type)] });
      expect(noms(r).includes('x.pdf')).toBe(inclus);
      expect(r.exclus).toEqual(inclus ? [] : ['x.pdf']);
    }
    const r = compose({ mode: 'saisie_seule', documents: [doc('b.pdf', 'officiel'), doc('b.pdf', 'indicatif')] });
    expect(noms(r)).toEqual(['b.pdf', 'index_pieces.csv']);
    expect(r.exclus).toEqual(['b.pdf']);
  });

  it('piece-retouchee-refusee', () => {
    const p = { ...piece('P1', ['E1']), octets: enc('retouchee') };
    expect(code(() => compose({ pieces: [p] }))).toBe('piece_non_originale');
    expect(code(() => compose({ pieces: [{ ...piece('P1', ['E1']), empreinteOriginale: '' }] }))).toBe(
      'piece_non_originale',
    );
  });

  it('noms-en-double-refuses', () => {
    const d = doc('a.csv', 'indicatif', 'paquet');
    const cas: [object, string][] = [
      [{ pieces: [piece('P1', ['E1'], 'a.jpg'), piece('P2', ['E2'], 'a.jpg')] }, 'nom_en_double'],
      [{ pieces: [piece('P1', ['E1'], 'a.jpg'), piece('P1', ['E2'], 'b.jpg')] }, 'piece_en_double'],
      [{ documents: [d, d] }, 'nom_en_double'],
      [{ documents: [d], pieces: [piece('P1', ['E1'], 'a.csv')] }, 'nom_en_double'],
      [{ documents: [doc('index_pieces.csv', 'indicatif', 'paquet')] }, 'nom_en_double'],
      [{ documents: [doc('MANIFESTE.sha256', 'indicatif', 'paquet')] }, 'nom_en_double'],
      [{ documents: [doc('a/b.csv', 'indicatif', 'paquet')] }, 'nom_invalide'],
    ];
    for (const [e, c] of cas) expect(code(() => compose(e))).toBe(c);
  });

  it('refus-des-entrees-invalides', () => {
    const cas: [object, string][] = [
      [{ pieces: [piece('P1', [])] }, 'piece_sans_ecriture'],
      [{ pieces: [piece('P;1', ['E1'])] }, 'separateur_dans_nom'],
      [{ pieces: [piece('P1', ['E;1'])] }, 'separateur_dans_nom'],
      [{ pieces: [piece('P1', ['E1'], 'a;b.jpg')] }, 'separateur_dans_nom'],
      [{ pieces: [piece('P1', ['E"1'])] }, 'separateur_dans_nom'],
      [{ pieces: [piece('P1', ['E\n1'])] }, 'separateur_dans_nom'],
      [{ pieces: [piece('P1', ['E1'], 'a/b.jpg')] }, 'nom_invalide'],
      [{ pieces: [piece('P1', ['E1'], '')] }, 'nom_invalide'],
      [{ pieces: [piece('', ['E1'])] }, 'piece_invalide'],
      [{ pieces: [piece('P1', [''])] }, 'piece_invalide'],
    ];
    for (const [e, c] of cas) expect(code(() => compose(e))).toBe(c);
    const fmt = (separateurCsv: string, finDeLigne: string) => ({ separateurCsv, finDeLigne });
    expect(code(() => compose({}, fmt('', '\n')))).toBe('format_invalide');
    expect(code(() => compose({}, fmt(';', '')))).toBe('format_invalide');
    expect(code(() => compose({ pieces: [piece('P1', ['E1'])] }, fmt(';', 'E')))).toBe('separateur_dans_nom');
  });
});
