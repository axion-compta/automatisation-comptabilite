import { describe, expect, it } from 'vitest';
import {
  ajouterVersion,
  dernierEnVigueur,
  ErreurHistorique,
  valider,
  type DocumentProduit,
  type NouveauDocument,
} from '../historique.js';
const VAL = { par: 'Camille Fictif', le: '2026-03-01' };
function nouveau(surcharge: Partial<NouveauDocument> = {}): NouveauDocument {
  return {
    id: 'doc-x',
    type: 'fec',
    exerciceId: 'ex-1',
    statut: 'a_valider',
    sha256: 'a'.repeat(64),
    versionLogiciel: '0.0.0-test',
    versionPaquet: 'p-test',
    preparePar: 'Camille Fictif',
    prepareLe: '2026-01-02T10:00:00Z',
    resultatControles: 'ok',
    ...surcharge,
  };
}
function doc(surcharge: Partial<DocumentProduit> = {}): DocumentProduit {
  return { ...nouveau(), id: 'd1', version: 1, ...surcharge };
}
const gele = (h: DocumentProduit[]): readonly DocumentProduit[] =>
  Object.freeze(h.map((d) => Object.freeze(d)));
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurHistorique);
    return (e as ErreurHistorique).code;
  }
  return undefined;
}
describe('historique', () => {
  it('premiere-version-1', () => {
    const h = ajouterVersion([], nouveau());
    expect(h).toHaveLength(1);
    expect(h[0]?.version).toBe(1);
    expect(h[0]?.statut).toBe('a_valider');
  });
  it('version-suivante-par-couple', () => {
    let h = ajouterVersion([], nouveau({ id: 'a' }));
    h = ajouterVersion(h, nouveau({ id: 'b', exerciceId: 'ex-2' }));
    h = ajouterVersion(h, nouveau({ id: 'c', type: 'pv' }));
    h = ajouterVersion(h, nouveau({ id: 'd' }));
    expect(h.map((d) => `${d.id}${d.version}`)).toEqual(['a1', 'b1', 'c1', 'd2']);
    expect(ajouterVersion([doc({ version: 5 })], nouveau())[1]?.version).toBe(6);
  });
  it('remplacement-avec-motif', () => {
    const h0 = [
      doc({ id: 'v1', statut: 'valide' }),
      doc({ id: 'v0', version: 3, statut: 'a_valider' }),
      doc({ id: 'o', exerciceId: 'ex-2', statut: 'valide' }),
      doc({ id: 'pv', type: 'pv', statut: 'valide' }),
    ];
    const h1 = ajouterVersion(h0, nouveau({ id: 'v2', motif: 'Correction après réouverture' }));
    expect(h1.map((d) => d.statut)).toEqual(['remplace', 'a_valider', 'valide', 'valide', 'a_valider']);
    expect(h1.find((d) => d.id === 'v2')?.version).toBe(4);
  });
  it('remplacement-sans-motif-refuse', () => {
    const h = [doc({ statut: 'valide' })];
    for (const motif of ['', '   ']) {
      expect(code(() => ajouterVersion(h, nouveau({ motif })))).toBe('motif_obligatoire');
    }
    expect(code(() => ajouterVersion(h, nouveau()))).toBe('motif_obligatoire');
    const o = doc({ id: 'o', exerciceId: 'ex-2', statut: 'valide' });
    expect(code(() => ajouterVersion([doc({ statut: 'brouillon' }), o], nouveau()))).toBeUndefined();
  });
  it('liste-recue-intacte', () => {
    const h = gele([doc({ id: 'v1', statut: 'valide' })]);
    const r = ajouterVersion(h, nouveau({ id: 'v2', motif: 'Réouverture' }));
    expect(r).not.toBe(h);
    expect(h[0]?.statut).toBe('valide');
    const v = valider(gele([doc({ id: 'b' })]), 'b', VAL);
    expect(v[0]).toMatchObject({ statut: 'valide', validePar: VAL.par, valideLe: VAL.le });
  });
  it('indicatif-non-validable', () => {
    const h = [doc({ id: 'i', statut: 'indicatif' })];
    expect(code(() => valider(h, 'i', VAL))).toBe('indicatif_non_validable');
    const r = doc({ id: 'r', statut: 'remplace' });
    expect(code(() => valider([r], 'r', VAL))).toBe('deja_valide');
    const v2 = (a: DocumentProduit['statut']): DocumentProduit[] => [doc({ id: 'a', statut: a }), doc({ id: 'b', version: 2 })];
    expect(code(() => valider(v2('valide'), 'b', VAL))).toBe('deja_valide');
    expect(code(() => valider(v2('valide'), 'a', VAL))).toBe('deja_valide');
    expect(code(() => valider(v2('a_valider'), 'a', VAL))).toBe('deja_valide');
    expect(code(() => valider(v2('a_valider'), 'b', VAL))).toBeUndefined();
    const ex2 = [doc({ id: 'o', exerciceId: 'ex-2', statut: 'valide' }), doc({ id: 'b' })];
    expect(code(() => valider(ex2, 'b', VAL))).toBeUndefined();
    expect(code(() => valider(h, 'absent', VAL))).toBe('document_inconnu');
    const b = [doc({ id: 'b', statut: 'brouillon' })];
    for (const m of [{ ...VAL, par: '  ' }, { ...VAL, le: '' }, { ...VAL, le: '   ' }]) {
      expect(code(() => valider(b, 'b', m))).toBe('validation_incomplete');
    }
  });
  it('dernier-en-vigueur-ignore-remplace', () => {
    const h = [
      doc({ id: 'v2', version: 2, statut: 'valide' }),
      doc({ id: 'v4', version: 4, statut: 'a_valider' }),
      doc({ id: 'v1', version: 1, statut: 'brouillon' }),
      doc({ id: 'v5', version: 5, statut: 'remplace' }),
      doc({ id: 'x', version: 9, exerciceId: 'ex-2', statut: 'valide' }),
    ];
    expect(dernierEnVigueur(h, 'fec', 'ex-1')?.id).toBe('v4');
    expect(dernierEnVigueur(h, 'fec', 'ex-2')?.id).toBe('x');
    expect(dernierEnVigueur(h, 'pv', 'ex-1')).toBeUndefined();
    expect(dernierEnVigueur([], 'fec', 'ex-1')).toBeUndefined();
  });
  it('version-invalide-refusee', () => {
    for (const version of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => ajouterVersion([doc({ version })], nouveau()))).toBe('version_invalide');
      expect(code(() => valider([doc({ version })], 'doc-x', VAL))).toBe('version_invalide');
    }
    const doublon = [doc({ id: 'a', version: 2 }), doc({ id: 'b', version: 2 })];
    expect(code(() => ajouterVersion(doublon, nouveau()))).toBe('version_invalide');
    expect(code(() => ajouterVersion([doc()], nouveau({ id: 'd1' })))).toBe('version_invalide');
    expect(code(() => valider([doc(), doc({ version: 2 })], 'd1', VAL))).toBe('version_invalide');
  });
  it('statut-initial-refuse', () => {
    for (const statut of ['valide', 'remplace'] as const) {
      expect(code(() => ajouterVersion([], nouveau({ statut })))).toBe('validation_incomplete');
    }
    expect(ajouterVersion([], nouveau({ statut: 'indicatif' }))[0]?.statut).toBe('indicatif');
  });
});
