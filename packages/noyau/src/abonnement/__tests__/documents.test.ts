import { describe, expect, it } from 'vitest';
import { accepter, acceptationsManquantes, documentEnVigueur, verifierDocument, type DocumentContractuel } from '../documents.js';
import { ErreurAbonnement } from '../types.js';

const EMP = 'a'.repeat(64);
const doc = (type: string, version: number, approuveLe: string, o: Partial<DocumentContractuel> = {}): DocumentContractuel => ({
  type, version, approuveLe, empreinte: EMP, sources: ['source fictive A'], ...o,
});
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
}
const D1 = doc('cgv', 1, '2026-01-01');
const D2 = doc('cgv', 2, '2026-06-01');
const base = { personne: 'Camille Test', organisation: 'Société Exemple', typesRequis: ['cgv'] };
const acc = (version: number, o: Record<string, string> = {}) => ({
  personne: base.personne, organisation: base.organisation, type: 'cgv', version, accepteLe: '2026-02-01', ...o,
});

describe('documents contractuels', () => {
  it('version-en-vigueur-la-plus-haute-approuvee', () => {
    const docs = [D2, D1, doc('autre', 9, '2026-01-01')];
    expect(documentEnVigueur(docs, 'cgv', '2026-06-01')).toBe(D2);
    expect(documentEnVigueur(docs, 'cgv', '2026-05-31')).toBe(D1);
    expect(documentEnVigueur(docs, 'inconnu', '2026-06-01')).toBeNull();
    expect(documentEnVigueur([], 'cgv', '2026-06-01')).toBeNull();
    expect(code(() => documentEnVigueur(docs, 'cgv', '2026-02-30'))).toBe('date_invalide');
  });

  it('version-future-pas-encore-en-vigueur', () => {
    expect(documentEnVigueur([D1, D2], 'cgv', '2025-12-31')).toBeNull();
    expect(documentEnVigueur([D2], 'cgv', '2026-05-31')).toBeNull();
    expect(code(() => acceptationsManquantes({ ...base, documents: [D2], acceptations: [], date: '2026-05-31' }))).toBe('document_absent');
  });

  it('nouvelle-version-demande-nouvelle-acceptation', () => {
    const a = { ...base, documents: [D1, D2], acceptations: [acc(1)] };
    expect(acceptationsManquantes({ ...a, date: '2026-05-31' })).toEqual([]);
    expect(acceptationsManquantes({ ...a, date: '2026-06-01' })).toEqual([{ type: 'cgv', version: 2 }]);
    expect(acceptationsManquantes({ ...a, acceptations: [acc(1), acc(2)], date: '2026-06-01' })).toEqual([]);
    expect(acceptationsManquantes({ ...a, typesRequis: [], date: '2026-06-01' })).toEqual([]);
  });

  it('acceptation-d-une-autre-organisation-ignoree', () => {
    const a = { ...base, documents: [D1], date: '2026-02-01' };
    expect(acceptationsManquantes({ ...a, acceptations: [acc(1, { organisation: 'Autre Société' })] })).toEqual([{ type: 'cgv', version: 1 }]);
    expect(acceptationsManquantes({ ...a, acceptations: [acc(1, { personne: 'Alix Test' })] })).toEqual([{ type: 'cgv', version: 1 }]);
    expect(acceptationsManquantes({ ...a, acceptations: [acc(1, { type: 'autre' })] })).toEqual([{ type: 'cgv', version: 1 }]);
  });

  it('type-requis-sans-document-refuse', () => {
    const a = { ...base, documents: [D1], acceptations: [acc(1)], date: '2026-02-01' };
    expect(code(() => acceptationsManquantes({ ...a, typesRequis: ['cgv', 'dpa'] }))).toBe('document_absent');
    expect(code(() => acceptationsManquantes({ ...a, documents: [] }))).toBe('document_absent');
  });

  it('accepter-version-perimee-refuse', () => {
    const o = { documents: [D1, D2], personne: base.personne, organisation: base.organisation, type: 'cgv' };
    const ok = accepter({ ...o, version: 2, horodatage: '2026-06-01T08:00:00Z' });
    expect(ok.acceptation).toEqual({ personne: base.personne, organisation: base.organisation, type: 'cgv', version: 2, accepteLe: '2026-06-01' });
    expect(ok.evenement.type).toBe('acceptation.enregistree');
    expect(ok.evenement.horodatage).toBe('2026-06-01T08:00:00Z');
    expect(code(() => accepter({ ...o, version: 1, horodatage: '2026-06-01T08:00:00Z' }))).toBe('version_perimee');
    expect(code(() => accepter({ ...o, version: 2, horodatage: '2026-05-31T23:59:59Z' }))).toBe('version_perimee');
    expect(code(() => accepter({ ...o, type: 'dpa', version: 1, horodatage: '2026-06-01T08:00:00Z' }))).toBe('document_absent');
    expect(code(() => accepter({ ...o, personne: ' ', version: 2, horodatage: '2026-06-01T08:00:00Z' }))).toBe('auteur_manquant');
    expect(code(() => accepter({ ...o, organisation: '', version: 2, horodatage: '2026-06-01T08:00:00Z' }))).toBe('auteur_manquant');
    expect(code(() => accepter({ ...o, version: 2, horodatage: 'hier' }))).toBe('horodatage_invalide');
  });

  it('document-sans-source-refuse', () => {
    expect(code(() => verifierDocument(D1))).toBeUndefined();
    for (const d of [
      doc('cgv', 1, '2026-01-01', { sources: [] }), doc('cgv', 1, '2026-01-01', { sources: ['source fictive A', ' '] }),
      doc('', 1, '2026-01-01'), doc(' ', 1, '2026-01-01'), doc('cgv', 0, '2026-01-01'), doc('cgv', 1.5, '2026-01-01'),
      doc('cgv', NaN, '2026-01-01'), doc('cgv', Infinity, '2026-01-01'),
    ]) expect(code(() => verifierDocument(d))).toBe('parametre_invalide');
    expect(code(() => verifierDocument(doc('cgv', 1, '2026-02-30')))).toBe('date_invalide');
    expect(code(() => verifierDocument(doc('cgv', 1, '2026-01-01', { empreinte: 'xyz' })))).toBe('empreinte_invalide');
    expect(code(() => documentEnVigueur([doc('cgv', 1, '2026-01-01', { sources: [] })], 'cgv', '2026-06-01'))).toBe('parametre_invalide');
  });

  it('doublon-type-version-refuse', () => {
    const dup = doc('cgv', 1, '2026-03-01');
    expect(code(() => documentEnVigueur([D1, dup], 'cgv', '2026-06-01'))).toBe('parametre_invalide');
    expect(code(() => documentEnVigueur([D1, dup], 'cgv', '2025-01-01'))).toBe('parametre_invalide');
    expect(code(() => documentEnVigueur([D1, doc('autre', 1, '2026-01-01')], 'cgv', '2026-06-01'))).toBeUndefined();
  });
});
