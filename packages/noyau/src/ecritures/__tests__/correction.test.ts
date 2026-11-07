import { describe, expect, it } from 'vitest';
import { ErreurArgent, centimes } from '../../argent/index.js';
import { ErreurCorrection, contrePasser, corriger } from '../correction.js';
import { ErreurEcriture, type Ecriture, type LigneEcriture } from '../modele.js';

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Achat fictif', debit: centimes(debit), credit: centimes(credit) };
}

function validee(lignes: LigneEcriture[], extra: Partial<Ecriture> = {}): Ecriture {
  return Object.freeze({
    id: 'e1',
    journal: 'AC',
    date: '2026-01-15',
    statut: 'valide',
    numero: 'AC-0001',
    lignes: Object.freeze(lignes.map((l) => Object.freeze({ ...l }))),
    ...extra,
  }) as Ecriture;
}

const ORIGINALE = (): Ecriture => validee([ligne('6061', 12000, 0), ligne('401', 0, 12000)]);
const PARAMS = { id: 'c1', date: '2026-02-01', motif: 'Mauvais compte de charge' };

function erreur(f: () => unknown): unknown {
  try {
    f();
  } catch (e) {
    return e;
  }
  return undefined;
}
function code(f: () => unknown): string | undefined {
  const e = erreur(f);
  if (e instanceof ErreurCorrection) return e.code;
  if (e === undefined) return undefined;
  throw e;
}

function solde(ecritures: readonly Ecriture[], compte: string): number {
  let total = 0;
  for (const e of ecritures) {
    for (const l of e.lignes) if (l.compte === compte) total += l.debit - l.credit;
  }
  return total;
}

describe('correction par contre-passation', () => {
  it('contre-passation-inverse-les-lignes', () => {
    const o = ORIGINALE();
    const c = contrePasser(o, PARAMS);
    expect(c.statut).toBe('brouillon');
    expect(c.type).toBe('correction');
    expect(c.lienOriginale).toBe('e1');
    expect(c.id).toBe('c1');
    expect(c.date).toBe('2026-02-01');
    expect(c.journal).toBe('AC');
    expect(c.lignes).toEqual([ligne('6061', 0, 12000), ligne('401', 12000, 0)]);
    expect(c.numero).toBeUndefined();
    expect(c.contrePassee).toBeUndefined();
  });

  it('motif-obligatoire', () => {
    for (const motif of ['', ' ', '  \t\n ']) {
      expect(code(() => contrePasser(ORIGINALE(), { ...PARAMS, motif }))).toBe('motif_obligatoire');
    }
    expect(
      code(() =>
        corriger(ORIGINALE(), {
          idContrePassation: 'c1',
          idCorrection: 'c2',
          date: '2026-02-01',
          motif: '   ',
          lignes: [ligne('6064', 12000, 0), ligne('401', 0, 12000)],
        }),
      ),
    ).toBe('motif_obligatoire');
    expect(code(() => contrePasser(ORIGINALE(), { ...PARAMS, motif: 'x' }))).toBeUndefined();
  });

  it('originale-non-validee-refusee', () => {
    for (const statut of ['brouillon', 'propose'] as const) {
      const o = { ...ORIGINALE(), statut };
      expect(code(() => contrePasser(o, PARAMS))).toBe('originale_non_validee');
    }
  });

  it('deja-contre-passee-refusee', () => {
    const o = validee([ligne('6061', 12000, 0), ligne('401', 0, 12000)], { contrePassee: true });
    expect(code(() => contrePasser(o, PARAMS))).toBe('deja_contre_passee');
    expect(
      code(() =>
        corriger(o, {
          idContrePassation: 'c1',
          idCorrection: 'c2',
          date: '2026-02-01',
          motif: 'Encore',
          lignes: [ligne('6064', 12000, 0), ligne('401', 0, 12000)],
        }),
      ),
    ).toBe('deja_contre_passee');
    // contrePassee: false explicite reste permis.
    const non = validee([ligne('6061', 12000, 0), ligne('401', 0, 12000)], { contrePassee: false });
    expect(code(() => contrePasser(non, PARAMS))).toBeUndefined();
  });

  it('originale-intacte', () => {
    const o = ORIGINALE();
    const avant = JSON.stringify(o);
    const r = corriger(o, {
      idContrePassation: 'c1',
      idCorrection: 'c2',
      date: '2026-02-01',
      motif: 'Mauvais compte',
      lignes: [ligne('6064', 12000, 0), ligne('401', 0, 12000)],
    });
    expect(JSON.stringify(o)).toBe(avant);
    expect(o.contrePassee).toBeUndefined();
    expect(r.marqueOriginale).not.toBe(o);
    expect(r.marqueOriginale.contrePassee).toBe(true);
    expect(r.marqueOriginale.statut).toBe('valide');
    expect(r.marqueOriginale.numero).toBe('AC-0001');
    expect(r.marqueOriginale.lignes).toEqual(o.lignes);
    expect(r.marqueOriginale.lignes).not.toBe(o.lignes);
    expect(r.correction.statut).toBe('brouillon');
    expect(r.correction.type).toBe('correction');
    expect(r.correction.lienOriginale).toBe('e1');
    expect(r.correction.id).toBe('c2');
    expect(r.correction.lignes).toEqual([ligne('6064', 12000, 0), ligne('401', 0, 12000)]);
    expect(r.contrePassation.id).toBe('c1');
    expect(r.contrePassation.lienOriginale).toBe('e1');
  });

  it('soldes-apres-correction', () => {
    const o = ORIGINALE();
    const r = corriger(o, {
      idContrePassation: 'c1',
      idCorrection: 'c2',
      date: '2026-02-01',
      motif: 'Mauvais compte',
      lignes: [ligne('6064', 12000, 0), ligne('401', 0, 12000)],
    });
    const tout = [r.marqueOriginale, r.contrePassation, r.correction];
    expect(solde(tout, '6061')).toBe(0);
    expect(solde(tout, '6064')).toBe(12000);
    expect(solde(tout, '401')).toBe(-12000);
  });
});

