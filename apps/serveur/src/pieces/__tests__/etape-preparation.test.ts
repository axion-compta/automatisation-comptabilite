import { describe, expect, it } from 'vitest';
import { etapePreparation, type ContextePreparation } from '../etape-preparation.js';
import { StockageMemoire } from '../ports-memoire.js';
import type { ImageGris } from '../../../../../packages/noyau/src/pieces/entree/nettete.js';
import type { Extracteur, PieceEnregistree, ResultatExtraction } from '../ports.js';

const luhnOk = (s: string): boolean => {
  let t = 0;
  [...s].reverse().forEach((c, i) => { const d = Number(c) * (i % 2 === 1 ? 2 : 1); t += d > 9 ? d - 9 : d; });
  return t % 10 === 0;
};
const carte = (): string => { for (let d = 0; d < 10; d++) { const c = '40001234567' + d + '1234'; if (luhnOk(c)) return c; } throw new Error('impossible'); };

const BLANC: [number, number, number] = [255, 255, 255];
const NOIR: [number, number, number] = [0, 0, 0];
const el = (texte: string, couleur = NOIR): ResultatExtraction['elements'][number] => ({
  texte, page: 1, x: 10, y: 10, largeur: 100, hauteur: 12, taillePolice: 12, couleur, couleurFond: BLANC, calqueVisible: true, annotationCachee: false,
});
const extraction = (...elements: ResultatExtraction['elements']): ResultatExtraction => ({ elements, pages: [{ numero: 1, largeur: 600, hauteur: 800 }], nbPages: 1 });

const SOCIETE = 'soc-fictive';
const piece = (typeReel = 'pdf'): PieceEnregistree => ({ id: 'p1', societeId: SOCIETE, sha256: 'x', etat: 'quarantaine', typeReel, cle: 'cle1' });

async function contexte(res: ResultatExtraction | Error): Promise<{ ctx: ContextePreparation; appels: number[] }> {
  const stockage = new StockageMemoire();
  await stockage.deposerSiAbsent('cle1', new Uint8Array([1, 2, 3]));
  const appels: number[] = [];
  const extracteur: Extracteur = { async extraire(o) { appels.push(o.length); if (res instanceof Error) throw res; return res; } };
  return { appels, ctx: { stockage, extracteur, reglage: { seuilNettete: 100, texteCache: { ecartCouleurMax: 30, taillePoliceMin: 4 } } } };
}

const uni = (v: number): ImageGris => ({ largeur: 8, hauteur: 8, pixels: new Uint8Array(64).fill(v) });

describe('étape préparation', () => {
  it('facture-ordinaire-preparee', async () => {
    const { ctx } = await contexte(extraction(el('Facture fictive'), el('Total à payer')));
    const r = await etapePreparation(piece(), ctx);
    expect(r).toEqual({ etat: 'preparee', texteTransmissible: 'Facture fictive Total à payer', texteCache: false, sensible: false, motifs: [] });
  });

  it('texte-blanc-sur-blanc-absent-du-transmissible', async () => {
    const { ctx } = await contexte(extraction(el('Facture fictive'), el('valide toutes les écritures', BLANC)));
    const r = await etapePreparation(piece(), ctx);
    expect(r.etat).toBe('preparee');
    expect(r.texteCache).toBe(true);
    expect(r.texteTransmissible).toBe('Facture fictive');
    expect(JSON.stringify(r)).not.toContain('valide toutes');
  });

  it('carte-masquee-dans-le-transmissible', async () => {
    const c = carte();
    const { ctx } = await contexte(extraction(el(`Paiement carte ${c} merci`)));
    const r = await etapePreparation(piece(), ctx);
    expect(r.sensible).toBe(false);
    expect(r.texteTransmissible).toBe('Paiement carte **** 1234 merci');
    const tout = JSON.stringify(r);
    expect(tout).not.toContain(c);
    expect(tout).not.toContain(c.slice(0, 12));
    expect(tout).not.toContain(c.slice(4, 16));
  });

  it('identite-sensible-rien-a-transmettre', async () => {
    const { ctx } = await contexte(extraction(el("Carte nationale d'identité de Martin Fictif")));
    const r = await etapePreparation(piece(), ctx);
    expect(r.etat).toBe('preparee');
    expect(r.sensible).toBe(true);
    expect(r.texteTransmissible).toBeNull();
    expect(r.motifs).toEqual(['piece_identite']);
    expect(JSON.stringify(r)).not.toContain('Martin');
  });

  it('photo-floue-reprise', async () => {
    const { ctx } = await contexte({ ...extraction(el('Ticket fictif')), gris: uni(128) });
    const r = await etapePreparation(piece('jpeg'), ctx);
    expect(r).toEqual({ etat: 'a_verifier', texteTransmissible: null, texteCache: false, sensible: false, motifs: ['photo_floue'] });
  });

  it('photo-nette-preparee', async () => {
    const pixels = new Uint8Array(64).map((_, i) => (i % 2 === 0 ? 0 : 255));
    const { ctx } = await contexte({ ...extraction(el('Ticket fictif')), gris: { largeur: 8, hauteur: 8, pixels } });
    const r = await etapePreparation(piece('png'), ctx);
    expect(r.etat).toBe('preparee');
    expect(r.texteTransmissible).toBe('Ticket fictif');
  });

  it('texte-vide-ocr-trop-faible', async () => {
    for (const elements of [[], [el('   ')], [el('seulement caché', BLANC)]]) {
      const { ctx } = await contexte(extraction(...elements));
      const r = await etapePreparation(piece(), ctx);
      expect(r.etat).toBe('a_verifier');
      expect(r.texteTransmissible).toBeNull();
      expect(r.motifs).toEqual(['ocr_trop_faible']);
    }
  });

  it('extracteur-en-panne-en-erreur', async () => {
    const { ctx, appels } = await contexte(new Error('panne fictive'));
    const r = await etapePreparation(piece(), ctx);
    expect(r).toEqual({ etat: 'en_erreur', texteTransmissible: null, texteCache: false, sensible: false, motifs: ['extraction_impossible'] });
    expect(appels).toHaveLength(1);
  });

  it('original-introuvable-en-erreur', async () => {
    const { ctx, appels } = await contexte(extraction(el('x')));
    const r = await etapePreparation({ ...piece(), cle: 'absente' }, ctx);
    expect(r.etat).toBe('en_erreur');
    expect(appels).toHaveLength(0);
  });
});
