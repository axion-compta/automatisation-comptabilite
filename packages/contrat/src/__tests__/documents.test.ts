import { describe, expect, expectTypeOf, it } from 'vitest';
import type { StatutDocument } from '../../../noyau/src/documents/historique.js';
import { CATALOGUE_DOCUMENTS } from '../../../noyau/src/documents/catalogue.js';
import { Document, STATUTS_DOCUMENT, TYPES_DOCUMENT } from '../domaines/documents.js';

const HASH = 'a'.repeat(64);
const base = {
  id: 'doc-1', rayon: 'prepare', type: 'bilan', formats: ['pdf'], source: 'prepare_produit',
  exerciceId: 'ex-2026', empreinte: HASH, prepareLe: '2026-11-12', version: 1, statut: 'brouillon',
};
const ok = (p: Record<string, unknown>) => Document.safeParse({ ...base, ...p }).success;

describe('contrat document unifié', () => {
  it('type-hors-liste-refuse', () => {
    expect(ok({})).toBe(true);
    expect(ok({ type: 'facture' })).toBe(false);
    expect(ok({ type: '' })).toBe(false);
    expect([...TYPES_DOCUMENT].sort()).toEqual(CATALOGUE_DOCUMENTS.map((d) => d.code).sort());
    expect(ok({ formats: [] })).toBe(false);
    expect(ok({ formats: ['exe'] })).toBe(false);
  });

  it('exercice-id-et-empreinte-obligatoires', () => {
    expect(ok({ exerciceId: undefined })).toBe(false);
    expect(ok({ empreinte: undefined })).toBe(false);
    expect(ok({ exerciceId: '' })).toBe(false);
    expect(ok({ empreinte: '' })).toBe(false);
    expect(ok({ empreinte: 'a'.repeat(63) })).toBe(false);
    expect(ok({ empreinte: 'A'.repeat(64) })).toBe(false);
    expect(ok({ empreinte: 'g'.repeat(64) })).toBe(false);
    expect(ok({ version: 0 })).toBe(false);
    expect(ok({ version: 1.5 })).toBe(false);
    expect(ok({ version: Number.NaN })).toBe(false);
  });

  it('deux-rayons-deposes-prepares', () => {
    expect(ok({ rayon: 'prepare', prepareLe: '2026-11-12' })).toBe(true);
    expect(ok({ rayon: 'depose', source: 'depot_personne', prepareLe: undefined, deposeLe: '2026-11-12' })).toBe(true);
    expect(ok({ rayon: 'depose', deposeLe: undefined })).toBe(false);
    expect(ok({ rayon: 'prepare', prepareLe: undefined, deposeLe: '2026-11-12' })).toBe(false);
    expect(ok({ rayon: 'depose', deposeLe: '2026-11-12' })).toBe(false);
    expect(ok({ rayon: 'prepare', source: 'depot_personne' })).toBe(false);
    expect(ok({ rayon: 'depose', deposeLe: '2026-11-12', prepareLe: undefined, source: 'prepare_produit' })).toBe(false);
    expect(ok({ rayon: 'depose', deposeLe: '2026-11-12', prepareLe: undefined, source: 'import_externe' })).toBe(true);
    expect(ok({ source: 'import_externe' })).toBe(true);
    expectTypeOf<(typeof STATUTS_DOCUMENT)[number]>().toEqualTypeOf<StatutDocument>();
    expect(ok({ rayon: 'autre' })).toBe(false);
    expect(ok({ prepareLe: '2026-02-30' })).toBe(false);
    expect(ok({ inconnu: 1 })).toBe(false);
  });
});
