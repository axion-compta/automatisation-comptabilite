import { describe, expect, it } from 'vitest';
import {
  ErreurMemoire,
  cleMotif,
  etatRegle,
  regleApplicable,
  type CorrectionClassement,
} from '../memoire-correction.js';

const SEUIL = 3;
const CLE = cleMotif('f1', 'Fournisseur de Matériaux');

function corr(
  n: number,
  nouveauCompte: string,
  extra: Partial<CorrectionClassement> = {},
): CorrectionClassement {
  return {
    societeId: 's1',
    fournisseurId: 'f1',
    libelle: 'fournisseur de materiaux',
    ancienCompte: '471000',
    nouveauCompte,
    canal: 'ecran',
    ecritureId: `e${String(n).padStart(3, '0')}`,
    date: `2026-01-${String(10 + n)}`,
    ...extra,
  };
}

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurMemoire) return e.code;
    throw e;
  }
  return undefined;
}

describe('memoire de correction par societe', () => {
  it('deux-corrections-aucune-regle', () => {
    expect(etatRegle([], 's1', CLE, SEUIL)).toEqual({ statut: 'aucune', nbConcordantes: 0 });
    const un = etatRegle([corr(1, '606000')], 's1', CLE, SEUIL);
    expect(un).toEqual({ statut: 'aucune', nbConcordantes: 1 });
    const deux = etatRegle([corr(1, '606000'), corr(2, '606000')], 's1', CLE, SEUIL);
    expect(deux).toEqual({ statut: 'aucune', nbConcordantes: 2 });
    expect(regleApplicable(deux, false)).toBe(false);
  });

  it('trois-concordantes-regle-proposee', () => {
    const trois = etatRegle([corr(1, '606000'), corr(2, '606000'), corr(3, '606000')], 's1', CLE, SEUIL);
    expect(trois).toEqual({ statut: 'proposee', compte: '606000', nbConcordantes: 3 });
    expect(regleApplicable(trois, false)).toBe(true);
    const quatre = etatRegle(
      [corr(1, '606000'), corr(2, '606000'), corr(3, '606000'), corr(4, '606000')],
      's1',
      CLE,
      SEUIL,
    );
    expect(quatre).toEqual({ statut: 'proposee', compte: '606000', nbConcordantes: 4 });
    expect(etatRegle([corr(1, '606000')], 's1', CLE, 1).statut).toBe('proposee');
  });

  it('contradiction-eteint-la-regle', () => {
    const base = [corr(1, '606000'), corr(2, '606000'), corr(3, '606000')];
    const eteinte = etatRegle([...base, corr(4, '615000')], 's1', CLE, SEUIL);
    expect(eteinte).toEqual({ statut: 'eteinte', nbConcordantes: 1 });
    expect(regleApplicable(eteinte, false)).toBe(false);
    // une divergence avant le seuil n'éteint rien : la règle n'existait pas
    const avant = etatRegle([corr(1, '606000'), corr(2, '615000')], 's1', CLE, SEUIL);
    expect(avant).toEqual({ statut: 'aucune', nbConcordantes: 1 });
    // trois corrections concordantes vers le nouveau compte : nouvelle règle
    const neuve = etatRegle(
      [...base, corr(4, '615000'), corr(5, '615000'), corr(6, '615000')],
      's1',
      CLE,
      SEUIL,
    );
    expect(neuve).toEqual({ statut: 'proposee', compte: '615000', nbConcordantes: 3 });
    // éteinte puis une seule concordante de plus : toujours éteinte
    const encore = etatRegle([...base, corr(4, '615000'), corr(5, '615000')], 's1', CLE, SEUIL);
    expect(encore).toEqual({ statut: 'eteinte', nbConcordantes: 2 });
  });

  it('autre-societe-ignoree', () => {
    const autre = [1, 2, 3].map((n) => corr(n, '606000', { societeId: 's2' }));
    expect(etatRegle(autre, 's1', CLE, SEUIL)).toEqual({ statut: 'aucune', nbConcordantes: 0 });
    expect(etatRegle(autre, 's2', CLE, SEUIL).statut).toBe('proposee');
    const melange = [corr(1, '606000'), corr(2, '606000'), corr(3, '615000', { societeId: 's2' })];
    expect(etatRegle(melange, 's1', CLE, SEUIL)).toEqual({ statut: 'aucune', nbConcordantes: 2 });
    // autre fournisseur ou autre libellé : autre clé
    const autreCle = [1, 2, 3].map((n) => corr(n, '606000', { fournisseurId: 'f2' }));
    expect(etatRegle(autreCle, 's1', CLE, SEUIL).nbConcordantes).toBe(0);
  });

  it('periode-cloturee-jamais', () => {
    const propose = etatRegle([1, 2, 3].map((n) => corr(n, '606000')), 's1', CLE, SEUIL);
    expect(regleApplicable(propose, true)).toBe(false);
    expect(regleApplicable(propose, false)).toBe(true);
    expect(regleApplicable({ statut: 'aucune', nbConcordantes: 0 }, false)).toBe(false);
    expect(regleApplicable({ statut: 'eteinte', nbConcordantes: 1 }, false)).toBe(false);
  });

  it('cle-normalisee', () => {
    expect(cleMotif('f1', 'Fournisseur  de Matériaux')).toBe(cleMotif('f1', 'fournisseur de materiaux'));
    expect(cleMotif('f1', '  Fournisseur\t\nde   Matériaux  ')).toBe(cleMotif('f1', 'fournisseur de materiaux'));
    expect(cleMotif('f1', 'Éléphant')).toBe(cleMotif('f1', 'elephant'));
    expect(cleMotif('f1', 'a')).not.toBe(cleMotif('f2', 'a'));
    expect(cleMotif('f1', 'a b')).not.toBe(cleMotif('f1', 'ab'));
    expect(cleMotif('a|b', 'c')).not.toBe(cleMotif('a', 'b|c'));
    // libellés écrits différemment mais même clé : mêmes corrections comptées
    const v = [
      corr(1, '606000', { libelle: 'Fournisseur  de Matériaux' }),
      corr(2, '606000', { libelle: ' FOURNISSEUR DE MATERIAUX ' }),
      corr(3, '606000'),
    ];
    expect(etatRegle(v, 's1', CLE, SEUIL).statut).toBe('proposee');
  });

  it('ordre-de-reception-sans-effet', () => {
    const ordre = [corr(1, '606000'), corr(2, '606000'), corr(3, '606000'), corr(4, '615000')];
    const inverse = [...ordre].reverse();
    expect(etatRegle(inverse, 's1', CLE, SEUIL)).toEqual(etatRegle(ordre, 's1', CLE, SEUIL));
    expect(etatRegle(inverse, 's1', CLE, SEUIL).statut).toBe('eteinte');
    // même date : départage par identifiant d'écriture
    const memeJour = [
      corr(1, '615000', { date: '2026-02-01', ecritureId: 'b' }),
      corr(2, '606000', { date: '2026-02-01', ecritureId: 'a' }),
    ];
    expect(etatRegle(memeJour, 's1', CLE, 1)).toEqual({
      statut: 'proposee',
      compte: '615000',
      nbConcordantes: 1,
    });
    expect(etatRegle([...memeJour].reverse(), 's1', CLE, 1)).toEqual(etatRegle(memeJour, 's1', CLE, 1));
    // l'entrée n'est pas modifiée
    const copie = [...inverse];
    etatRegle(inverse, 's1', CLE, SEUIL);
    expect(inverse).toEqual(copie);
  });

  it('seuil-invalide-refuse', () => {
    for (const s of [0, -1, Number.NaN, 2.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(codeErreur(() => etatRegle([], 's1', CLE, s))).toBe('seuil_invalide');
    }
    expect(codeErreur(() => etatRegle([], 's1', CLE, 1))).toBeUndefined();
    expect(codeErreur(() => etatRegle([], 's1', CLE, Number.MAX_SAFE_INTEGER))).toBeUndefined();
  });
});
