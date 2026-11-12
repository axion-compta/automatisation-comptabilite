import { describe, expect, it } from 'vitest';
import { CODES_422, TraceEcartee } from '../domaines/controles-actions.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { responses: Record<string, unknown> }>> };
const doc = genererOpenapi() as unknown as Doc;

describe('contrat : écarter et revérifier', () => {
  it('routes-publiees-avec-leurs-refus', () => {
    const e = doc.paths['/controles/{trace}/ecarter']?.['post'];
    expect(Object.keys(e?.responses ?? {})).toEqual(expect.arrayContaining(['200', '401', '403', '404', '422']));
    expect(Object.keys(doc.paths['/controles/reverifier']?.['post']?.responses ?? {})).toEqual(expect.arrayContaining(['200', '401', '403', '404']));
  });
  it('idempotency-key-exigee', () => {
    expect(routesEcritureSansEnTete()).not.toContain('ecarterControle');
    expect(routesEcritureSansEnTete()).not.toContain('reverifierControles');
  });
  it('trace-ecartee-stricte', () => {
    const t = { regleId: 'TVA-C01', objetId: 'p1', resultat: 'ECARTE', motif: 'Motif fictif', par: 'Alice Exemple', horodatage: '2026-04-02T08:00:00Z' };
    expect(TraceEcartee.safeParse(t).success).toBe(true);
    expect(TraceEcartee.safeParse({ ...t, societe: 'x' }).success).toBe(false);
    expect(TraceEcartee.safeParse({ ...t, motif: '' }).success).toBe(false);
    expect(TraceEcartee.safeParse({ ...t, resultat: 'OK' }).success).toBe(false);
  });
  it('codes-422-fermes', () => {
    expect([...CODES_422]).toEqual(['controle_non_ecartable', 'motif_obligatoire', 'auteur_obligatoire', 'horodatage_anterieur']);
  });
});
