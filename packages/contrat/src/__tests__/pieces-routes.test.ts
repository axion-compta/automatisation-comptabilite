import { describe, expect, it } from 'vitest';
import { PieceDetail, PieceResume, QueryPieces } from '../domaines/pieces.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { operationId?: string }>> };

describe('contrat des pièces en lecture', () => {
  it('pieces-dans-openapi', () => {
    const doc = genererOpenapi() as Doc;
    expect(doc.paths['/pieces']?.get?.operationId).toBe('listerPieces');
    expect(doc.paths['/pieces/{id}']?.get?.operationId).toBe('lirePiece');
    expect(routesEcritureSansEnTete()).toEqual([]);
    for (const m of ['post', 'put', 'delete']) expect(doc.paths['/pieces']?.[m]).toBeUndefined();
  });

  it('bornes-inversees-400', () => {
    const rejet = [
      { du: '2026-02-01', au: '2026-01-01' },
      { montantMin: '500', montantMax: '100' },
      { limite: '0' },
      { limite: '101' },
      { limite: '1.5' },
      { limite: 'abc' },
      { montantMin: '1.5' },
      { montantMax: 'NaN' },
      { du: '2026-13-01' },
      { fournisseur: 'x'.repeat(51) },
      { decalage: '-1' },
    ];
    for (const q of rejet) expect(QueryPieces.safeParse(q).success, JSON.stringify(q)).toBe(false);
    const accepte = [{}, { du: '2026-01-01', au: '2026-01-01' }, { montantMin: '100', montantMax: '100' }, { limite: '1' }, { limite: '100' }, { fournisseur: 'x'.repeat(50) }];
    for (const q of accepte) expect(QueryPieces.safeParse(q).success, JSON.stringify(q)).toBe(true);
  });

  it('pieces-sans-pourcentage', () => {
    const resume = { id: 'p1', nomNormalise: 'piece-fictive.pdf', typePiece: 'facture', etat: 'lue', comptee: false, sensible: false, motConfiance: 'sure' };
    expect(PieceResume.parse(resume)).toEqual(resume);
    expect(Object.keys(PieceResume.shape).some((k) => /pourcent|score|confiance$/i.test(k) && k !== 'motConfiance')).toBe(false);
    const detail = { ...resume, canal: 'depot', recuLe: '2026-01-02T10:00:00Z', motifsAVerifier: [], champs: [{ nom: 'total', valeur: '12,00', valeurCentimes: 1200, mot: 'sure', source: 'lecture' }], cheminVirtuel: '/pieces/2026/piece-fictive.pdf' };
    expect(PieceDetail.parse(detail).champs[0]?.mot).toBe('sure');
    expect(PieceDetail.safeParse({ ...detail, cheminVirtuel: '' }).success).toBe(false);
  });
});
