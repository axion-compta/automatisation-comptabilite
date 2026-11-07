import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../ecritures/modele.js';
import {
  controlesAvantCloture,
  ErreurCloture,
  evaluerQuestionnaire,
  type EntreeControles,
} from '../avant-cloture.js';

// Sujets, préfixes et comptes fictifs, passés en argument.
const CONFIG = { sujetsAttendus: ['sujet-a', 'sujet-b'], sujetsCouverts: ['sujet-a'] };
const q = (sujet: string, reponse: 'oui' | 'non' | 'neant', nomRepondant?: string) => ({ sujet, reponse, nomRepondant });
const bloc = (sujet: string, code: 'sujet_non_couvert' | 'neant_sans_nom' | 'sans_reponse') => ({ sujet, code });

describe('questionnaire avant clôture', () => {
  it('oui-sur-sujet-non-couvert-bloque', () => {
    const r = evaluerQuestionnaire([q('sujet-a', 'non'), q('sujet-b', 'oui')], CONFIG);
    expect(r).toEqual({ ok: false, bloquants: [bloc('sujet-b', 'sujet_non_couvert')] });
  });
  it('neant-sans-nom-bloque', () => {
    for (const nom of [undefined, '', '   ', '\t ']) {
      const r = evaluerQuestionnaire([q('sujet-a', 'non'), q('sujet-b', 'neant', nom)], CONFIG);
      expect(r.bloquants).toEqual([bloc('sujet-b', 'neant_sans_nom')]);
      expect(r.ok).toBe(false);
    }
  });
  it('sujet-sans-reponse-bloque', () => {
    const r = evaluerQuestionnaire([q('sujet-a', 'non')], CONFIG);
    expect(r).toEqual({ ok: false, bloquants: [bloc('sujet-b', 'sans_reponse')] });
  });
  it('questionnaire-complet-ok', () => {
    const r = evaluerQuestionnaire(
      [{ ...q('sujet-a', 'oui', 'Alice Exemple'), date: '2026-12-01' }, q('sujet-b', 'neant', 'Alice Exemple')],
      CONFIG,
    );
    expect(r).toEqual({ ok: true, bloquants: [] });
  });
  it('derniere-reponse-compte', () => {
    const a = q('sujet-a', 'non');
    expect(evaluerQuestionnaire([q('sujet-b', 'oui'), q('sujet-b', 'non'), a], CONFIG).ok).toBe(true);
    const inverse = evaluerQuestionnaire([q('sujet-b', 'non'), q('sujet-b', 'oui'), a], CONFIG);
    expect(inverse.bloquants).toEqual([bloc('sujet-b', 'sujet_non_couvert')]);
  });
  it('oui-sur-sujet-couvert-ou-inattendu', () => {
    expect(evaluerQuestionnaire([q('sujet-a', 'oui'), q('sujet-b', 'non')], CONFIG).ok).toBe(true);
    const inattendu = evaluerQuestionnaire([q('sujet-a', 'non'), q('sujet-b', 'non'), q('sujet-z', 'oui')], CONFIG);
    expect(inattendu.bloquants).toEqual([bloc('sujet-z', 'sujet_non_couvert')]);
  });
  it('questionnaire-vide-tout-sans-reponse', () => {
    const r = evaluerQuestionnaire([], CONFIG);
    expect(r.bloquants.map((b) => b.sujet)).toEqual(['sujet-a', 'sujet-b']);
    expect(evaluerQuestionnaire([], { sujetsAttendus: [], sujetsCouverts: [] })).toEqual({ ok: true, bloquants: [] });
  });
});

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Libellé fictif', debit: centimes(debit), credit: centimes(credit) };
}
function ecr(id: string, statut: StatutEcriture, lignes: LigneEcriture[]): Ecriture {
  return { id, numero: id, date: '2026-03-01', journal: 'OD', statut, lignes };
}
const EQ = [ligne('A100', 5000, 0), ligne('B200', 0, 5000)];
function entree(ecritures: Ecriture[], over: Partial<EntreeControles> = {}): EntreeControles {
  return {
    ecritures,
    prefixeAttente: 'ATT',
    prefixeBanque: 'BQ',
    soldeReleve: centimes(0),
    immobilisationsRevues: true,
    ...over,
  };
}
const parId = (c: ReturnType<typeof controlesAvantCloture>, id: string) => c.find((x) => x.id === id);

