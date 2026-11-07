import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { controleDividendeGerant, ErreurDividendeGerant, leverBlocage } from '../gerant-majoritaire.js';

// Seuil INVENTÉ pour les tests (points de base) ; noms fictifs.
const SEUIL = 1200;
type Surcharge = Partial<Record<'parts' | 'total' | 'cc' | 'ccConjoint' | 'dividende' | 'dividendeConjoint', number>>;

function cas(o: Surcharge = {}, role = 'gerant_majoritaire', forme = 'SARL') {
  const v = { parts: 10000, total: 10000, cc: 0, ccConjoint: 0, dividende: 0, dividendeConjoint: 0, ...o };
  const associes: Array<Record<string, unknown>> = [{ id: 'a1', parts: v.parts, role }];
  if (v.total > v.parts) associes.push({ id: 'a2', parts: v.total - v.parts, role: 'associe' });
  associes.push({ id: 'c1', parts: 0, role: 'associe', lienAvec: 'a1', lien: 'conjoint' });
  associes.push({ id: 'x1', parts: 0, role: 'associe', lienAvec: 'a2', lien: 'conjoint' });
  return {
    forme,
    beneficiaireId: 'a1',
    associes,
    capital: centimes(1000000),
    primes: centimes(0),
    comptesCourants: { a1: centimes(v.cc), c1: centimes(v.ccConjoint), x1: centimes(999999) },
    dividendes: { a1: centimes(v.dividende), c1: centimes(v.dividendeConjoint), x1: centimes(888888) },
  } as unknown as Parameters<typeof controleDividendeGerant>[0];
}

describe('dividende du gérant majoritaire', () => {
  it('associe-unique-bloquant', () => {
    expect(controleDividendeGerant(cas({ dividende: 150000 }), SEUIL)).toMatchObject({
      statut: 'bloquant',
      base: 1000000,
      seuil: 120000,
      dividendeGroupe: 150000,
      excedent: 30000,
    });
  });
  it('egal-au-seuil-passe', () => {
    expect(controleDividendeGerant(cas({ dividende: 120000 }), SEUIL)).toMatchObject({ statut: 'passe', excedent: 0 });
  });
  it('un-centime-au-dela-bloque', () => {
    expect(controleDividendeGerant(cas({ dividende: 120001 }), SEUIL)).toMatchObject({ statut: 'bloquant', excedent: 1 });
  });
  it('compte-courant-dans-la-base', () => {
    const r = controleDividendeGerant(cas({ cc: 500000, dividende: 150000 }), SEUIL);
    expect(r).toMatchObject({ statut: 'passe', base: 1500000, seuil: 180000 });
  });
  it('parts-partielles', () => {
    expect(controleDividendeGerant(cas({ parts: 6000, dividende: 72000 }), SEUIL)).toMatchObject({ statut: 'passe', seuil: 72000 });
    expect(controleDividendeGerant(cas({ parts: 6000, dividende: 72001 }), SEUIL)).toMatchObject({ statut: 'bloquant' });
  });
  it('conjoint-inclus', () => {
    // Le compte courant et le dividende de l'associé lié à un AUTRE associé restent hors groupe.
    const r = controleDividendeGerant(cas({ parts: 6000, ccConjoint: 200000, dividende: 96000 }), SEUIL);
    expect(r).toMatchObject({ statut: 'passe', base: 800000, seuil: 96000, dividendeGroupe: 96000 });
    const b = controleDividendeGerant(cas({ parts: 6000, ccConjoint: 200000, dividende: 90000, dividendeConjoint: 6001 }), SEUIL);
    expect(b).toMatchObject({ statut: 'bloquant', dividendeGroupe: 96001, excedent: 1 });
  });
  it('arrondis-vers-le-bas-base-et-seuil', () => {
    // 1 part sur 3 : 1 000 000 / 3 = 333 333,33 vers le bas ; seuil 39 999,96 vers le bas.
    expect(controleDividendeGerant(cas({ parts: 1, total: 3 }), SEUIL)).toMatchObject({ base: 333333, seuil: 39999 });
    // Base 1 000 001 : seuil 120 000,12 vers le bas.
    expect(controleDividendeGerant(cas({ cc: 1 }), SEUIL)).toMatchObject({ base: 1000001, seuil: 120000 });
  });
  it('compte-courant-debiteur-hors-base', () => {
    const r = controleDividendeGerant(cas({ cc: -500000, ccConjoint: -200000 }), SEUIL);
    expect(r).toMatchObject({ base: 1000000, seuil: 120000 });
  });
  it('non-majoritaire-non-applicable', () => {
    for (const role of ['gerant_egalitaire', 'gerant_minoritaire']) {
      const r = controleDividendeGerant(cas({ parts: 5000, dividende: 999999 }, role), SEUIL);
      expect(r).toMatchObject({ statut: 'non_applicable', raison: 'role_non_majoritaire' });
    }
    const autre = controleDividendeGerant(cas({ dividende: 999999 }, 'gerant_majoritaire', 'SAS'), SEUIL);
    expect(autre).toMatchObject({ statut: 'non_applicable', raison: 'forme_non_sarl' });
  });
  it('confirmation-nommee-sans-nom-refusee', () => {
    const bloque = controleDividendeGerant(cas({ dividende: 150000 }), SEUIL);
    for (const [nom, date] of [['', '2026-01-02'], ['  ', '2026-01-02'], ['Alice Exemple', ''], ['Alice Exemple', ' ']]) {
      expect(() => leverBlocage(bloque, { type: 'confirmation_nommee', nom: nom!, date: date! })).toThrow(ErreurDividendeGerant);
    }
    const ok = leverBlocage(bloque, { type: 'confirmation_nommee', nom: 'Alice Exemple', date: '2026-01-02' });
    expect(ok).toMatchObject({ statut: 'passe', levee: 'confirmation_nommee' });
    expect(leverBlocage(bloque, { type: 'dividende_reduit', dividende: centimes(120000) })).toMatchObject({ statut: 'passe', levee: 'dividende_reduit' });
    expect(() => leverBlocage(bloque, { type: 'dividende_reduit', dividende: centimes(120001) })).toThrow(ErreurDividendeGerant);
    expect(() => leverBlocage(ok, { type: 'dividende_reduit', dividende: centimes(1) })).toThrow(ErreurDividendeGerant);
  });
  it('entrees-invalides', () => {
    expect(() => controleDividendeGerant(cas({ parts: 0, total: 0 }), SEUIL)).toThrow(ErreurDividendeGerant);
    for (const parts of [Number.NaN, 1.5]) expect(() => controleDividendeGerant(cas({ parts }), SEUIL)).toThrow(ErreurDividendeGerant);
    for (const s of [-1, Number.POSITIVE_INFINITY, Number.NaN, 1.5]) {
      expect(() => controleDividendeGerant(cas(), s)).toThrow(ErreurDividendeGerant);
    }
    const inconnu = { ...cas(), beneficiaireId: 'zz' };
    expect(() => controleDividendeGerant(inconnu, SEUIL)).toThrow(ErreurDividendeGerant);
  });
});
