import { describe, expect, it } from 'vitest';
import { etapeAntivirus, etapeEntree, sha256Hex, type ContexteEntree } from '../etape-entree.js';
import { AntivirusMemoire, DepotMemoire, HorlogeFixe, StockageMemoire } from '../ports-memoire.js';

const SOCIETE = 'soc-fictive';
const LIMITE = 1_000_000;
const REGLAGE = {
  archive: { ratioMax: 100, totalMaxOctets: LIMITE, nombreMax: 500 },
  image: { coteMax: 5000, pixelsMax: 10_000_000 },
  limites: { tailleMaxOctets: LIMITE, pagesMaxFileNormale: 10, pagesMaxModele: 10 },
  delaisRelanceMinutes: [5, 15],
};
const texte = (t: string): Uint8Array => new TextEncoder().encode(t);
const PDF = texte('%PDF-1.7 fictif');
const EXE = texte('MZ programme fictif');

function png(largeur: number, hauteur: number): Uint8Array {
  const o = new Uint8Array(24);
  o.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(o.buffer);
  v.setUint32(16, largeur);
  v.setUint32(20, hauteur);
  return o;
}

function zip(noms: string[]): Uint8Array {
  const centrale = noms.map((nom) => {
    const e = new Uint8Array(46 + nom.length);
    const v = new DataView(e.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint32(20, 10, true);
    v.setUint32(24, 10, true);
    v.setUint16(28, nom.length, true);
    e.set(texte(nom), 46);
    return e;
  });
  const taille = centrale.reduce((s, e) => s + e.length, 0);
  const sortie = new Uint8Array(4 + taille + 22);
  const fin = new DataView(sortie.buffer, 4 + taille);
  sortie.set([0x50, 0x4b, 0x03, 0x04]);
  centrale.reduce((p, e) => (sortie.set(e, p), p + e.length), 4);
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(10, noms.length, true);
  fin.setUint32(12, taille, true);
  fin.setUint32(16, 4, true);
  return sortie;
}

function monde(antivirus = new AntivirusMemoire()) {
  const stockage = new StockageMemoire();
  const depot = new DepotMemoire();
  let n = 0;
  const decompresser = (_o: Uint8Array, nom: string): Uint8Array => (nom.endsWith('.exe') ? EXE : texte('%PDF-1.7 ' + nom));
  const ctx: ContexteEntree = { societeId: SOCIETE, nouvelId: () => `p${++n}`, stockage, depot, horloge: new HorlogeFixe('2026-01-01T00:00:00Z'), antivirus, reglage: REGLAGE, decompresser };
  return { ctx, stockage, depot, antivirus };
}

describe('etapeEntree', () => {
  it('pdf-sain-en-quarantaine', async () => {
    const { ctx, stockage, depot } = monde();
    const r = await etapeEntree(PDF, ctx);
    expect(r.piece.etat).toBe('quarantaine');
    expect(r.piece.cle).toBe(`compta/${SOCIETE}/originaux/${sha256Hex(PDF)}`);
    expect(await stockage.lire(r.piece.cle as string)).toEqual(PDF);
    expect((await depot.parId(r.piece.id))?.etat).toBe('quarantaine');
  });

  it('executable-refuse-rien-stocke', async () => {
    const { ctx, stockage } = monde();
    const r = await etapeEntree(EXE, ctx);
    expect(r.piece.etat).toBe('refusee');
    expect(r.piece.code).toBe('type_refuse');
    expect(stockage.taille()).toBe(0);
  });

  it('zip-282-fichiers-282-enfants', async () => {
    const { ctx, depot } = monde();
    const noms = Array.from({ length: 282 }, (_, i) => (i % 100 === 0 ? `f${i}.exe` : `f${i}.pdf`));
    const r = await etapeEntree(zip(noms), ctx);
    expect(r.piece.etat).toBe('quarantaine');
    expect(r.enfants).toHaveLength(noms.length);
    expect(r.recus).toBe(noms.length);
    expect(r.crees + r.refuses).toBe(r.recus);
    expect([r.crees, r.refuses]).toEqual([279, 3]);
    expect(r.enfants.every((e) => e.pieceParenteId === r.piece.id)).toBe(true);
    expect(depot.nombre()).toBe(noms.length + 1);
  });

  it('zip-slip-refuse', async () => {
    const { ctx, stockage } = monde();
    const r = await etapeEntree(zip(['../evasion.pdf']), ctx);
    expect(r.piece).toMatchObject({ etat: 'refusee', code: 'archive_refusee' });
    expect(r.enfants).toHaveLength(0);
    expect(stockage.taille()).toBe(0);
  });

  it('image-trop-grande-refusee', async () => {
    const { ctx, stockage } = monde();
    const r = await etapeEntree(png(REGLAGE.image.coteMax + 1, 10), ctx);
    expect(r.piece).toMatchObject({ etat: 'refusee', code: 'image_refusee' });
    expect(stockage.taille()).toBe(0);
    expect((await etapeEntree(png(10, 10), ctx)).piece.etat).toBe('quarantaine');
  });
});

describe('etapeAntivirus', () => {
  it('antivirus-infecte-refuse', async () => {
    const antivirus = new AntivirusMemoire();
    antivirus.programmer(sha256Hex(PDF), 'infecte');
    const { ctx } = monde(antivirus);
    const { piece } = await etapeEntree(PDF, ctx);
    const apres = await etapeAntivirus(piece, ctx);
    expect(apres).toMatchObject({ etat: 'refusee', code: 'infecte' });
    expect((await ctx.depot.parId(piece.id))?.etat).toBe('refusee');
  });

  it('antivirus-indetermine-relance', async () => {
    const antivirus = new AntivirusMemoire();
    antivirus.programmer(sha256Hex(PDF), 'indetermine');
    const { ctx } = monde(antivirus);
    const { piece } = await etapeEntree(PDF, ctx);
    const un = await etapeAntivirus(piece, ctx);
    expect(un).toMatchObject({ etat: 'en_erreur', code: 'indetermine', tentatives: 1, prochaineRelanceA: '2026-01-01T00:05:00.000Z' });
    const deux = await etapeAntivirus({ ...un, etat: 'quarantaine' }, ctx);
    expect(deux.prochaineRelanceA).toBe('2026-01-01T00:15:00.000Z');
    const trois = await etapeAntivirus({ ...deux, etat: 'quarantaine' }, ctx);
    expect(trois.prochaineRelanceA).toBe('abandon');
  });

  it('antivirus-sain-reste-en-quarantaine', async () => {
    const { ctx } = monde();
    const { piece } = await etapeEntree(PDF, ctx);
    expect((await etapeAntivirus(piece, ctx)).etat).toBe('quarantaine');
  });

  it('meme-fichier-meme-cle-objet', async () => {
    const { ctx, stockage } = monde();
    const a = await etapeEntree(PDF, ctx);
    const b = await etapeEntree(PDF, ctx);
    expect(a.piece.depot).toBe('depose');
    expect(b.piece.depot).toBe('existe');
    expect(b.piece.cle).toBe(a.piece.cle);
    expect(stockage.taille()).toBe(1);
  });
});