describe('contrôles avant clôture', () => {
  it('brouillons-comptes-clo-01', () => {
    const c = controlesAvantCloture(
      entree([ecr('e1', 'brouillon', EQ), ecr('e2', 'brouillon', EQ), ecr('e3', 'valide', EQ)]),
    );
    expect(parId(c, 'CLO-01')).toMatchObject({ ok: false, valeur: '2' });
    expect(parId(controlesAvantCloture(entree([ecr('e3', 'valide', EQ)])), 'CLO-01')).toMatchObject({
      ok: true,
      valeur: '0',
    });
  });
  it('attente-non-soldee-clo-02', () => {
    const e = ecr('e1', 'valide', [ligne('ATT1', 1234, 0), ligne('ATT2', 0, 34), ligne('B200', 0, 1200)]);
    const c = parId(controlesAvantCloture(entree([e])), 'CLO-02');
    expect(c).toMatchObject({ ok: false, valeur: '12,68', ecartCentimes: 1268 });
    const solde = ecr('e2', 'valide', [ligne('ATT1', 500, 0), ligne('ATT1', 0, 500)]);
    expect(parId(controlesAvantCloture(entree([solde])), 'CLO-02')).toMatchObject({ ok: true, valeur: '0,00' });
  });
  it('banque-differente-du-releve-clo-03', () => {
    const e = ecr('e1', 'valide', [ligne('BQ1', 10000, 0), ligne('B200', 0, 10000)]);
    const bon = parId(controlesAvantCloture(entree([e], { soldeReleve: centimes(10000) })), 'CLO-03');
    expect(bon).toMatchObject({ ok: true, valeur: '0,00', ecartCentimes: 0 });
    const ecart = parId(controlesAvantCloture(entree([e], { soldeReleve: centimes(9900) })), 'CLO-03');
    expect(ecart).toMatchObject({ ok: false, valeur: '1,00', ecartCentimes: 100 });
    const inverse = parId(controlesAvantCloture(entree([e], { soldeReleve: centimes(10100) })), 'CLO-03');
    expect(inverse).toMatchObject({ ok: false, valeur: '-1,00', ecartCentimes: -100 });
  });
  it('tout-vert-valeurs-chiffrees', () => {
    const c = controlesAvantCloture(entree([ecr('e1', 'valide', EQ)]));
    expect(c.map((x) => x.id)).toEqual(['CLO-01', 'CLO-02', 'CLO-03', 'CLO-04', 'CLO-05']);
    expect(c.every((x) => x.ok)).toBe(true);
    expect(c.map((x) => x.valeur)).toEqual(['0', '0,00', '0,00', '0,00', 'oui']);
  });
  it('balance-desequilibree-clo-04', () => {
    const c = controlesAvantCloture(entree([ecr('e1', 'valide', [ligne('A100', 700, 0), ligne('B200', 0, 500)])]));
    expect(parId(c, 'CLO-04')).toMatchObject({ ok: false, valeur: '2,00', ecartCentimes: 200 });
  });
  it('immobilisations-non-revues-clo-05', () => {
    const c = controlesAvantCloture(entree([], { immobilisationsRevues: false }));
    expect(parId(c, 'CLO-05')).toMatchObject({ ok: false, valeur: 'non' });
  });
  it('aucune-ecriture-ok-sauf-clo-05', () => {
    const c = controlesAvantCloture(entree([], { immobilisationsRevues: false }));
    expect(c.filter((x) => !x.ok).map((x) => x.id)).toEqual(['CLO-05']);
  });
  it('prefixe-vide-ou-releve-invalide-refuse', () => {
    for (const p of ['', '  ']) {
      expect(() => controlesAvantCloture(entree([], { prefixeAttente: p }))).toThrow(ErreurCloture);
      expect(() => controlesAvantCloture(entree([], { prefixeBanque: p }))).toThrow(ErreurCloture);
    }
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => controlesAvantCloture(entree([], { soldeReleve: mauvais as never }))).toThrow(ErreurCloture);
    }
  });
  it('seules-les-ecritures-validees-comptent-dans-les-soldes', () => {
    const e = ecr('e1', 'propose', [ligne('ATT1', 900, 0), ligne('B200', 0, 900)]);
    const c = controlesAvantCloture(entree([e]));
    expect(parId(c, 'CLO-02')).toMatchObject({ ok: true });
    expect(parId(c, 'CLO-01')).toMatchObject({ ok: true, valeur: '0' });
  });
});
