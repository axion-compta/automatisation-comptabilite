import { describe, expect, it } from 'vitest';
import { genererPieces } from '../../../donnees-fictives/src/pieces.js';
import { PieceDetail, PieceResume } from '../domaines/pieces.js';
import { detailPiece, listerPiecesService } from '../domaines/pieces-service.js';

const jeu = genererPieces().pieces;
const tous = listerPiecesService({}).body;

describe('service pièces', () => {
  it('liste-enveloppe-et-tri', () => {
    const r = listerPiecesService({});
    expect(r.total).toBe(jeu.length);
    expect(r.decalage).toBe(0);
    for (const p of r.body) expect(() => PieceResume.parse(p)).not.toThrow();
    const date = (id: string) => jeu.find((p) => p.id === id)?.recuLe ?? '';
    for (let i = 1; i < r.body.length; i++) {
      const a = r.body[i - 1]!;
      const b = r.body[i]!;
      const [da, db] = [date(a.id), date(b.id)];
      expect(da > db || (da === db && a.id < b.id)).toBe(true);
    }
    const page = listerPiecesService({ limite: 2, decalage: 1 });
    expect(page.body.map((p) => p.id)).toEqual(r.body.slice(1, 3).map((p) => p.id));
    expect(page.total).toBe(jeu.length);
    expect(JSON.stringify(r)).not.toMatch(/confiance_pct|pourcent/);
  });

  it('filtres-combines', () => {
    const etat = listerPiecesService({ etat: 'prete' }).body;
    expect(etat.length).toBeGreaterThan(0);
    expect(etat.every((p) => p.etat === 'prete')).toBe(true);
    const type = listerPiecesService({ etat: 'prete', type: 'facture' }).body;
    expect(type.length).toBeLessThan(etat.length);
    expect(type.every((p) => p.typePiece === 'facture' && p.etat === 'prete')).toBe(true);
    const montants = listerPiecesService({ montantMin: 5000, montantMax: 20000 }).body;
    expect(montants.length).toBeGreaterThan(0);
    expect(montants.every((p) => p.ttcCentimes !== undefined && p.ttcCentimes >= 5000 && p.ttcCentimes <= 20000)).toBe(true);
    const du = '2026-03-01';
    const au = '2026-06-30';
    const periode = listerPiecesService({ du, au }).body;
    const attendu = jeu.filter((p) => p.recuLe >= du && p.recuLe <= au);
    expect(periode.length).toBe(attendu.length);
    expect(periode.length).toBeGreaterThan(0);
    expect(periode.length).toBeLessThan(tous.length);
    const combine = listerPiecesService({ du, au, type: 'facture', etat: 'prete' }).body;
    expect(combine.every((p) => p.typePiece === 'facture' && p.etat === 'prete')).toBe(true);
    expect(combine.length).toBeLessThanOrEqual(periode.length);
    expect(listerPiecesService({ etat: 'inexistant' })).toEqual({ body: [], decalage: 0, total: 0 });
  });

  it('recherche-fournisseur-sans-accent', () => {
    const base = listerPiecesService({ fournisseur: 'FOURNISSEUR-EXEMPLE' }).body;
    expect(base.length).toBeGreaterThan(0);
    expect(listerPiecesService({ fournisseur: 'fournisseur-exemple' }).total).toBe(base.length);
    expect(listerPiecesService({ fournisseur: 'résto-exemple' }).total).toBe(listerPiecesService({ fournisseur: 'RESTO-EXEMPLE' }).total);
    expect(listerPiecesService({ fournisseur: 'RESTO' }).total).toBeGreaterThan(0);
    expect(listerPiecesService({ fournisseur: 'zzz-absent' }).total).toBe(0);
  });

  it('piece-inconnue-404', () => {
    expect(detailPiece('piece-999')).toBeUndefined();
    expect(detailPiece('')).toBeUndefined();
    expect(detailPiece('piece-001')?.id).toBe('piece-001');
  });

  it('sensible-masquee-dans-le-detail', () => {
    const s = jeu.find((p) => p.sensible);
    const n = jeu.find((p) => !p.sensible && p.champs.length > 0);
    expect(s).toBeDefined();
    const d = detailPiece(s!.id)!;
    expect(() => PieceDetail.parse(d)).not.toThrow();
    expect(d.champs).toEqual([]);
    expect(d.fournisseur).toBeUndefined();
    expect(d.sensible).toBe(true);
    const o = detailPiece(n!.id)!;
    expect(o.champs.length).toBe(n!.champs.length);
    expect(o.fournisseur).toBeDefined();
  });
});
