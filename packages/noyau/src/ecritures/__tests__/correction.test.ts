import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurCorrection, contrePasser, corriger } from '../correction.js';
import { ErreurEcriture, type Ecriture, type LigneEcriture } from '../modele.js';

const ligne = (compte: string, debit: number, credit: number): LigneEcriture => ({
  compte,
  libelle: 'Achat fictif',
  debit: centimes(debit),
  credit: centimes(credit),
});

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
const NOUVELLES = [ligne('6064', 12000, 0), ligne('401', 0, 12000)];
const BASE = { idContrePassation: 'c1', idCorrection: 'c2', date: '2026-02-01', motif: 'Mauvais compte' };
const AVEC = (extra: object) => () => corriger(ORIGINALE(), { ...BASE, lignes: NOUVELLES, ...extra });

const solde = (ecritures: readonly Ecriture[], compte: string): number =>
  ecritures.flatMap((e) => e.lignes).reduce((t, l) => (l.compte === compte ? t + l.debit - l.credit : t), 0);

describe('correction par contre-passation', () => {
  it('contre-passation-inverse-les-lignes', () => {
    const c = contrePasser(ORIGINALE(), PARAMS);
    expect(c).toMatchObject({ statut: 'brouillon', type: 'correction', lienOriginale: 'e1', id: 'c1' });
    expect(c).toMatchObject({ date: '2026-02-01', journal: 'AC' });
    expect(c.lignes).toEqual([ligne('6061', 0, 12000), ligne('401', 12000, 0)]);
    expect(c.numero).toBeUndefined();
    expect(c.contrePassee).toBeUndefined();
  });

  it('motif-obligatoire', () => {
    for (const motif of ['', ' ', '  \t\n ']) {
      expect(() => contrePasser(ORIGINALE(), { ...PARAMS, motif })).toThrow(
        expect.objectContaining({ code: 'motif_obligatoire' }),
      );
    }
    expect(AVEC({ motif: '   ' })).toThrow(expect.objectContaining({ code: 'motif_obligatoire' }));
    expect(() => contrePasser(ORIGINALE(), { ...PARAMS, motif: 'x' })).not.toThrow();
  });

  it('originale-non-validee-refusee', () => {
    for (const statut of ['brouillon', 'propose'] as const) {
      expect(() => contrePasser({ ...ORIGINALE(), statut }, PARAMS)).toThrow(
        expect.objectContaining({ code: 'originale_non_validee' }),
      );
    }
  });

  it('deja-contre-passee-refusee', () => {
    const o = validee([ligne('6061', 12000, 0), ligne('401', 0, 12000)], { contrePassee: true });
    expect(() => contrePasser(o, PARAMS)).toThrow(expect.objectContaining({ code: 'deja_contre_passee' }));
    expect(() => corriger(o, { ...BASE, lignes: NOUVELLES })).toThrow(ErreurCorrection);
    const non = validee(ORIGINALE().lignes.slice(), { contrePassee: false });
    expect(() => contrePasser(non, PARAMS)).not.toThrow();
  });

  it('originale-intacte', () => {
    const o = ORIGINALE();
    const avant = JSON.stringify(o);
    const r = corriger(o, { ...BASE, lignes: NOUVELLES });
    expect(JSON.stringify(o)).toBe(avant);
    expect(o.contrePassee).toBeUndefined();
    expect(r.marqueOriginale).toMatchObject({ contrePassee: true, statut: 'valide', numero: 'AC-0001' });
    expect(r.marqueOriginale.lignes).toEqual(o.lignes);
    expect(r.marqueOriginale.lignes).not.toBe(o.lignes);
    expect(r.correction).toMatchObject({ statut: 'brouillon', type: 'correction', lienOriginale: 'e1', id: 'c2' });
    expect(r.correction.lignes).toEqual(NOUVELLES);
    expect(r.correction.lignes).not.toBe(NOUVELLES);
    expect(r.contrePassation).toMatchObject({ id: 'c1', lienOriginale: 'e1' });
  });

  it('soldes-apres-correction', () => {
    const r = AVEC({})();
    const tout = [r.marqueOriginale, r.contrePassation, r.correction];
    expect(solde(tout, '6061')).toBe(0);
    expect(solde(tout, '6064')).toBe(12000);
    expect(solde(tout, '401')).toBe(-12000);
  });
});

