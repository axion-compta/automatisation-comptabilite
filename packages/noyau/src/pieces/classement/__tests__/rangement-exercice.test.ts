import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { appliquerReponse, questionRangement, type ExerciceRangement } from '../rangement-exercice.js';

const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPiece ? e.code : 'autre'; }
  return undefined;
};
const EXERCICES: ExerciceRangement[] = [
  { id: 'ex1', debut: '2025-01-01', fin: '2025-12-31' },
  { id: 'ex2', debut: '2026-01-01', fin: '2026-12-31' },
];

describe('rangement par année comptable', () => {
  it('piece-exercice-precedent-question', () => {
    const q = questionRangement({ id: 'p1', date: '2025-12-31' }, EXERCICES);
    expect(q).toMatchObject({ pieceId: 'p1', motif: 'exercice_precedent', propose: 'ex1', autre: 'ex2' });
    expect(questionRangement({ id: 'p1', date: '2025-01-01' }, EXERCICES)?.motif).toBe('exercice_precedent');
    // Ordre de la liste sans effet : le dernier exercice par date est le courant.
    expect(questionRangement({ id: 'p1', date: '2025-06-01' }, [...EXERCICES].reverse())?.propose).toBe('ex1');
  });

  it('piece-a-cheval-question', () => {
    const q = questionRangement({ id: 'p2', date: '2025-12-15', dateFin: '2026-01-14' }, EXERCICES);
    expect(q).toMatchObject({ motif: 'a_cheval', propose: 'ex1', autre: 'ex2' });
    // Veille du changement d'année : encore à cheval seulement si la fin passe la frontière.
    expect(questionRangement({ id: 'p2', date: '2025-12-15', dateFin: '2025-12-31' }, EXERCICES)?.motif).toBe('exercice_precedent');
    // Fin hors de tout exercice : pas de plantage, pas de question pour la pièce de l'exercice en cours.
    expect(questionRangement({ id: 'p3', date: '2026-12-15', dateFin: '2027-01-14' }, EXERCICES)).toBeUndefined();
    // Pièce de l'exercice précédent qui finit hors de tout exercice.
    expect(questionRangement({ id: 'p4', date: '2025-12-15', dateFin: '2027-01-14' }, EXERCICES)?.motif).toBe('exercice_precedent');
    expect(code(() => questionRangement({ id: 'p2', date: '2026-02-01', dateFin: '2026-01-01' }, EXERCICES))).toBe('dates_invalides');
    expect(code(() => questionRangement({ id: 'p2', date: '2026-02-30' }, EXERCICES))).toBe('dates_invalides');
  });

  it('reponse-oui-rangee-et-tracee', () => {
    const q = questionRangement({ id: 'p1', date: '2025-12-31' }, EXERCICES)!;
    const r = appliquerReponse(q, 'oui', 'Camille Exemple', '2026-03-02T10:00:00Z');
    expect(r.exerciceId).toBe('ex1');
    expect(r.journal).toEqual({ pieceId: 'p1', motif: 'exercice_precedent', reponse: 'oui', exerciceId: 'ex1', par: 'Camille Exemple', le: '2026-03-02T10:00:00Z' });
    expect(code(() => appliquerReponse(q, 'oui', '', '2026-03-02'))).toBe('reponse_invalide');
    expect(code(() => appliquerReponse(q, 'oui', 'Camille Exemple', ''))).toBe('reponse_invalide');
    expect(code(() => appliquerReponse(q, 'peut-etre' as 'oui', 'Camille Exemple', '2026-03-02'))).toBe('reponse_invalide');
  });

  it('reponse-non-exercice-propose-et-trace', () => {
    const q = questionRangement({ id: 'p2', date: '2025-12-15', dateFin: '2026-01-14' }, EXERCICES)!;
    const r = appliquerReponse(q, 'non', 'Camille Exemple', '2026-03-02T10:00:00Z');
    expect(r.exerciceId).toBe('ex2');
    expect(r.journal).toMatchObject({ reponse: 'non', exerciceId: 'ex2', motif: 'a_cheval' });
  });

  it('piece-dans-exercice-aucune-question', () => {
    expect(questionRangement({ id: 'p3', date: '2026-06-15' }, EXERCICES)).toBeUndefined();
    expect(questionRangement({ id: 'p3', date: '2026-01-01', dateFin: '2026-12-31' }, EXERCICES)).toBeUndefined();
    expect(questionRangement({ id: 'p3', date: '2024-06-15' }, EXERCICES)).toBeUndefined();
    expect(questionRangement({ id: 'p3', date: '2026-06-15' }, [EXERCICES[0] as ExerciceRangement])).toBeUndefined();
    expect(questionRangement({ id: 'p3', date: '2025-06-15' }, [EXERCICES[0] as ExerciceRangement])).toBeUndefined();
    expect(questionRangement({ id: 'p3', date: '2026-06-15' }, [])).toBeUndefined();
  });
});
