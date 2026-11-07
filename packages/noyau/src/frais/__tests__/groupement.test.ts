import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture, type Ecriture, type StatutEcriture } from '../../ecritures/modele.js';
import { grouperParMois } from '../groupement.js';
import { ErreurFrais } from '../types.js';

const c = centimes;
const entete = { id: 'g1', journal: 'OD', date: '2026-03-31' };

function ecr(id: string, date: string, montant: number, statut: StatutEcriture = 'propose', charge = 'C-REPAS', tiers = 'C-PERS', aux?: string): Ecriture {
  return {
    id,
    journal: 'OD',
    date,
    statut,
    lignes: [
      { compte: charge, libelle: 'Frais ' + id, debit: c(montant), credit: c(0) },
      { compte: tiers, libelle: 'Frais ' + id, debit: c(0), credit: c(montant), ...(aux === undefined ? {} : { auxiliaire: aux }) },
    ],
  };
}
const frais = (fraisId: string, e: Ecriture, personneId = 'p1', pieceId?: string) => ({ fraisId, personneId, ecriture: e, ...(pieceId === undefined ? {} : { pieceId }) });

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

describe('grouperParMois', () => {
  it('deux-repas-additionnes', () => {
    const r = grouperParMois([frais('f1', ecr('e1', '2026-03-04', 1250)), frais('f2', ecr('e2', '2026-03-19', 2000))], entete);
    expect(r.ecriture).toMatchObject({ id: 'g1', journal: 'OD', date: '2026-03-31', statut: 'propose' });
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['C-REPAS', 3250, 0],
      ['C-PERS', 0, 3250],
    ]);
    expect(r.fraisIds).toEqual(['f1', 'f2']);
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
  });

  it('pieces-conservees', () => {
    const r = grouperParMois(
      [frais('f3', ecr('e3', '2026-03-05', 100), 'p1', 'pc-b'), frais('f1', ecr('e1', '2026-03-06', 100), 'p1', 'pc-a'), frais('f2', ecr('e2', '2026-03-07', 100), 'p1', 'pc-b'), frais('f4', ecr('e4', '2026-03-08', 100))],
      entete,
    );
    expect(r.pieceIds).toEqual(['pc-a', 'pc-b']);
    expect(r.fraisIds).toEqual(['f1', 'f2', 'f3', 'f4']);
  });

  it('aucune-compensation-debit-credit', () => {
    const e1 = ecr('e1', '2026-03-04', 500, 'propose', 'C-A', 'C-B');
    const e2 = ecr('e2', '2026-03-05', 300, 'propose', 'C-B', 'C-A');
    const r = grouperParMois([frais('f1', e1), frais('f2', e2)], entete);
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['C-A', 500, 0],
      ['C-B', 300, 0],
      ['C-A', 0, 300],
      ['C-B', 0, 500],
    ]);
    const debit = r.ecriture.lignes.reduce((s, l) => s + l.debit, 0);
    const credit = r.ecriture.lignes.reduce((s, l) => s + l.credit, 0);
    expect([debit, credit]).toEqual([800, 800]);
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
  });

  it('deux-mois-refuse', () => {
    expect(code(() => grouperParMois([frais('f1', ecr('e1', '2026-03-31', 100)), frais('f2', ecr('e2', '2026-04-01', 100))], entete))).toBe('entree_invalide');
  });

  it('deux-personnes-refuse', () => {
    expect(code(() => grouperParMois([frais('f1', ecr('e1', '2026-03-04', 100), 'p1'), frais('f2', ecr('e2', '2026-03-05', 100), 'p2')], entete))).toBe('entree_invalide');
  });

  it('ecriture-validee-refusee', () => {
    for (const statut of ['valide', 'brouillon'] as const) {
      expect(code(() => grouperParMois([frais('f1', ecr('e1', '2026-03-04', 100)), frais('f2', ecr('e2', '2026-03-05', 100, statut))], entete))).toBe('entree_invalide');
    }
  });

  it('liste-vide-refusee', () => {
    expect(code(() => grouperParMois([], entete))).toBe('entree_invalide');
  });

  it('ordre-d-entree-sans-effet', () => {
    const a = frais('f1', ecr('e1', '2026-03-04', 1250), 'p1', 'pc-1');
    const b = frais('f2', ecr('e2', '2026-03-19', 2000, 'propose', 'C-PEAGE'), 'p1', 'pc-2');
    const d = frais('f3', ecr('e3', '2026-03-20', 70), 'p1');
    expect(grouperParMois([d, b, a], entete)).toEqual(grouperParMois([a, b, d], entete));
  });

  it('auxiliaire-identique-repris', () => {
    const r = grouperParMois([frais('f1', ecr('e1', '2026-03-04', 100, 'propose', 'C-REPAS', 'C-PERS', 'aux-1')), frais('f2', ecr('e2', '2026-03-05', 200, 'propose', 'C-REPAS', 'C-PERS', 'aux-1'))], entete);
    expect(r.ecriture.lignes.map((l) => l.auxiliaire)).toEqual([undefined, 'aux-1']);
  });

  it('auxiliaires-differents-refuses', () => {
    const a = frais('f1', ecr('e1', '2026-03-04', 100, 'propose', 'C-REPAS', 'C-PERS', 'aux-1'));
    expect(code(() => grouperParMois([a, frais('f2', ecr('e2', '2026-03-05', 100, 'propose', 'C-REPAS', 'C-PERS', 'aux-2'))], entete))).toBe('entree_invalide');
    expect(code(() => grouperParMois([a, frais('f3', ecr('e3', '2026-03-05', 100))], entete))).toBe('entree_invalide');
  });
});