describe('correction : cas limites', () => {
  it('refuse une correction vide, à une ligne ou déséquilibrée', () => {
    expect(AVEC({ lignes: [] })).toThrow(expect.objectContaining({ code: 'une_seule_ligne' }));
    expect(AVEC({ lignes: [ligne('6064', 12000, 0)] })).toThrow(ErreurEcriture);
    expect(AVEC({ lignes: [ligne('6064', 12000, 0), ligne('401', 0, 11999)] })).toThrow(
      expect.objectContaining({ code: 'desequilibre' }),
    );
  });

  it('refuse NaN, Infinity et non entiers, dans la correction comme dans l originale', () => {
    const mauvais = (n: number): LigneEcriture => ({ ...ligne('6064', 0, 0), debit: n as LigneEcriture['debit'] });
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.5]) {
      expect(AVEC({ lignes: [mauvais(n), ligne('401', 0, 12000)] })).toThrow();
      expect(() => contrePasser(validee([mauvais(n), ligne('401', 0, 12000)]), PARAMS)).toThrow();
    }
    expect(() => contrePasser(validee([]), PARAMS)).toThrow(expect.objectContaining({ code: 'une_seule_ligne' }));
  });

  it('refuse des identifiants non distincts', () => {
    for (const extra of [{ idCorrection: 'c1' }, { idContrePassation: 'e1' }, { idCorrection: 'e1' }]) {
      expect(AVEC(extra)).toThrow(expect.objectContaining({ code: 'ids_non_distincts' }));
    }
    expect(AVEC({})).not.toThrow();
  });
});

describe('correction : motif et identifiants (L01-T41)', () => {
  it('conserve le motif dans la contre-passation et la correction, pas dans l originale', () => {
    const o = ORIGINALE();
    const r = corriger(o, { ...BASE, lignes: NOUVELLES });
    expect(r.contrePassation.motif).toBe('Mauvais compte');
    expect(r.correction.motif).toBe('Mauvais compte');
    expect(o.motif).toBeUndefined();
    expect(r.marqueOriginale.motif).toBeUndefined();
    expect(contrePasser(o, PARAMS).motif).toBe('Mauvais compte de charge');
  });

  it('retire les blancs en bord du motif et garde ceux du milieu', () => {
    const c = contrePasser(ORIGINALE(), { ...PARAMS, motif: ' \t Erreur  de compte \n' });
    expect(c.motif).toBe('Erreur  de compte');
    expect(AVEC({ motif: '  Doublon ' })().correction.motif).toBe('Doublon');
    expect(AVEC({ motif: '  Doublon ' })().contrePassation.motif).toBe('Doublon');
  });

  it('refuse params.id égal à l identifiant de l originale', () => {
    expect(() => contrePasser(ORIGINALE(), { ...PARAMS, id: 'e1' })).toThrow(
      expect.objectContaining({ code: 'ids_non_distincts' }),
    );
    expect(() => contrePasser(ORIGINALE(), { ...PARAMS, id: 'e2' })).not.toThrow();
  });

  it('reprend le journal de l originale et la date reçue', () => {
    const o = validee([ligne('6061', 12000, 0), ligne('401', 0, 12000)], { journal: 'OD', date: '2026-01-02' });
    const r = corriger(o, { ...BASE, date: '2026-03-09', lignes: NOUVELLES });
    for (const e of [r.contrePassation, r.correction]) {
      expect(e).toMatchObject({ journal: 'OD', date: '2026-03-09', statut: 'brouillon' });
    }
    expect(contrePasser(o, { ...PARAMS, date: '2026-04-01' })).toMatchObject({ journal: 'OD', date: '2026-04-01' });
  });

  it('ne modifie jamais une entrée gelée et refuse les cas invalides sans effet', () => {
    const o = ORIGINALE();
    const lignes = Object.freeze(NOUVELLES.map((l) => Object.freeze({ ...l })));
    expect(() => corriger(o, { ...BASE, lignes })).not.toThrow();
    expect(() => corriger({ ...o, statut: 'brouillon' }, { ...BASE, lignes })).toThrow(
      expect.objectContaining({ code: 'originale_non_validee' }),
    );
    expect(() => corriger(o, { ...BASE, motif: '\t', lignes })).toThrow(
      expect.objectContaining({ code: 'motif_obligatoire' }),
    );
    expect(() => corriger(o, { ...BASE, lignes: [] })).toThrow(expect.objectContaining({ code: 'une_seule_ligne' }));
  });
});
