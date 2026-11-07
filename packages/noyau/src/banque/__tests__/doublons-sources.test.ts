import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { apparier, completerEnAttente, confirmerDoublon, fusionner, type LigneSource } from '../doublons-sources.js';

const opts = { seuilSimilaritePb: 6000, joursTolerance: 1 };
const ligne = (id: string, extra: Partial<LigneSource> = {}): LigneSource => ({
  id, compteId: 'c1', dateOperation: '2026-03-10', montant: centimes(-2500), libelleBrut: 'CARTE CAFE DU PORT', libelleNormalise: 'cafe du port',
  empreinte: `e-${id}`, sources: ['pdf'], etatTechnique: 'completee', etatRapprochement: 'A_QUALIFIER', ...extra,
});
const nouvelle = (id: string, extra: Partial<LigneSource> = {}): LigneSource => ligne(id, { sources: ['csv'], ...extra });
const erreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('doublons-sources', () => {
  it('t10-4-trente-huit-lignes-deux-sources', () => {
    const existantes = Array.from({ length: 38 }, (_, i) => ligne(`p${String(i)}`, { dateOperation: `2026-03-${String(i % 28 + 1).padStart(2, '0')}`, montant: centimes(-(i + 1) * 100), libelleNormalise: `fournisseur ${String(i)} zz` }));
    const lues = existantes.map((e) => nouvelle(`c${e.id}`, { dateOperation: e.dateOperation, montant: e.montant, libelleNormalise: e.libelleNormalise }));
    const res = lues.map((n) => apparier(n, existantes, opts));
    expect(res.filter((r) => r.type === 'nouvelle')).toHaveLength(0);
    expect(res.every((r) => r.type === 'fusion')).toBe(true);
    expect(res.map((r) => (r.type === 'fusion' ? r.ligneId : ''))).toEqual(existantes.map((e) => e.id));
  });

  it('t10-5-deux-candidats-suspect', () => {
    const res = apparier(nouvelle('n'), [ligne('a'), ligne('b'), ligne('autre', { montant: centimes(-2501) })], opts);
    expect(res).toEqual({ type: 'suspects', ligneIds: ['a', 'b'] });
  });

  it('suspect-jamais-fusionne', () => {
    const r = apparier(nouvelle('n'), [ligne('a'), ligne('b')], opts);
    expect(r.type).not.toBe('fusion');
    expect(apparier(nouvelle('n'), [], opts)).toEqual({ type: 'nouvelle' });
  });

  it('identifiant-externe-prioritaire', () => {
    const existantes = [ligne('a'), ligne('b', { idExterne: 'X1' })];
    expect(apparier(nouvelle('n', { idExterne: 'X1', libelleNormalise: 'tout autre' }), existantes, opts)).toEqual({ type: 'fusion', ligneId: 'b' });
    expect(apparier(nouvelle('n', { idExterne: 'X1' }), [ligne('a', { idExterne: 'X1' }), ligne('b', { idExterne: 'X1' })], opts)).toEqual({ type: 'suspects', ligneIds: ['a', 'b'] });
    expect(apparier(nouvelle('n', { idExterne: 'X2' }), [ligne('a', { idExterne: 'X1' })], opts)).toEqual({ type: 'nouvelle' });
    expect(apparier(nouvelle('n', { idExterne: 'X2' }), [ligne('a')], opts)).toEqual({ type: 'fusion', ligneId: 'a' });
  });

  it('date-hors-tolerance-nouvelle', () => {
    const e = [ligne('a')];
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-11' }), e, opts).type).toBe('fusion');
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-09' }), e, opts).type).toBe('fusion');
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-12' }), e, opts).type).toBe('nouvelle');
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-08' }), e, opts).type).toBe('nouvelle');
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-12' }), e, { ...opts, joursTolerance: 2 }).type).toBe('fusion');
    expect(apparier(nouvelle('n', { dateOperation: '2026-03-11' }), e, { ...opts, joursTolerance: 0 }).type).toBe('nouvelle');
  });

  it('criteres-exclusifs', () => {
    const n = nouvelle('n');
    expect(apparier(n, [ligne('a', { compteId: 'c2' })], opts).type).toBe('nouvelle');
    expect(apparier(n, [ligne('a', { montant: centimes(-2501) })], opts).type).toBe('nouvelle');
    expect(apparier(n, [ligne('a', { libelleNormalise: 'zzzz qqqq' })], opts).type).toBe('nouvelle');
    expect(apparier(n, [ligne('a', { etatRapprochement: 'IGNOREE' })], opts).type).toBe('nouvelle');
    expect(apparier(n, [ligne('a', { sources: ['csv'] })], opts).type).toBe('nouvelle');
    expect(apparier(n, [ligne('a', { libelleNormalise: 'cafe du port' })], { ...opts, seuilSimilaritePb: 10000 }).type).toBe('fusion');
  });

  it('libelle-le-plus-long-garde', () => {
    const e = ligne('a', { libelleBrut: 'CAFE' });
    const f = fusionner(e, nouvelle('n', { libelleBrut: 'CARTE CAFE DU PORT 10/03' }));
    expect(f).toEqual({ ...e, sources: ['pdf', 'csv'], libelleSecondaire: 'CARTE CAFE DU PORT 10/03' });
    expect(f.empreinte).toBe('e-a');
    expect(fusionner(ligne('a', { libelleBrut: 'LONGUE' }), nouvelle('n', { libelleBrut: 'COURT' })).libelleSecondaire).toBe('LONGUE');
    expect(fusionner(ligne('a', { libelleBrut: 'AAAA' }), nouvelle('n', { libelleBrut: 'BBBB' })).libelleSecondaire).toBe('AAAA');
    expect(fusionner(e, nouvelle('n', { sources: ['pdf', 'csv'] })).sources).toEqual(['pdf', 'csv']);
  });

  it('t10-6-confirmation-sans-suppression', () => {
    const lignes = [ligne('a'), ligne('b'), ligne('c')];
    const res = confirmerDoublon(lignes, { conserveeId: 'a', doublonId: 'b', decidePar: 'Alice Martin', motif: 'même opération' });
    expect(res).toHaveLength(lignes.length);
    expect(res[1]).toEqual({ ...lignes[1], etatRapprochement: 'IGNOREE', doublonDe: 'a', decidePar: 'Alice Martin', motifDoublon: 'même opération' });
    expect(res[0]).toBe(lignes[0]);
    expect(res[2]).toBe(lignes[2]);
    expect(lignes[1]?.etatRapprochement).toBe('A_QUALIFIER');
    const d = { decidePar: 'Alice', motif: 'm' };
    expect(erreur(() => confirmerDoublon(lignes, { conserveeId: 'a', doublonId: 'a', ...d }))).toBe('ids_identiques');
    expect(erreur(() => confirmerDoublon(lignes, { conserveeId: 'z', doublonId: 'b', ...d }))).toBe('ligne_inconnue');
    expect(erreur(() => confirmerDoublon(lignes, { conserveeId: 'a', doublonId: 'z', ...d }))).toBe('ligne_inconnue');
    expect(erreur(() => confirmerDoublon(lignes, { conserveeId: 'a', doublonId: 'b', decidePar: '', motif: 'm' }))).toBe('decision_incomplete');
    expect(erreur(() => confirmerDoublon(lignes, { conserveeId: 'a', doublonId: 'b', decidePar: 'A', motif: '' }))).toBe('decision_incomplete');
  });

  it('t10-6b-refus-ligne-deja-ignoree', () => {
    const d = { decidePar: 'Alice', motif: 'm' };
    const r1 = confirmerDoublon([ligne('a'), ligne('b')], { conserveeId: 'a', doublonId: 'b', ...d });
    expect(erreur(() => confirmerDoublon(r1, { conserveeId: 'b', doublonId: 'a', ...d }))).toBe('ligne_deja_ignoree');
    expect(erreur(() => confirmerDoublon(r1, { conserveeId: 'a', doublonId: 'b', ...d }))).toBe('ligne_deja_ignoree');
    const r2 = confirmerDoublon([ligne('a'), ligne('b'), ligne('c')], { conserveeId: 'a', doublonId: 'b', ...d });
    expect(erreur(() => confirmerDoublon(r2, { conserveeId: 'b', doublonId: 'c', ...d }))).toBe('ligne_deja_ignoree');
  });

  it('en-attente-puis-completee-ecart-trace', () => {
    const attente = ligne('a', { etatTechnique: 'en_attente', montant: centimes(-2000) });
    const fin = nouvelle('n', { montant: centimes(-2300) });
    const r = completerEnAttente(attente, fin);
    expect(r.ecart).toBe(-300);
    expect(r.ligne).toEqual({ ...attente, montant: -2300, etatTechnique: 'completee' });
    const meme = completerEnAttente(attente, nouvelle('n', { montant: centimes(-2000) }));
    expect(meme.ecart).toBeUndefined();
    expect(meme.ligne.etatTechnique).toBe('completee');
    expect(erreur(() => completerEnAttente(fin, fin))).toBe('pas_en_attente');
    expect(erreur(() => completerEnAttente(attente, ligne('x', { etatTechnique: 'en_attente' })))).toBe('pas_completee');
  });

  it('entrees-invalides', () => {
    const n = nouvelle('n');
    const seuil = (v: number): string | undefined => erreur(() => apparier(n, [], { ...opts, seuilSimilaritePb: v }));
    for (const v of [Number.NaN, -1, 10001, 1.5, Number.POSITIVE_INFINITY]) expect(seuil(v)).toBe('seuil_invalide');
    expect(seuil(0)).toBeUndefined();
    expect(seuil(10000)).toBeUndefined();
    for (const j of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(erreur(() => apparier(n, [], { ...opts, joursTolerance: j }))).toBe('tolerance_invalide');
    }
    expect(() => apparier(nouvelle('n', { dateOperation: 'x' }), [ligne('a')], opts)).toThrow();
  });
});
