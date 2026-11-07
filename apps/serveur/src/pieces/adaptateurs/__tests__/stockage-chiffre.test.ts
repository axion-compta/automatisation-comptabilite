import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../etape-entree.js';
import { StockageMemoire } from '../../ports-memoire.js';
import { creerEnveloppeAes, StockageChiffre, type ContexteDepot } from '../stockage-chiffre.js';

const OCTETS = new TextEncoder().encode('Facture fictive Dupont Exemple numéro 42');
const ctx = (pieceId: string, octets = OCTETS, reel = false): ContexteDepot => ({ tenantId: 't-1', societeId: 's-1', pieceId, sha256: sha256Hex(octets), reel });
const cleDe = (pieceId: string): string => `compta/s-1/originaux/${pieceId}`;

function monter(reglage = false) {
  const interieur = new StockageMemoire();
  const contextes = new Map<string, ContexteDepot>();
  const enveloppe = creerEnveloppeAes(randomBytes(32));
  const stockage = new StockageChiffre(interieur, enveloppe, () => reglage, (cle) => {
    const c = contextes.get(cle);
    if (!c) throw new Error('contexte inconnu');
    return c;
  });
  const declarer = (pieceId: string, octets = OCTETS, reel = false) => { contextes.set(cleDe(pieceId), ctx(pieceId, octets, reel)); return cleDe(pieceId); };
  return { interieur, stockage, declarer, contextes, enveloppe };
}

describe('stockage chiffré par enveloppe', () => {
  it('ecrit-puis-relit-le-meme-contenu', async () => {
    const { stockage, declarer } = monter();
    const cle = declarer('p1');
    expect(await stockage.deposerSiAbsent(cle, OCTETS)).toBe('depose');
    expect(await stockage.lire(cle)).toEqual(OCTETS);
  });

  it('objet-lu-directement-illisible', async () => {
    const { stockage, interieur, declarer } = monter();
    const cle = declarer('p1');
    await stockage.deposerSiAbsent(cle, OCTETS);
    const brut = (await interieur.lire(cle))!;
    expect(brut.length).toBeGreaterThan(OCTETS.length);
    expect(Buffer.from(brut).includes(Buffer.from(OCTETS))).toBe(false);
    expect(Buffer.from(brut).toString('utf8')).not.toContain('Dupont');
  });

  it('depot-reel-refuse-par-defaut', async () => {
    const { stockage, interieur, declarer } = monter(false);
    const cle = declarer('p1', OCTETS, true);
    await expect(stockage.deposerSiAbsent(cle, OCTETS)).rejects.toMatchObject({ code: 'pieces_reelles_non_autorisees' });
    expect(interieur.taille()).toBe(0);
  });

  it('depot-reel-accepte-quand-le-reglage-est-leve', async () => {
    const { stockage, declarer } = monter(true);
    const cle = declarer('p1', OCTETS, true);
    expect(await stockage.deposerSiAbsent(cle, OCTETS)).toBe('depose');
  });

  it('depot-fictif-accepte-meme-reglage-faux', async () => {
    const { stockage, declarer } = monter(false);
    expect(await stockage.deposerSiAbsent(declarer('p1'), OCTETS)).toBe('depose');
  });

  it('meme-cle-deux-depots-refuse', async () => {
    const { stockage, interieur, declarer, enveloppe } = monter();
    const cle = declarer('p1');
    await stockage.deposerSiAbsent(cle, OCTETS);
    const avant = Buffer.from((await interieur.lire(cle))!);
    const autre = new TextEncoder().encode('autre contenu fictif');
    const contexte = ctx('p1', autre);
    expect(await new StockageChiffre(interieur, enveloppe, () => false, () => contexte).deposerSiAbsent(cle, autre)).toBe('existe');
    expect(Buffer.from((await interieur.lire(cle))!).equals(avant)).toBe(true);
    expect(await stockage.lire(cle)).toEqual(OCTETS);
  });

  it('chiffre-colle-sur-autre-piece-refuse', async () => {
    const { stockage, interieur, declarer } = monter();
    const a = declarer('pA');
    const b = declarer('pB');
    await stockage.deposerSiAbsent(a, OCTETS);
    await interieur.deposerSiAbsent(b, (await interieur.lire(a))!);
    await expect(stockage.lire(b)).rejects.toMatchObject({ code: 'dechiffrement_refuse' });
  });

  it('chiffre-colle-meme-piece-autre-societe-refuse', async () => {
    const { stockage, interieur, declarer, contextes } = monter();
    const a = declarer('pA');
    await stockage.deposerSiAbsent(a, OCTETS);
    contextes.set(a, { ...ctx('pA'), societeId: 's-2' });
    expect(await interieur.lire(a)).not.toBeNull();
    await expect(stockage.lire(a)).rejects.toMatchObject({ code: 'dechiffrement_refuse' });
  });

  it('autre-cle-de-client-refuse', async () => {
    const { stockage, interieur, declarer, contextes } = monter();
    const a = declarer('pA');
    await stockage.deposerSiAbsent(a, OCTETS);
    contextes.set(a, { ...ctx('pA'), tenantId: 't-2' });
    await expect(stockage.lire(a)).rejects.toMatchObject({ code: 'dechiffrement_refuse' });
    const autreCle = new StockageChiffre(interieur, creerEnveloppeAes(randomBytes(32)), () => false, () => ctx('pA'));
    await expect(autreCle.lire(a)).rejects.toMatchObject({ code: 'dechiffrement_refuse' });
  });

  it('octet-modifie-refuse-a-la-lecture', async () => {
    const { stockage, interieur, declarer, enveloppe } = monter();
    const cle = declarer('p1');
    await stockage.deposerSiAbsent(cle, OCTETS);
    const brut = (await interieur.lire(cle))!.slice();
    brut[brut.length - 1] = (brut[brut.length - 1]! + 1) % 256;
    const copie = new StockageMemoire();
    await copie.deposerSiAbsent(cle, brut);
    const lecteur = new StockageChiffre(copie, enveloppe, () => false, () => ctx('p1'));
    await expect(lecteur.lire(cle)).rejects.toMatchObject({ code: 'dechiffrement_refuse' });
  });

  it('sha256-different-du-contenu-refuse-au-depot', async () => {
    const { stockage, contextes } = monter();
    contextes.set(cleDe('p1'), { ...ctx('p1'), sha256: 'a'.repeat(64) });
    await expect(stockage.deposerSiAbsent(cleDe('p1'), OCTETS)).rejects.toMatchObject({ code: 'sha256_incoherent' });
  });

  it('lire-absent-rend-null', async () => {
    const { stockage, declarer } = monter();
    expect(await stockage.lire(declarer('p1'))).toBeNull();
  });

  it('deux-depots-du-meme-contenu-donnent-deux-chiffres-differents', async () => {
    const { stockage, interieur, declarer } = monter();
    await stockage.deposerSiAbsent(declarer('p1'), OCTETS);
    await stockage.deposerSiAbsent(declarer('p2'), OCTETS);
    expect(Buffer.from((await interieur.lire(cleDe('p1')))!).equals(Buffer.from((await interieur.lire(cleDe('p2')))!))).toBe(false);
  });
});
