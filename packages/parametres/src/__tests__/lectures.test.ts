import { describe, expect, it } from 'vitest';
import { ErreurLecture, ajouterLecture, motifsStatut, statutCalcule, type Lecture } from '../lectures.js';

const CLE = 'cle_exemple';
const base: Lecture = {
  parametreCle: CLE,
  lecteur: { id: 'agent-un', modele: 'modele-a', version: 'v-a' },
  sourceUrl: 'https://www.legifrance.gouv.fr/exemple',
  extrait: 'Extrait inventé',
  valeurLue: 'valeur-x',
  luLe: '2026-06-01',
  complete: true,
  conclusion: 'concorde',
};
const l1: Lecture = base;
const l2: Lecture = { ...base, lecteur: { id: 'agent-deux', modele: 'modele-b', version: 'v-b' }, luLe: '2026-06-02' };
const personne = { id: 'personne-un', type: 'personne' as const };
const agent = { id: 'agent-un', type: 'agent' as const };
const journalDe = (...ls: Lecture[]) => ls.reduce<readonly Lecture[]>((j, l) => ajouterLecture(j, l), []);

describe('journal des lectures', () => {
  it('aucune-lecture-non-verifie', () => {
    expect(statutCalcule([], CLE, null)).toBe('non_verifie');
    expect(statutCalcule(journalDe({ ...l1, parametreCle: 'autre' }), CLE, personne)).toBe('non_verifie');
  });
  it('une-lecture-a-verifier', () => {
    const j = journalDe(l1);
    expect(statutCalcule(j, CLE, personne)).toBe('a_verifier');
    expect(motifsStatut(j, CLE, personne)).toContain('une_seule_lecture');
  });
  it('partielle-ne-compte-pas', () => {
    const j = journalDe(l1, { ...l2, complete: false });
    expect(statutCalcule(j, CLE, personne)).toBe('a_verifier');
    const m = motifsStatut(j, CLE, personne);
    expect(m).toContain('lecture_partielle');
    expect(m).toContain('une_seule_lecture');
  });
  it('meme-lecteur-deux-fois', () => {
    const j = journalDe(l1, { ...l1, luLe: '2026-06-03' });
    expect(statutCalcule(j, CLE, personne)).toBe('a_verifier');
    expect(motifsStatut(j, CLE, personne)).toContain('lecteurs_identiques');
  });
  it('desaccord-a-verifier', () => {
    const autre = journalDe(l1, { ...l2, valeurLue: 'valeur-y' });
    expect(statutCalcule(autre, CLE, personne)).toBe('a_verifier');
    expect(motifsStatut(autre, CLE, personne)).toContain('desaccord');
    const differe = journalDe(l1, l2, { ...l2, lecteur: { ...l2.lecteur, id: 'agent-trois' }, luLe: '2026-06-09', conclusion: 'differe' });
    expect(statutCalcule(differe, CLE, personne)).toBe('a_verifier');
    expect(motifsStatut(differe, CLE, personne)).toContain('desaccord');
  });
  it('differe-ancien-ne-bloque-pas', () => {
    const j = journalDe({ ...l2, lecteur: { ...l2.lecteur, id: 'agent-trois' }, luLe: '2026-05-01', conclusion: 'differe' }, l1, l2);
    expect(statutCalcule(j, CLE, personne)).toBe('valide');
  });
  it('introuvable-signale', () => {
    const j = journalDe(l1, { ...l2, conclusion: 'introuvable' });
    expect(statutCalcule(j, CLE, personne)).toBe('a_verifier');
    expect(motifsStatut(j, CLE, personne)).toContain('introuvable');
  });
  it('deux-lectures-sans-validateur', () => {
    const j = journalDe(l1, l2);
    expect(statutCalcule(j, CLE, null)).toBe('a_verifier');
    expect(motifsStatut(j, CLE, null)).toEqual(['sans_validateur']);
  });
  it('validateur-agent-refuse', () => {
    const j = journalDe(l1, l2);
    expect(statutCalcule(j, CLE, agent)).toBe('a_verifier');
    expect(motifsStatut(j, CLE, agent)).toEqual(['validateur_agent']);
  });
  it('valide-complet', () => {
    const j = journalDe(l1, l2);
    expect(statutCalcule(j, CLE, personne)).toBe('valide');
    expect(motifsStatut(j, CLE, personne)).toEqual([]);
  });
  it('lecture-en-double-refusee', () => {
    const j = journalDe(l1);
    expect(() => ajouterLecture(j, { ...l1, extrait: 'autre' })).toThrow(ErreurLecture);
    try {
      ajouterLecture(j, l1);
    } catch (e) {
      expect((e as ErreurLecture).code).toBe('lecture_en_double');
    }
    expect(j).toHaveLength(1);
  });
  it('ajout-seul-ne-modifie-pas-l-entree', () => {
    const j = journalDe(l1);
    const suite = ajouterLecture(j, l2);
    expect(j).toHaveLength(1);
    expect(suite).toHaveLength(2);
  });
  it('extrait-vide-refuse', () => {
    for (const extrait of ['', '   ']) {
      expect(() => ajouterLecture([], { ...l1, extrait })).toThrow(ErreurLecture);
    }
  });
  it('url-non-officielle-refusee', () => {
    for (const sourceUrl of ['https://exemple.fr/x', 'http://www.legifrance.gouv.fr/x', 'pas une url']) {
      expect(() => ajouterLecture([], { ...l1, sourceUrl })).toThrow(ErreurLecture);
    }
  });
  it('date-invalide-refusee', () => {
    for (const luLe of ['2026-13-01', '2026-02-30', '01/06/2026', '']) {
      expect(() => ajouterLecture([], { ...l1, luLe })).toThrow(ErreurLecture);
    }
  });
});
