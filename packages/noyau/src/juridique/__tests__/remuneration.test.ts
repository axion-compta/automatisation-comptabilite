import { describe, expect, it } from 'vitest';
import { controlerRemuneration, ErreurRemuneration, type DecisionOrgane } from '../remuneration.js';

// Montants et formes INVENTÉS pour les tests (cas R1).
const FORMES = ['assemblee'];

function decision(parties: Partial<DecisionOrgane> = {}): DecisionOrgane {
  return {
    id: 'dec-1',
    objet: 'remuneration_dirigeant',
    forme: 'assemblee',
    debut: '2026-01-01',
    fin: '2026-12-31',
    montantMaxCentimes: 300_000,
    statut: 'deposee',
    ...parties,
  };
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurRemuneration) return e.code;
    throw e;
  }
  return undefined;
}

const ECR = { date: '2026-06-15', montantCentimes: 300_000 };

describe('controlerRemuneration', () => {
  it('r1-sans-decision-brouillon-et-carte', () => {
    expect(controlerRemuneration(ECR, [], FORMES)).toEqual({ etat: 'brouillon', carte: 'decision_absente' });
  });
  it('r1-decision-couvrante-carte-levee', () => {
    expect(controlerRemuneration(ECR, [decision()], FORMES)).toEqual({ etat: 'proposable', decisionId: 'dec-1' });
    const validee = decision({ statut: 'validee' });
    const r = controlerRemuneration(ECR, [validee], FORMES);
    expect(r).toEqual({ etat: 'proposable', decisionId: 'dec-1' });
    expect(JSON.stringify(r)).not.toContain('validee');
  });
  it('r1-350-000-ecart-50-000', () => {
    expect(controlerRemuneration({ date: '2026-06-15', montantCentimes: 350_000 }, [decision()], FORMES)).toEqual({
      etat: 'brouillon',
      carte: 'ecart_montant',
      ecartCentimes: 50_000,
      decisionId: 'dec-1',
    });
    expect(
      controlerRemuneration({ date: '2026-06-15', montantCentimes: 300_001 }, [decision()], FORMES),
    ).toMatchObject({ carte: 'ecart_montant', ecartCentimes: 1 });
  });
  it('decision-hors-periode-ignoree', () => {
    const attendu = { etat: 'brouillon', carte: 'decision_absente' };
    expect(controlerRemuneration({ date: '2025-12-31', montantCentimes: 1 }, [decision()], FORMES)).toEqual(attendu);
    expect(controlerRemuneration({ date: '2027-01-01', montantCentimes: 1 }, [decision()], FORMES)).toEqual(attendu);
    // Bornes incluses.
    expect(controlerRemuneration({ date: '2026-01-01', montantCentimes: 1 }, [decision()], FORMES).etat).toBe('proposable');
    expect(controlerRemuneration({ date: '2026-12-31', montantCentimes: 1 }, [decision()], FORMES).etat).toBe('proposable');
  });
  it('forme-non-admise-ignoree', () => {
    expect(controlerRemuneration(ECR, [decision({ forme: 'autre_forme' })], FORMES)).toEqual({
      etat: 'brouillon',
      carte: 'decision_absente',
    });
    expect(controlerRemuneration(ECR, [decision()], [])).toEqual({ etat: 'brouillon', carte: 'decision_absente' });
  });
  it('decision-absente-statut-ignoree', () => {
    expect(controlerRemuneration(ECR, [decision({ statut: 'absente' })], FORMES)).toEqual({
      etat: 'brouillon',
      carte: 'decision_absente',
    });
    expect(controlerRemuneration(ECR, [decision({ objet: 'convention' })], FORMES).etat).toBe('brouillon');
    expect(controlerRemuneration(ECR, [decision({ objet: 'autre' })], FORMES).etat).toBe('brouillon');
  });
  it('montant-max-nul-pas-d-ecart', () => {
    const d = decision({ montantMaxCentimes: null });
    expect(controlerRemuneration({ date: '2026-06-15', montantCentimes: 99_999_999 }, [d], FORMES)).toEqual({
      etat: 'proposable',
      decisionId: 'dec-1',
    });
  });
  it('plus-recente-par-debut', () => {
    const a = decision({ id: 'a', debut: '2026-01-01', montantMaxCentimes: 100 });
    const b = decision({ id: 'b', debut: '2026-03-01', montantMaxCentimes: null });
    expect(controlerRemuneration(ECR, [a, b], FORMES)).toEqual({ etat: 'proposable', decisionId: 'b' });
    expect(controlerRemuneration(ECR, [b, a], FORMES)).toEqual({ etat: 'proposable', decisionId: 'b' });
  });
  it('montant-nul-aucune-carte', () => {
    expect(controlerRemuneration({ date: '2026-06-15', montantCentimes: 0 }, [], FORMES)).toEqual({ etat: 'non_remunere' });
    expect(controlerRemuneration({ date: '2026-06-15', montantCentimes: -0 }, [decision()], FORMES)).toEqual({
      etat: 'non_remunere',
    });
  });
  it('refus-des-entrees-invalides', () => {
    for (const m of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => controlerRemuneration({ date: '2026-06-15', montantCentimes: m }, [], FORMES))).toBe(
        'montant_invalide',
      );
    }
    for (const d of ['2026-6-15', '', '2026-13-01', '2026-02-30', '15/06/2026']) {
      expect(code(() => controlerRemuneration({ date: d, montantCentimes: 1 }, [], FORMES))).toBe('date_invalide');
    }
    expect(code(() => controlerRemuneration(ECR, [decision({ debut: '2026-12-31', fin: '2026-01-01' })], FORMES))).toBe(
      'ordre_inverse',
    );
    expect(code(() => controlerRemuneration(ECR, [decision({ debut: 'x' })], FORMES))).toBe('date_invalide');
    expect(code(() => controlerRemuneration(ECR, [decision({ montantMaxCentimes: -5 })], FORMES))).toBe(
      'montant_invalide',
    );
    expect(code(() => controlerRemuneration(ECR, [decision({ montantMaxCentimes: 1.5 })], FORMES))).toBe(
      'montant_invalide',
    );
  });
  it('decisions-meme-debut-ambigues', () => {
    const a = decision({ id: 'a' });
    const b = decision({ id: 'b' });
    expect(code(() => controlerRemuneration(ECR, [a, b], FORMES))).toBe('decisions_ambigues');
    // Même début mais l'une est ignorée (forme non admise) : pas d'ambiguïté.
    expect(controlerRemuneration(ECR, [a, decision({ id: 'b', forme: 'x' })], FORMES)).toEqual({
      etat: 'proposable',
      decisionId: 'a',
    });
  });
  it('ne-modifie-pas-ses-entrees', () => {
    const decisions = Object.freeze([Object.freeze(decision())]);
    expect(() => controlerRemuneration(ECR, decisions, Object.freeze([...FORMES]))).not.toThrow();
  });
});
