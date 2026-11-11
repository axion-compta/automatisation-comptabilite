import { describe, expect, it } from 'vitest';
import { depot } from '../domaines/depot.js';
import { creerDepotEnMemoire } from '../domaines/depot-service.js';
import type { PieceDeposee } from '../domaines/pieces-service.js';
import { genererOpenapiDe, routesEcritureSansEnTete, type Source } from '../openapi.js';

const REGLAGE = { tailleMaxOctets: 1000, pagesMaxFileNormale: 50, pagesMaxModele: 10 };
const pdf = (n: number): Uint8Array => new TextEncoder().encode(`%PDF-1.4 fictif ${n}`);
const nouveau = () => {
  const pieces: PieceDeposee[] = [];
  return { pieces, service: creerDepotEnMemoire(pieces, REGLAGE, () => '2026-01-05T10:00:00.000Z') };
};

describe('dépôt de pièces (contrat et service en mémoire)', () => {
  it('trois-pdf-trois-pieces', async () => {
    const { pieces, service } = nouveau();
    const r = await service.deposer('cle-000001', [pdf(1), pdf(2), pdf(3)], 'api');
    expect(r.map((x) => x.statut)).toEqual(['recue', 'recue', 'recue']);
    expect(pieces).toHaveLength(3);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(3);
  });

  it('meme-fichier-deja-recue', async () => {
    const { pieces, service } = nouveau();
    const premier = await service.deposer('cle-000001', [pdf(1)], 'api');
    const second = await service.deposer('cle-000002', [pdf(1)], 'glisser');
    expect(pieces).toHaveLength(1);
    expect(second[0]).toEqual({ statut: 'deja_recue', id: (premier[0] as { id: string }).id, recueLe: '2026-01-05T10:00:00.000Z' });
  });

  it('meme-cle-meme-reponse', async () => {
    const { pieces, service } = nouveau();
    const premier = await service.deposer('cle-000001', [pdf(1)], 'api');
    expect(await service.deposer('cle-000001', [pdf(1)], 'api')).toEqual(premier);
    expect(pieces).toHaveLength(1);
  });

  it('meme-cle-autres-fichiers-stockes', async () => {
    const { pieces, service } = nouveau();
    await service.deposer('cle-000001', [pdf(1)], 'api');
    const r = await service.deposer('cle-000001', [pdf(2)], 'api');
    expect(r[0]).toMatchObject({ statut: 'recue' });
    expect(pieces).toHaveLength(2);
  });

  it('executable-refuse-type-refuse', async () => {
    const { pieces, service } = nouveau();
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0xff, 0xfe]);
    const r = await service.deposer('cle-000001', [exe], 'api');
    expect(r[0]).toMatchObject({ statut: 'refusee', code: 'type_refuse' });
    expect(pieces).toHaveLength(0);
  });

  it('trop-grand-refuse', async () => {
    const { pieces, service } = nouveau();
    const gros = new Uint8Array(1001);
    gros.set(pdf(9));
    const r = await service.deposer('cle-000001', [gros], 'api');
    expect(r[0]).toMatchObject({ statut: 'refusee', code: 'trop_grand' });
    expect(pieces).toHaveLength(0);
  });

  it('ordre-des-resultats-conserve', async () => {
    const { service } = nouveau();
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const r = await service.deposer('cle-000001', [pdf(1), exe, pdf(1), pdf(2)], 'api');
    expect(r.map((x) => x.statut)).toEqual(['recue', 'refusee', 'deja_recue', 'recue']);
  });

  it('etat-d-une-piece', async () => {
    const { pieces, service } = nouveau();
    const r = await service.deposer('cle-000001', [pdf(1)], 'api');
    const id = (r[0] as { id: string }).id;
    expect(service.etat(id)).toEqual({ etat: 'recue' });
    pieces[0]!.etat = 'en_erreur';
    pieces[0]!.motif = 'lecture_impossible';
    expect(service.etat(id)).toEqual({ etat: 'en_erreur', motif: 'lecture_impossible' });
    expect(service.etat('inconnue')).toBeUndefined();
  });

  it('relance-hors-erreur-409', async () => {
    const { pieces, service } = nouveau();
    const r = await service.deposer('cle-000001', [pdf(1)], 'api');
    const id = (r[0] as { id: string }).id;
    expect(service.relancer(id)).toBe('RELANCE_IMPOSSIBLE');
    expect(service.relancer('inconnue')).toBe('PIECE_INCONNUE');
    pieces[0]!.etat = 'en_erreur';
    expect(service.relancer(id)).toEqual({ etat: 'recue' });
  });

  it('contrat-multipart-et-cle-obligatoire', () => {
    const source = { depot } as Source;
    expect(routesEcritureSansEnTete(source)).toEqual([]);
    const doc = genererOpenapiDe(source) as { paths: Record<string, Record<string, { requestBody?: { content: Record<string, unknown> } }>> };
    expect(Object.keys(doc.paths['/pieces']!['post']!.requestBody!.content)).toEqual(['multipart/form-data']);
  });
});
