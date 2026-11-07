import { describe, expect, it } from 'vitest';
import { etapesDepuisAppels, issuePourErreur, verifierTour, type EvenementTour } from '../issues.js';
import { CODES_ERREUR, ISSUES } from '../types.js';

const ev = (...l: Array<[string, Record<string, unknown>?]>): EvenementTour[] =>
  l.map(([type, extra], i) => ({ id: i + 1, type, ...extra }));
const tour = (issue: string, milieu: Array<[string]> = [['texte']]) =>
  ev(['tour.debut'], ...milieu, ['tour.fin', { issue }]);

describe('issues du tour', () => {
  it('tour-complet-valide', () => {
    for (const i of ISSUES.filter((x) => x !== 'action_proposee' && x !== 'question')) {
      expect(verifierTour(tour(i))).toEqual({ valide: true, issue: i });
    }
    expect(verifierTour(tour('action_proposee', [['proposition']]))).toEqual({ valide: true, issue: 'action_proposee' });
    expect(verifierTour(tour('question', [['proposition']]))).toEqual({ valide: true, issue: 'question' });
    expect(verifierTour(ev(['tour.debut'], ['tour.fin', { issue: 'reponse' }]))).toEqual({ valide: true, issue: 'reponse' });
  });

  it('chaque-motif-invalide', () => {
    const motif = (e: EvenementTour[]) => (verifierTour(e) as { motif: string }).motif;
    expect(motif([])).toBe('vide');
    expect(motif(ev(['texte'], ['tour.fin', { issue: 'reponse' }]))).toBe('sans_debut');
    expect(motif(ev(['tour.debut'], ['texte']))).toBe('sans_fin');
    expect(motif(ev(['tour.debut'], ['tour.fin', { issue: 'reponse' }], ['texte']))).toBe('fin_pas_derniere');
    expect(motif(ev(['tour.debut'], ['tour.fin', { issue: 'reponse' }], ['tour.fin', { issue: 'reponse' }]))).toBe('deux_fins');
    expect(motif(ev(['tour.debut'], ['texte'], ['tour.fin', { issue: 'reponse' }]).map((e, i) => ({ ...e, id: i === 2 ? 1 : e.id })))).toBe('id_non_croissant');
    expect(motif(tour('inconnue'))).toBe('issue_inconnue');
    expect(motif(ev(['tour.debut'], ['tour.fin']))).toBe('issue_inconnue');
    expect(motif(tour('reponse', [['proposition']]))).toBe('proposition_sans_issue_action');
    expect(motif(tour('navigation', [['proposition']]))).toBe('proposition_sans_issue_action');
    expect(verifierTour(null as never)).toEqual({ valide: false, motif: 'vide' });
  });

  it('ids-non-croissants', () => {
    const base = tour('reponse');
    for (const ids of [[1, 1, 3], [2, 1, 3], [1, 3, 2], [1, Number.NaN, 3]]) {
      const e = base.map((x, i) => ({ ...x, id: ids[i] as number }));
      expect(verifierTour(e)).toEqual({ valide: false, motif: 'id_non_croissant' });
    }
    expect(verifierTour(base.map((x, i) => ({ ...x, id: (i + 1) * 10 }))).valide).toBe(true);
    expect(verifierTour(base.map((x, i) => ({ ...x, id: i ? 'a' : 1 })) as never)).toEqual({ valide: false, motif: 'id_non_croissant' });
  });

  it('une-seule-issue', () => {
    const e = ev(['tour.debut'], ['question'], ['texte'], ['tour.fin', { issue: 'question' }]);
    expect(verifierTour(e)).toEqual({ valide: true, issue: 'question' });
    const deux = [...e, { id: 5, type: 'tour.fin', issue: 'reponse' }];
    expect(verifierTour(deux)).toEqual({ valide: false, motif: 'deux_fins' });
  });

  it('seize-codes-ont-une-issue', () => {
    const attendu: Record<string, string> = {
      parametre_invalide: 'refus_utile', outil_hors_liste: 'refus_utile', hors_schema: 'escalade',
      trop_de_demandes: 'reponse', budget_tour_atteint: 'reponse', budget_plan_atteint: 'reponse',
      ia_indisponible: 'escalade', proposition_inconnue: 'refus_utile', proposition_expiree: 'refus_utile',
      acteur_non_humain: 'refus_utile', droit_insuffisant: 'refus_utile', periode_cloturee: 'refus_utile',
      ecriture_validee: 'refus_utile', annulation_expiree: 'refus_utile', volume_trop_grand: 'reponse',
      niveau_ferme: 'refus_utile',
    };
    expect(Object.keys(attendu).sort()).toEqual([...CODES_ERREUR].sort());
    for (const c of CODES_ERREUR) {
      expect(issuePourErreur(c), c).toBe(attendu[c]);
      expect(['refus_utile', 'escalade', 'reponse']).toContain(issuePourErreur(c));
    }
  });

  it('code-inconnu-refuse', () => {
    for (const c of ['', 'inconnu', 'toString', '__proto__', 'PARAMETRE_INVALIDE']) {
      expect(() => issuePourErreur(c), c).toThrowError(expect.objectContaining({ name: 'ErreurChat', code: 'parametre_invalide' }));
    }
  });

  it('etapes-dans-l-ordre', () => {
    const appels = [
      { outil: 'lire_piece', dureeMs: 12, issue: 'ok' },
      { outil: 'chercher', dureeMs: 0, issue: 'secours' },
      { outil: 'proposer', dureeMs: 7, issue: 'arret' },
    ];
    expect(etapesDepuisAppels(appels)).toEqual([
      { outil: 'lire_piece', dureeMs: 12, etat: 'ok' },
      { outil: 'chercher', dureeMs: 0, etat: 'secours' },
      { outil: 'proposer', dureeMs: 7, etat: 'arret' },
    ]);
  });

  it('etapes-duree-invalide', () => {
    for (const d of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => etapesDepuisAppels([{ outil: 'o', dureeMs: d, issue: 'ok' }]), String(d)).toThrowError(
        expect.objectContaining({ code: 'parametre_invalide' }),
      );
    }
    expect(() => etapesDepuisAppels([{ outil: '', dureeMs: 1, issue: 'ok' }])).toThrowError(expect.objectContaining({ code: 'parametre_invalide' }));
    expect(() => etapesDepuisAppels(null as never)).toThrowError(expect.objectContaining({ code: 'parametre_invalide' }));
  });

  it('liste-vide', () => {
    expect(etapesDepuisAppels([])).toEqual([]);
    expect(verifierTour([])).toEqual({ valide: false, motif: 'vide' });
  });
});
