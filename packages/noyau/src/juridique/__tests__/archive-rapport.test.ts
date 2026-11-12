import { describe, expect, it } from 'vitest';
import { ErreurMention } from '../../documents/mention.js';
import { ErreurArchiveRapport, documentRapport, entreeArchive, verifierArchive } from '../archive-rapport.js';

// Rapport fictif de la société SIREN 987654324 ; rubriques inventées.
const EX = 'ex-987654324-2026';
const rubriques = [
  { code: 'loyers', texte: 'Rubrique B' },
  { code: 'activite', texte: 'Rubrique A' },
] as const;
const VALIDATION = { par: 'Camille Exemple', le: '2027-03-10' };
const octets = (t: string): Uint8Array => new TextEncoder().encode(t);
const doc = (validation: { par: string; le: string } | null = VALIDATION) =>
  documentRapport({ type: 'sci', exerciceId: EX, rubriques, validation });
const codeDe = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurArchiveRapport ? e.code : 'autre';
  }
  return undefined;
};

describe('archive des rapports (noyau)', () => {
  it('filigrane-avant-validation', () => {
    const d = doc(null);
    expect(d.filigrane).toBe('a_valider');
    expect(d.validation).toBeUndefined();
    expect(d.mention).toBe('prepare_par_ia');
  });

  it('sans-filigrane-apres-validation', () => {
    const d = doc();
    expect(d.filigrane).toBe('aucun');
    expect(d.validation).toEqual(VALIDATION);
  });

  it('validation-incomplete-refusee', () => {
    for (const v of [{ par: '', le: '2027-03-10' }, { par: 'Camille Exemple', le: ' ' }]) {
      expect(() => doc(v)).toThrow(ErreurMention);
    }
  });

  it('greffe-une-seule-fois', () => {
    expect(doc().mentions).toEqual(['pas_de_depot_greffe']);
    expect(doc(null).mentions).toEqual(['pas_de_depot_greffe']);
  });

  it('rubriques-inchangees', () => {
    expect(doc().rubriques.map((r) => r.code)).toEqual(['loyers', 'activite']);
    expect(doc().rubriques).toEqual(rubriques);
  });

  it('s1-empreinte-recalculee-identique', () => {
    const rendu = octets('PDF fictif');
    const e = entreeArchive(rendu, doc(), '2027-03-11');
    expect(e.nom).toBe(`rapport-sci-${EX}.pdf`);
    expect(e).toMatchObject({ par: 'Camille Exemple', valideLe: '2027-03-10', archiveLe: '2027-03-11' });
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(verifierArchive(rendu, e).ok).toBe(true);
    const modifie = Uint8Array.from(rendu);
    modifie[0] = (modifie[0] ?? 0) ^ 1;
    expect(verifierArchive(modifie, e).ok).toBe(false);
    expect(verifierArchive(octets('Autre rendu'), e).ok).toBe(false);
  });

  it('archive-refusee-sans-validation', () => {
    expect(codeDe(() => entreeArchive(octets('x'), doc(null), '2027-03-11'))).toBe('non_valide');
  });

  it('cas-limites-entree', () => {
    expect(codeDe(() => entreeArchive(new Uint8Array(0), doc(), '2027-03-11'))).toBe('octets_vides');
    for (const le of ['2027-02-30', '2027-03-09', '', '11/03/2027', '2027-3-11']) {
      expect(codeDe(() => entreeArchive(octets('x'), doc(), le))).toBe('date_invalide');
    }
    expect(entreeArchive(octets('x'), doc(), VALIDATION.le).archiveLe).toBe(VALIDATION.le);
    const vide = documentRapport({ type: 'gestion', exerciceId: '', rubriques, validation: VALIDATION });
    expect(codeDe(() => entreeArchive(octets('x'), vide, '2027-03-11'))).toBe('exercice_vide');
  });
});
