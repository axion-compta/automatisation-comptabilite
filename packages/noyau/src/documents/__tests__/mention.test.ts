import { describe, expect, it } from 'vitest';
import {
  ErreurMention,
  etatMention,
  natureAutorisee,
  type ModeTravail,
  type NatureDocument,
} from '../mention.js';

type Statut = 'brouillon' | 'a_valider' | 'valide';
const MODES: ModeTravail[] = ['autonome', 'assiste', 'saisie_seule'];
const EXERCICES = ['ouvert', 'en_cloture', 'cloture', 'rouvert'] as const;
const TYPES = ['fec', 'etat', 'declaration', 'paquet'] as const;

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurMention);
    return (e as ErreurMention).code;
  }
  return undefined;
}

describe('mention', () => {
  it('officiel-refuse-en-saisie-seule', () => {
    expect(
      natureAutorisee({
        mode: 'saisie_seule',
        exerciceStatut: 'cloture',
        demande: 'officiel',
        type: 'etat',
      }),
    ).toEqual({ ok: false, code: 'mode_saisie_seule' });
    // Pas de refus de mode pour les autres types ni les autres modes.
    for (const type of ['fec', 'declaration', 'paquet'] as const) {
      expect(
        natureAutorisee({
          mode: 'saisie_seule',
          exerciceStatut: 'cloture',
          demande: 'officiel',
          type,
        }),
      ).toEqual({ ok: true, nature: 'officiel' });
    }
    for (const mode of ['autonome', 'assiste'] as const) {
      expect(
        natureAutorisee({
          mode,
          exerciceStatut: 'cloture',
          demande: 'officiel',
          type: 'etat',
        }),
      ).toEqual({ ok: true, nature: 'officiel' });
    }
    // Le mode passe avant l'exercice.
    expect(
      natureAutorisee({
        mode: 'saisie_seule',
        exerciceStatut: 'ouvert',
        demande: 'officiel',
        type: 'etat',
      }),
    ).toEqual({ ok: false, code: 'mode_saisie_seule' });
  });

  it('officiel-refuse-exercice-ouvert', () => {
    for (const exerciceStatut of ['ouvert', 'en_cloture', 'rouvert'] as const) {
      for (const type of ['etat', 'fec'] as const) {
        expect(
          natureAutorisee({
            mode: 'assiste',
            exerciceStatut,
            demande: 'officiel',
            type,
          }),
        ).toEqual({ ok: false, code: 'exercice_non_cloture' });
      }
      for (const type of ['declaration', 'paquet'] as const) {
        expect(
          natureAutorisee({
            mode: 'assiste',
            exerciceStatut,
            demande: 'officiel',
            type,
          }).ok,
        ).toBe(true);
      }
    }
    expect(
      natureAutorisee({
        mode: 'autonome',
        exerciceStatut: 'cloture',
        demande: 'officiel',
        type: 'fec',
      }),
    ).toEqual({ ok: true, nature: 'officiel' });
  });

  it('indicatif-toujours-permis', () => {
    for (const mode of MODES) {
      for (const exerciceStatut of EXERCICES) {
        for (const type of TYPES) {
          for (const demande of ['indicatif', 'travail'] as const) {
            expect(natureAutorisee({ mode, exerciceStatut, demande, type })).toEqual({
              ok: true,
              nature: demande,
            });
          }
        }
      }
    }
  });

  it('valeur-inconnue-refusee', () => {
    const base = {
      mode: 'assiste',
      exerciceStatut: 'cloture',
      demande: 'officiel',
      type: 'etat',
    } as const;
    expect(code(() => natureAutorisee({ ...base, mode: 'x' as never }))).toBe('valeur_inconnue');
    expect(code(() => natureAutorisee({ ...base, exerciceStatut: 'x' as never }))).toBe(
      'valeur_inconnue',
    );
    expect(code(() => natureAutorisee({ ...base, demande: 'x' as never }))).toBe('valeur_inconnue');
    expect(code(() => natureAutorisee({ ...base, type: 'x' as never }))).toBe('valeur_inconnue');
    expect(code(() => etatMention({ statut: 'x' as never, nature: 'officiel' }))).toBe(
      'valeur_inconnue',
    );
    expect(code(() => etatMention({ statut: 'brouillon', nature: 'x' as never }))).toBe(
      'valeur_inconnue',
    );
  });

  it('filigrane-tant-que-non-valide', () => {
    for (const statut of ['brouillon', 'a_valider'] as const) {
      expect(etatMention({ statut, nature: 'officiel' })).toEqual({
        mention: 'prepare_par_ia',
        filigrane: 'a_valider',
      });
    }
    // Vue de travail : toujours « non officiel ».
    expect(etatMention({ statut: 'brouillon', nature: 'travail' })).toEqual({
      mention: 'prepare_par_ia',
      filigrane: 'non_officiel',
    });
  });

  it('valide-sans-filigrane-avec-validateur', () => {
    expect(
      etatMention({
        statut: 'valide',
        nature: 'officiel',
        validePar: 'Camille Fictif',
        valideLe: '2026-03-01',
      }),
    ).toEqual({
      mention: 'prepare_par_ia',
      validation: { par: 'Camille Fictif', le: '2026-03-01' },
      filigrane: 'aucun',
    });
  });

  it('indicatif-garde-son-filigrane', () => {
    const v = { validePar: 'Camille Fictif', valideLe: '2026-03-01' };
    for (const statut of ['brouillon', 'a_valider', 'valide'] as Statut[]) {
      const nature: NatureDocument = 'indicatif';
      expect(etatMention({ statut, nature, ...v }).filigrane).toBe('indicatif');
    }
    expect(etatMention({ statut: 'valide', nature: 'travail', ...v }).filigrane).toBe(
      'non_officiel',
    );
    expect(etatMention({ statut: 'valide', nature: 'indicatif', ...v }).validation).toEqual({
      par: 'Camille Fictif',
      le: '2026-03-01',
    });
  });

  it('validation-incomplete-refusee', () => {
    const base = { statut: 'valide', nature: 'officiel' } as const;
    expect(code(() => etatMention(base))).toBe('validation_incomplete');
    expect(code(() => etatMention({ ...base, validePar: 'Camille Fictif' }))).toBe(
      'validation_incomplete',
    );
    expect(code(() => etatMention({ ...base, valideLe: '2026-03-01' }))).toBe(
      'validation_incomplete',
    );
    expect(code(() => etatMention({ ...base, validePar: '   ', valideLe: '2026-03-01' }))).toBe(
      'validation_incomplete',
    );
    expect(code(() => etatMention({ ...base, validePar: 'Camille Fictif', valideLe: ' ' }))).toBe(
      'validation_incomplete',
    );
    expect(code(() => etatMention({ ...base, validePar: '', valideLe: '' }))).toBe(
      'validation_incomplete',
    );
  });
});
