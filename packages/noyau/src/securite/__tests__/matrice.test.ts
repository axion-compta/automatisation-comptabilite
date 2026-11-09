import { describe, expect, it } from 'vitest';
import { MATRICE_PROPOSEE, caseMatrice } from '../matrice.js';
import { ACTIONS, ACTIONS_ECRITURE, ROLES, ErreurSecurite, type Action, type Role } from '../types.js';

// Table écrite à la main (colonnes : administrateur, utilisateur, lecture, comptable, invité, Axion).
// '*' en suffixe = case DEMANDE 5 (valeur si la demande est acquise).
const R = ROLES;
const TABLE: Record<string, string[]> = {
  lire: ['O', 'O', 'O', 'O', 'M', 'lecture_seule'],
  voir_piece_sensible: ['O', 'O', 'N', 'O*', 'N', 'N'],
  deposer: ['O', 'O', 'N', 'O*', 'M', 'N'],
  saisir: ['O', 'O', 'N', 'O*', 'M', 'N'],
  valider: ['O', 'sep', 'N', 'sep*', 'M', 'N'],
  lever_majeur: ['O', 'O', 'N', 'O*', 'M', 'N'],
  lever_bloquant: ['O', 'N', 'N', 'O*', 'M', 'N'],
  cloturer: ['O', 'N', 'N', 'O*', 'N', 'N'],
  exporter: ['O', 'O', 'N', 'O', 'M', 'N'],
  parametrer: ['O', 'N', 'N', 'N', 'N', 'N'],
  gerer_equipe: ['O', 'N', 'N', 'N', 'N', 'N'],
  commenter: ['O', 'O', 'N', 'O', 'O', 'N'],
  proposer_actions_automatiques: ['O', 'N', 'N', 'N', 'N', 'N'],
  assimiler_factures_autre_nom: ['propose', 'propose', 'N', 'active', 'N', 'N'],
};
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurSecurite ? e.code : 'autre'; }
  return 'aucune';
};
const attendu = (v: string, d5: boolean) => (v.endsWith('*') ? (d5 ? v.slice(0, -1) : 'N') : v);
const O = { demande5: true };
const F = { demande5: false };

describe('securite/matrice', () => {
  it('matrice-complete-14-par-6', () => {
    expect(Object.keys(MATRICE_PROPOSEE).sort()).toEqual([...ACTIONS].sort());
    expect(ACTIONS).toHaveLength(14);
    expect(ROLES).toHaveLength(6);
    for (const a of ACTIONS) expect(Object.keys(MATRICE_PROPOSEE[a]).sort()).toEqual([...ROLES].sort());
    expect(Object.keys(TABLE).sort()).toEqual([...ACTIONS].sort());
  });

  it('quatre-vingt-quatre-cases-attendues', () => {
    let n = 0;
    for (const [a, ligne] of Object.entries(TABLE)) {
      expect(ligne).toHaveLength(6);
      ligne.forEach((v, i) => {
        const role = R[i] as Role;
        for (const d5 of [true, false]) {
          expect(caseMatrice(role, a, { demande5: d5 })).toBe(attendu(v, d5));
        }
        n += 1;
      });
    }
    expect(n).toBe(84);
  });

  it('demande5-faux-comptable-ferme', () => {
    const marquees = Object.entries(TABLE).filter(([, l]) => (l[3] ?? '').endsWith('*')).map(([a]) => a);
    expect(marquees).toHaveLength(7);
    for (const a of marquees) expect(caseMatrice('comptable', a, F)).toBe('N');
    expect(caseMatrice('comptable', 'lire', F)).toBe('O');
    expect(caseMatrice('comptable', 'exporter', F)).toBe('O');
    expect(caseMatrice('comptable', 'commenter', F)).toBe('O');
    expect(caseMatrice('comptable', 'assimiler_factures_autre_nom', F)).toBe('active');
  });

  it('demande5-vrai-comptable-ouvert', () => {
    expect(caseMatrice('comptable', 'valider', O)).toBe('sep');
    expect(caseMatrice('comptable', 'cloturer', O)).toBe('O');
    expect(caseMatrice('comptable', 'voir_piece_sensible', O)).toBe('O');
    expect(caseMatrice('comptable', 'lever_bloquant', O)).toBe('O');
    expect(caseMatrice('comptable', 'parametrer', O)).toBe('N');
    expect(caseMatrice('administrateur', 'cloturer', F)).toBe('O');
  });

  it('personnel-axion-jamais-d-ecriture', () => {
    const liste: Action[] = ['deposer', 'saisir', 'valider', 'lever_bloquant', 'cloturer'];
    for (const a of [...ACTIONS_ECRITURE, ...liste]) {
      for (const d5 of [true, false]) expect(caseMatrice('personnel_axion', a, { demande5: d5 })).toBe('N');
    }
    expect(caseMatrice('personnel_axion', 'lire', O)).toBe('lecture_seule');
  });

  it('role-ou-action-inconnus-refuses', () => {
    for (const r of ['Administrateur', '', undefined, null, 3, 'constructor']) {
      expect(code(() => caseMatrice(r, 'lire', O))).toBe('argument_invalide');
    }
    for (const a of ['Lire', '', undefined, null, 'toString', '__proto__']) {
      expect(code(() => caseMatrice('administrateur' satisfies Role, a, O))).toBe('argument_invalide');
    }
  });

  it('options-absentes-refusees', () => {
    const appel = (o: unknown) => code(() => caseMatrice('comptable', 'cloturer', o as { demande5: boolean }));
    for (const o of [undefined, null, {}, { demande5: 'oui' }, { demande5: 1 }, { demande5: undefined }, 'x']) {
      expect(appel(o)).toBe('argument_invalide');
    }
  });
});
