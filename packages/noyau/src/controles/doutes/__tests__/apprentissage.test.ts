import { describe, expect, it } from 'vitest';
import {
  ErreurMemoire,
  cleMotif,
  regleApplicable,
  type CorrectionClassement,
} from '../../../principes/memoire-correction.js';
import { compterUsages, etatAvecUsages, type ApplicationRegleSociete } from '../apprentissage.js';

const SEUIL = 3;
const CLE = cleMotif('f1', 'Fournisseur de Matériaux');

function corr(n: number, nouveauCompte: string): CorrectionClassement {
  return {
    societeId: 's1',
    fournisseurId: 'f1',
    libelle: 'fournisseur de materiaux',
    ancienCompte: '471000',
    nouveauCompte,
    canal: 'ecran',
    ecritureId: `e${String(n).padStart(3, '0')}`,
    date: `2026-01-${String(10 + n)}`,
  };
}

function appli(ecritureId: string, extra: Partial<ApplicationRegleSociete> = {}): ApplicationRegleSociete {
  return { regleCle: CLE, date: '2026-02-01', ecritureId, societeId: 's1', ...extra };
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

describe('apprentissage C6', () => {
  it('CT-39', () => {
    const une = etatAvecUsages([corr(1, '606000')], [], 's1', CLE, SEUIL);
    expect(une.statut).toBe('aucune');
    expect(regleApplicable(une, false)).toBe(false);
    const trois = [corr(1, '606000'), corr(2, '606000'), corr(3, '606000')];
    const promue = etatAvecUsages(trois, [], 's1', CLE, SEUIL);
    expect(promue).toMatchObject({ statut: 'proposee', compte: '606000', usages: 0 });
    expect(regleApplicable(promue, false)).toBe(true);
    const eteinte = etatAvecUsages([...trois, corr(4, '626000')], [], 's1', CLE, SEUIL);
    expect(eteinte.statut).toBe('eteinte');
    expect(regleApplicable(eteinte, false)).toBe(false);
    expect(regleApplicable(promue, true)).toBe(false);
  });

  it('usages-sans-doublon', () => {
    const apps = [appli('e1'), appli('e1', { date: '2026-03-01' }), appli('e2')];
    expect(compterUsages(apps, CLE)).toBe(2);
    expect(compterUsages([], CLE)).toBe(0);
  });

  it('usages-autre-cle-ignores', () => {
    const apps = [appli('e1'), appli('e2', { regleCle: cleMotif('f2', 'autre') })];
    expect(compterUsages(apps, CLE)).toBe(1);
    expect(etatAvecUsages([], apps, 's1', CLE, SEUIL).usages).toBe(1);
  });

  it('usages-autre-societe-ignores', () => {
    const apps = [appli('e1'), appli('e2', { societeId: 's2' })];
    expect(etatAvecUsages([], apps, 's1', CLE, SEUIL).usages).toBe(1);
    expect(etatAvecUsages([], apps, 's2', CLE, SEUIL).usages).toBe(1);
    expect(etatAvecUsages([], apps, 's3', CLE, SEUIL).usages).toBe(0);
  });

  it('eteinte-garde-ses-usages', () => {
    const quatre = [corr(1, '606000'), corr(2, '606000'), corr(3, '606000'), corr(4, '626000')];
    const etat = etatAvecUsages(quatre, [appli('e1'), appli('e2')], 's1', CLE, SEUIL);
    expect(etat.statut).toBe('eteinte');
    expect(etat.usages).toBe(2);
  });

  it('seuil-invalide', () => {
    for (const seuil of [0, Number.NaN, 2.5]) {
      expect(codeErreur(() => etatAvecUsages([], [], 's1', CLE, seuil))).toBe('seuil_invalide');
    }
  });
});
