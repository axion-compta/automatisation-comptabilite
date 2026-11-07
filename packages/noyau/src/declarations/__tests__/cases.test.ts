import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import { alimenterCases, ErreurDeclaration, type TableFormulaire } from '../cases.js';

const c = centimes;
const PERIODE = { debut: '2026-01-01', fin: '2026-01-31' };

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurDeclaration) return e.code;
    throw e;
  }
  return undefined;
}

function ecr(id: string, date: string, lignes: [string, number, number][], statut: Ecriture['statut'] = 'valide'): Ecriture {
  return {
    id,
    journal: 'OD',
    date,
    statut,
    lignes: lignes.map(([compte, debit, credit]) => ({ compte, libelle: 'Libellé fictif', debit: c(debit), credit: c(credit) })),
  };
}

const TABLE: TableFormulaire = {
  formulaire: 'FORM_TEST',
  millesime: 'M_TEST',
  lignes: [
    { code: 'X01', alimentation: { comptes: ['9A'], sens: 'credit' } },
    { code: 'X02', alimentation: { comptes: ['9B'], sens: 'debit' } },
    { code: 'X03', alimentation: { comptes: ['9C'], sens: 'solde_crediteur' } },
  ],
};

const ECRITURES: Ecriture[] = [
  ecr('e1', '2026-01-05', [['9A1', 0, 1000], ['9B1', 1000, 0]]),
  ecr('e2', '2026-01-20', [['9A22', 0, 500], ['9B2', 500, 0]]),
  ecr('e3', '2026-01-31', [['9C1', 300, 0], ['9C2', 0, 900], ['8Z', 600, 0]]),
];

