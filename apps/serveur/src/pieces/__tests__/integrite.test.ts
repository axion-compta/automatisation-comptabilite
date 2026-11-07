import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { creerEnveloppeAes, StockageChiffre, type ContexteDepot } from '../adaptateurs/stockage-chiffre.js';
import { sha256Hex } from '../etape-entree.js';
import { verifierEchantillon, verifierIntegrite, type PieceControlee } from '../integrite.js';
import { StockageMemoire } from '../ports-memoire.js';

const OCTETS = new TextEncoder().encode('Facture fictive Martin Exemple numéro 7');
const contexte = (id: string): ContexteDepot => ({ tenantId: 't-1', societeId: 's-1', pieceId: id, sha256: sha256Hex(OCTETS), reel: false });
const piece = (id: string, extra: Partial<PieceControlee> = {}): PieceControlee => ({ id, cle: `compta/s-1/originaux/${id}`, sha256: sha256Hex(OCTETS), ...extra });

async function monter(ids: string[]) {
  const interieur = new StockageMemoire();
  const enveloppe = creerEnveloppeAes(randomBytes(32));
  const stockage = new StockageChiffre(interieur, enveloppe, () => false, (cle) => contexte(cle.slice(cle.lastIndexOf('/') + 1)));
  for (const id of ids) await stockage.deposerSiAbsent(piece(id).cle, OCTETS);
  return { interieur, stockage, enveloppe };
}

describe('intégrité des pièces', () => {
  it('piece-intacte-ok', async () => {
    const { stockage } = await monter(['p1']);
    expect(await verifierIntegrite(piece('p1'), stockage)).toEqual({ id: 'p1', resultat: 'ok' });
  });

  it('un-octet-modifie-integrite-ko', async () => {
    const { interieur, enveloppe } = await monter(['p1']);
    const p = piece('p1');
    const brut = (await interieur.lire(p.cle))!.slice();
    brut[brut.length - 1] = (brut[brut.length - 1]! + 1) % 256;
    const copie = new StockageMemoire();
    await copie.deposerSiAbsent(p.cle, brut);
    const altere = new StockageChiffre(copie, enveloppe, () => false, () => contexte('p1'));
    expect(await verifierIntegrite(p, altere)).toEqual({ id: 'p1', resultat: 'integrite_ko' });
  });

  it('empreinte-enregistree-differente-integrite-ko', async () => {
    const { stockage } = await monter(['p1']);
    expect(await verifierIntegrite(piece('p1', { sha256: 'b'.repeat(64) }), stockage)).toEqual({ id: 'p1', resultat: 'integrite_ko' });
  });

  it('objet-absent-integrite-ko', async () => {
    const { stockage } = await monter([]);
    expect((await verifierIntegrite(piece('p9'), stockage)).resultat).toBe('integrite_ko');
  });

  it('echantillon-controle-les-plus-anciennes-en-premier', async () => {
    const { stockage } = await monter(['a', 'b', 'c']);
    const pieces = [piece('a', { dernierControle: '2026-03-01' }), piece('b'), piece('c', { dernierControle: '2026-01-01' })];
    const r = await verifierEchantillon(pieces, 2, stockage);
    expect(r.map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('echantillon-ordre-d-entree-inverse-meme-resultat', async () => {
    const { stockage } = await monter(['a', 'b', 'c']);
    const pieces = [piece('a', { dernierControle: '2026-03-01' }), piece('b'), piece('c', { dernierControle: '2026-01-01' })];
    expect((await verifierEchantillon([...pieces].reverse(), 2, stockage)).map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('echantillon-vide-ou-taille-zero', async () => {
    const { stockage } = await monter(['a']);
    expect(await verifierEchantillon([], 3, stockage)).toEqual([]);
    expect(await verifierEchantillon([piece('a')], 0, stockage)).toEqual([]);
  });

  it('echantillon-plus-grand-que-la-liste', async () => {
    const { stockage } = await monter(['a']);
    expect(await verifierEchantillon([piece('a')], 5, stockage)).toHaveLength(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])('taille-invalide-refusee-%s', async (taille) => {
    const { stockage } = await monter(['a']);
    await expect(verifierEchantillon([piece('a')], taille, stockage)).rejects.toThrow(RangeError);
  });

  it('une-piece-ko-est-marquee-sans-reparation', async () => {
    const { stockage, interieur } = await monter(['a']);
    const avant = Buffer.from((await interieur.lire(piece('a').cle))!);
    const r = await verifierEchantillon([piece('a', { sha256: 'c'.repeat(64) })], 1, stockage);
    expect(r[0]).toEqual({ id: 'a', resultat: 'integrite_ko' });
    expect(Buffer.from((await interieur.lire(piece('a').cle))!).equals(avant)).toBe(true);
  });
});
