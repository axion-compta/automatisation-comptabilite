import { describe, expect, it } from 'vitest';
import { ErreurMention, etatMention, natureAutorisee } from '../mention.js';

const n = (mode: string, exerciceStatut: string, demande: string, type: string) =>
  natureAutorisee({ mode, exerciceStatut, demande, type } as never);
const m = (e: object) => etatMention(e as never);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurMention ? e.code : 'autre';
  }
  return undefined;
};
const OK = { ok: true, nature: 'officiel' };
const refus = (c: string) => ({ ok: false, code: c });
const VAL = { par: 'Camille Fictif', le: '2026-03-01' };
const V = { validePar: VAL.par, valideLe: VAL.le };

describe('mention', () => {
  it('officiel-refuse-en-saisie-seule', () => {
    const cas: [string, string, string, unknown][] = [
      ['saisie_seule', 'cloture', 'etat', refus('mode_saisie_seule')],
      ['saisie_seule', 'cloture', 'fec', OK],
      ['saisie_seule', 'cloture', 'declaration', OK],
      ['saisie_seule', 'cloture', 'paquet', OK],
      ['autonome', 'cloture', 'etat', OK],
      ['expert_complet', 'cloture', 'etat', OK],
      ['saisie_seule', 'ouvert', 'etat', refus('mode_saisie_seule')],
    ];
    for (const [mode, ex, type, attendu] of cas) {
      expect(n(mode, ex, 'officiel', type)).toEqual(attendu);
    }
  });
  it('officiel-refuse-exercice-ouvert', () => {
    for (const ex of ['ouvert', 'en_cloture', 'rouvert']) {
      for (const type of ['etat', 'fec']) {
        expect(n('expert_complet', ex, 'officiel', type)).toEqual(refus('exercice_non_cloture'));
      }
      for (const type of ['declaration', 'paquet']) {
        expect(n('expert_complet', ex, 'officiel', type)).toEqual(OK);
      }
    }
    expect(n('autonome', 'cloture', 'officiel', 'fec')).toEqual(OK);
  });
  it('indicatif-toujours-permis', () => {
    for (const mode of ['autonome', 'expert_complet', 'saisie_seule']) {
      for (const ex of ['ouvert', 'en_cloture', 'cloture', 'rouvert']) {
        for (const type of ['fec', 'etat', 'declaration', 'paquet']) {
          for (const d of ['indicatif', 'travail']) {
            expect(n(mode, ex, d, type)).toEqual({ ok: true, nature: d });
          }
        }
      }
    }
  });
  it('valeur-inconnue-refusee', () => {
    const args = ['expert_complet', 'cloture', 'officiel', 'etat'];
    for (let i = 0; i < 4; i++) {
      const a = args.map((v, j) => (j === i ? 'x' : v));
      expect(code(() => n(a[0]!, a[1]!, a[2]!, a[3]!))).toBe('valeur_inconnue');
    }
    expect(code(() => m({ statut: 'x', nature: 'officiel' }))).toBe('valeur_inconnue');
    expect(code(() => m({ statut: 'brouillon', nature: 'x' }))).toBe('valeur_inconnue');
  });
  it('filigrane-tant-que-non-valide', () => {
    const cas: [string, string, string][] = [
      ['brouillon', 'officiel', 'a_valider'],
      ['a_valider', 'officiel', 'a_valider'],
      ['brouillon', 'travail', 'non_officiel'],
      ['a_valider', 'travail', 'non_officiel'],
    ];
    for (const [statut, nature, filigrane] of cas) {
      expect(m({ statut, nature })).toEqual({ mention: 'prepare_par_ia', filigrane });
    }
  });
  it('valide-sans-filigrane-avec-validateur', () => {
    expect(m({ statut: 'valide', nature: 'officiel', ...V })).toEqual({
      mention: 'prepare_par_ia',
      validation: VAL,
      filigrane: 'aucun',
    });
  });
  it('indicatif-garde-son-filigrane', () => {
    for (const statut of ['brouillon', 'a_valider', 'valide']) {
      expect(m({ statut, nature: 'indicatif', ...V }).filigrane).toBe('indicatif');
    }
    expect(m({ statut: 'valide', nature: 'travail', ...V }).filigrane).toBe('non_officiel');
    expect(m({ statut: 'valide', nature: 'indicatif', ...V }).validation).toEqual(VAL);
  });
  it('validation-incomplete-refusee', () => {
    const base = { statut: 'valide', nature: 'officiel' };
    const cas = [
      {},
      { validePar: 'Camille Fictif' },
      { valideLe: '2026-03-01' },
      { validePar: '   ', valideLe: '2026-03-01' },
      { validePar: 'Camille Fictif', valideLe: ' ' },
      { validePar: '', valideLe: '' },
    ];
    for (const c of cas) expect(code(() => m({ ...base, ...c }))).toBe('validation_incomplete');
  });
  it('mention-expert-complet-officiel-permis', () => {
    expect(n('expert_complet', 'cloture', 'officiel', 'etat')).toEqual(OK);
    expect(n('expert_complet', 'cloture', 'officiel', 'fec')).toEqual(OK);
    expect(n('expert_complet', 'ouvert', 'officiel', 'etat')).toEqual(refus('exercice_non_cloture'));
    expect(code(() => n('assiste', 'cloture', 'officiel', 'etat'))).toBe('valeur_inconnue');
  });
});