describe('correction : cas limites', () => {
  const base = {
    idContrePassation: 'c1',
    idCorrection: 'c2',
    date: '2026-02-01',
    motif: 'Mauvais compte',
  };

  it('refuse une correction vide ou à une seule ligne', () => {
    expect(erreur(() => corriger(ORIGINALE(), { ...base, lignes: [] }))).toMatchObject({
      code: 'une_seule_ligne',
    });
    expect(
      erreur(() => corriger(ORIGINALE(), { ...base, lignes: [ligne('6064', 12000, 0)] })),
    ).toBeInstanceOf(ErreurEcriture);
  });

  it('refuse une correction déséquilibrée', () => {
    const e = erreur(() =>
      corriger(ORIGINALE(), { ...base, lignes: [ligne('6064', 12000, 0), ligne('401', 0, 11999)] }),
    );
    expect(e).toMatchObject({ code: 'desequilibre' });
  });

  it('refuse NaN, Infinity et non entiers dans les nouvelles lignes', () => {
    const mauvais = (n: number): LigneEcriture => ({
      compte: '6064',
      libelle: 'x',
      debit: n as LigneEcriture['debit'],
      credit: centimes(0),
    });
    const credit = ligne('401', 0, 12000);
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.5]) {
      const e = erreur(() => corriger(ORIGINALE(), { ...base, lignes: [mauvais(n), credit] }));
      expect(e).toBeInstanceOf(Error);
      expect(e instanceof ErreurEcriture || e instanceof ErreurArgent).toBe(true);
    }
  });

  it("refuse une originale dont les montants sont corrompus", () => {
    const corrompue = validee([
      { compte: '6061', libelle: 'x', debit: Number.NaN as LigneEcriture['debit'], credit: centimes(0) },
      ligne('401', 0, 12000),
    ]);
    const e = erreur(() => contrePasser(corrompue, PARAMS));
    expect(e instanceof ErreurEcriture || e instanceof ErreurArgent).toBe(true);
  });

  it('refuse une originale sans ligne', () => {
    const e = erreur(() => contrePasser(validee([]), PARAMS));
    expect(e).toMatchObject({ code: 'une_seule_ligne' });
  });

  it('refuse des identifiants identiques entre eux ou à l\'originale', () => {
    const lignes = [ligne('6064', 12000, 0), ligne('401', 0, 12000)];
    expect(code(() => corriger(ORIGINALE(), { ...base, idCorrection: 'c1', lignes }))).toBe(
      'ids_non_distincts',
    );
    expect(code(() => corriger(ORIGINALE(), { ...base, idContrePassation: 'e1', lignes }))).toBe(
      'ids_non_distincts',
    );
    expect(code(() => corriger(ORIGINALE(), { ...base, idCorrection: 'e1', lignes }))).toBe(
      'ids_non_distincts',
    );
    expect(code(() => corriger(ORIGINALE(), { ...base, lignes }))).toBeUndefined();
  });

  it('ne partage pas les lignes avec les entrées', () => {
    const lignes = [ligne('6064', 12000, 0), ligne('401', 0, 12000)];
    const r = corriger(ORIGINALE(), { ...base, lignes });
    expect(r.correction.lignes).not.toBe(lignes);
    expect(r.correction.lignes[0]).not.toBe(lignes[0]);
  });
});