describe('alimenterCases', () => {
  it('case-alimentee-par-prefixe', () => {
    const res = alimenterCases(TABLE, ECRITURES, PERIODE);
    expect(res.map((r) => [r.code, r.montant])).toEqual([
      ['X01', 1500],
      ['X02', 1500],
      ['X03', 600],
    ]);
    expect(res.every((r) => r.aCalculer === false)).toBe(true);
  });

  it('brouillon-ignore', () => {
    const e = [...ECRITURES, ecr('e4', '2026-01-10', [['9A1', 0, 7000]], 'brouillon'), ecr('e5', '2026-01-11', [['9A1', 0, 8000]], 'propose')];
    const res = alimenterCases(TABLE, e, PERIODE);
    expect(res[0]?.montant).toBe(1500);
    expect(res[0]?.sources.map((s) => s.ecritureId)).toEqual(['e1', 'e2']);
  });

  it('hors-periode-ignore', () => {
    const e = [...ECRITURES, ecr('e4', '2025-12-31', [['9A1', 0, 7000]]), ecr('e5', '2026-02-01', [['9A1', 0, 8000]])];
    expect(alimenterCases(TABLE, e, PERIODE)[0]?.montant).toBe(1500);
    // Bornes incluses.
    const bornes = [ecr('b1', '2026-01-01', [['9A1', 0, 1]]), ecr('b2', '2026-01-31', [['9A1', 0, 2]])];
    expect(alimenterCases(TABLE, bornes, PERIODE)[0]?.montant).toBe(3);
  });

  it('sources-completes', () => {
    const res = alimenterCases(TABLE, ECRITURES, PERIODE);
    expect(res[0]?.sources).toEqual([
      { ecritureId: 'e1', ligneIndex: 0 },
      { ecritureId: 'e2', ligneIndex: 0 },
    ]);
    expect(res[1]?.sources).toEqual([
      { ecritureId: 'e1', ligneIndex: 1 },
      { ecritureId: 'e2', ligneIndex: 1 },
    ]);
    expect(res[2]?.sources).toEqual([
      { ecritureId: 'e3', ligneIndex: 0 },
      { ecritureId: 'e3', ligneIndex: 1 },
    ]);
    // Une ligne retenue par deux préfixes n'apparaît qu'une fois.
    const t: TableFormulaire = { ...TABLE, lignes: [{ code: 'X01', alimentation: { comptes: ['9A', '9A1'], sens: 'credit' } }] };
    const r = alimenterCases(t, ECRITURES, PERIODE);
    expect(r[0]?.sources).toEqual([
      { ecritureId: 'e1', ligneIndex: 0 },
      { ecritureId: 'e2', ligneIndex: 0 },
    ]);
    expect(r[0]?.montant).toBe(1500);
  });

  it('solde-crediteur', () => {
    const t: TableFormulaire = {
      ...TABLE,
      lignes: [
        { code: 'X01', alimentation: { comptes: ['9C'], sens: 'solde_crediteur' } },
        { code: 'X02', alimentation: { comptes: ['9C'], sens: 'solde_debiteur' } },
        { code: 'X03', alimentation: { comptes: ['8Z'], sens: 'solde_crediteur' } },
      ],
    };
    const res = alimenterCases(t, ECRITURES, PERIODE);
    expect(res.map((r) => r.montant)).toEqual([600, 0, 0]);
    const debiteur = alimenterCases(t, [ecr('d1', '2026-01-02', [['9C1', 900, 0], ['9C2', 0, 300]])], PERIODE);
    expect(debiteur.map((r) => r.montant)).toEqual([0, 600, 0]);
  });

  it('ligne-sans-regle-refusee', () => {
    const t: TableFormulaire = { ...TABLE, lignes: [...TABLE.lignes, { code: 'X09' }] };
    try {
      alimenterCases(t, ECRITURES, PERIODE);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurDeclaration);
      expect((e as ErreurDeclaration).code).toBe('ligne_sans_regle');
      expect((e as ErreurDeclaration).message).toContain('X09');
    }
  });

  it('formule-laissee-a-calculer', () => {
    const t: TableFormulaire = { ...TABLE, lignes: [...TABLE.lignes, { code: 'X04', formule: 'X01 - X02' }] };
    const res = alimenterCases(t, ECRITURES, PERIODE);
    expect(res[3]).toEqual({ code: 'X04', montant: 0, sources: [], aCalculer: true });
  });

  it('gère les cas limites', () => {
    expect(alimenterCases({ ...TABLE, lignes: [] }, ECRITURES, PERIODE)).toEqual([]);
    expect(alimenterCases(TABLE, [], PERIODE).map((r) => r.montant)).toEqual([0, 0, 0]);
    const inverse = alimenterCases(TABLE, [...ECRITURES].reverse(), PERIODE);
    expect(inverse).toEqual(alimenterCases(TABLE, ECRITURES, PERIODE));
    // Même écriture, sources triées par id puis index.
    const t: TableFormulaire = { ...TABLE, lignes: [{ code: 'X01', alimentation: { comptes: ['9'], sens: 'debit' } }] };
    const e = [ecr('b', '2026-01-02', [['91', 1, 0], ['92', 2, 0]]), ecr('a', '2026-01-03', [['93', 4, 0]])];
    expect(alimenterCases(t, e, PERIODE)[0]?.sources).toEqual([
      { ecritureId: 'a', ligneIndex: 0 },
      { ecritureId: 'b', ligneIndex: 0 },
      { ecritureId: 'b', ligneIndex: 1 },
    ]);
  });

  it('refuse les tables et périodes invalides', () => {
    const avec = (alimentation: NonNullable<TableFormulaire['lignes'][number]['alimentation']>): TableFormulaire => ({
      ...TABLE,
      lignes: [{ code: 'X01', alimentation }],
    });
    expect(code(() => alimenterCases(avec({ comptes: [''], sens: 'debit' }), ECRITURES, PERIODE))).toBe('prefixe_vide');
    expect(code(() => alimenterCases(avec({ comptes: [], sens: 'debit' }), ECRITURES, PERIODE))).toBe('prefixe_vide');
    expect(code(() => alimenterCases({ ...TABLE, lignes: [...TABLE.lignes, TABLE.lignes[0] as never] }, ECRITURES, PERIODE))).toBe('ligne_en_double');
    expect(code(() => alimenterCases(TABLE, ECRITURES, { debut: '2026-02-01', fin: '2026-01-01' }))).toBe('periode_invalide');
    expect(code(() => alimenterCases(TABLE, ECRITURES, { debut: '2026-13-01', fin: '2026-14-01' }))).toBe('periode_invalide');
    expect(code(() => alimenterCases(TABLE, ECRITURES, { debut: '', fin: '2026-01-01' }))).toBe('periode_invalide');
  });
});
