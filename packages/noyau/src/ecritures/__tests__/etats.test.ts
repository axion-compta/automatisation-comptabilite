import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  annulerValidation,
  demanderValidation,
  proposer,
  repasserEnBrouillon,
  valider,
  validationEchue,
} from '../etats.js';
import { ErreurEcriture, type Ecriture, type StatutEcriture } from '../modele.js';

const DELAI = 10000;

function ecriture(statut: StatutEcriture, credit = 1000): Ecriture {
  return {
    id: 'e1',
    journal: 'AC',
    date: '2026-01-15',
    statut,
    lignes: [
      { compte: '607', libelle: 'Achat fictif', debit: centimes(1000), credit: centimes(0) },
      { compte: '401', libelle: 'Achat fictif', debit: centimes(0), credit: centimes(credit) },
    ],
  };
}
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurEcriture) return e.code;
    throw e;
  }
  return undefined;
}

describe("états d'une écriture", () => {
  it('brouillon-vers-propose', () => {
    const e = ecriture('brouillon');
    expect(proposer(e).statut).toBe('propose');
    expect(proposer(e).lignes).toEqual(e.lignes);
    expect(e.statut).toBe('brouillon');
    expect(code(() => proposer(ecriture('propose')))).toBe('transition_interdite');
    expect(code(() => proposer(ecriture('valide')))).toBe('transition_interdite');
  });

  it('valide-vers-brouillon-interdit', () => {
    expect(code(() => repasserEnBrouillon(ecriture('valide')))).toBe('transition_interdite');
    expect(code(() => repasserEnBrouillon(ecriture('brouillon')))).toBe('transition_interdite');
    expect(repasserEnBrouillon(ecriture('propose')).statut).toBe('brouillon');
    expect(code(() => valider(ecriture('brouillon'), 'N1', 'Alice', '2026-01-16'))).toBe(
      'transition_interdite',
    );
    expect(code(() => valider(ecriture('valide'), 'N1', 'Alice', '2026-01-16'))).toBe(
      'transition_interdite',
    );
    expect(code(() => demanderValidation(ecriture('brouillon'), 0, DELAI))).toBe(
      'transition_interdite',
    );
    expect(code(() => demanderValidation(ecriture('valide'), 0, DELAI))).toBe(
      'transition_interdite',
    );
  });

  it('annuler-avant-echeance', () => {
    const d = demanderValidation(ecriture('propose'), 0, DELAI);
    expect(d).toEqual({ ecritureId: 'e1', echeance: 10000 });
    expect(annulerValidation(d, 9000)).toBe('annulee');
    expect(annulerValidation(d, 9999)).toBe('annulee');
    expect(validationEchue(d, 9000)).toBe(false);
    expect(validationEchue(d, 9999)).toBe(false);
    const d2 = demanderValidation(ecriture('propose'), 5000, DELAI);
    expect(d2.echeance).toBe(15000);
  });

  it('annuler-apres-echeance-refuse', () => {
    const d = demanderValidation(ecriture('propose'), 0, DELAI);
    expect(code(() => annulerValidation(d, 11000))).toBe('delai_depasse');
    expect(code(() => annulerValidation(d, 10000))).toBe('delai_depasse');
    expect(() => annulerValidation(d, 11000)).toThrow(/dépassé/);
    expect(validationEchue(d, 10000)).toBe(true);
    expect(validationEchue(d, 11000)).toBe(true);
  });

  it('validation-ne-modifie-pas-l-entree', () => {
    const e = ecriture('propose');
    const gelee: Ecriture = Object.freeze({ ...e, lignes: Object.freeze([...e.lignes]) });
    const v = valider(gelee, 'N1', 'Alice', '2026-01-16');
    expect(v).toMatchObject({ statut: 'valide', numero: 'N1', validePar: 'Alice', valideLe: '2026-01-16' });
    expect(v).not.toBe(gelee);
    expect(v.lignes).toEqual(e.lignes);
    expect(gelee.statut).toBe('propose');
    expect(gelee.numero).toBeUndefined();
    expect(repasserEnBrouillon(gelee).statut).toBe('brouillon');
    expect(gelee.statut).toBe('propose');
    expect(proposer(Object.freeze(ecriture('brouillon'))).statut).toBe('propose');
  });

  it('delai-invalide-refuse', () => {
    const e = ecriture('propose');
    for (const d of [0, -1, -10000, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => demanderValidation(e, 0, d))).toBe('delai_invalide');
    }
    expect(demanderValidation(e, 0, 1).echeance).toBe(1);
  });

  it('messages-des-refus', () => {
    expect(() => proposer(ecriture('valide'))).toThrow('Seul un brouillon peut être proposé.');
    expect(() => demanderValidation(ecriture('valide'), 0, DELAI)).toThrow(
      'Seule une écriture proposée se valide.',
    );
    expect(() => demanderValidation(ecriture('propose'), 0, 0)).toThrow(
      'Le délai doit être un entier positif.',
    );
    expect(() => valider(ecriture('valide'), 'N1', 'Alice', 'd')).toThrow(
      'Seule une écriture proposée se valide.',
    );
    expect(() => repasserEnBrouillon(ecriture('valide'))).toThrow(
      'Seule une écriture proposée repasse en brouillon.',
    );
  });

  it('proposer-desequilibree-refuse', () => {
    expect(code(() => proposer(ecriture('brouillon', 999)))).toBe('desequilibre');
    expect(code(() => proposer({ ...ecriture('brouillon'), lignes: [] }))).toBe('une_seule_ligne');
  });
});
