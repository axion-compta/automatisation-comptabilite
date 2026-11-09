import { describe, expect, it } from 'vitest';
import type { CaseDeclaration } from '../../../../../packages/noyau/src/declarations/cases.js';
import type { ResultatFormules } from '../../../../../packages/noyau/src/declarations/formules.js';
import type { NouveauDocument } from '../../../../../packages/noyau/src/documents/historique.js';
import type { PeriodeDeclaration } from '../../../../../packages/noyau/src/tva/periodes.js';
import { STATUTS_DOCUMENT, STATUTS_PERIODE } from '../declarations.js';
import { DepotDocumentsMemoire, DepotTvaMemoire } from '../declarations-memoire.js';

const A = 'societe-a';
const B = 'societe-b';
const EX = 'ex-2026';
const PAR = 'prenom.nom@exemple.fr';
const doc = (id: string, extra: Partial<NouveauDocument> = {}): NouveauDocument => ({ id, type: 'declaration_tva', exerciceId: EX, statut: 'brouillon', sha256: 'h'.repeat(8), versionLogiciel: 'v', versionPaquet: 'p', preparePar: PAR, prepareLe: '2026-01-01', resultatControles: 'ok', ...extra });
const periode = (debut: string, fin: string): PeriodeDeclaration => ({ debut, fin, periodicite: 'mensuelle', formulaire: 'F-TEST' });
const cas = (montant: number): CaseDeclaration => ({ code: 'L1', montant: montant as never, sources: [{ ecritureId: 'e1', ligneIndex: 0 }], aCalculer: false });
const ok = (...m: number[]): ResultatFormules => ({ bloque: false, cases: m.map(cas) });
const err = (f: () => unknown): { code?: string } | undefined => { try { f(); } catch (e) { return e as { code?: string }; } return undefined; };
const code = (f: () => unknown): string | undefined => { const e = err(f); return e && (e.code ?? 'autre'); };
const tva = () => { const d = new DepotTvaMemoire(); return { d, id: (d.enregistrerPeriodes(A, EX, [periode('2026-01-01', '2026-01-31')])[0] as { id: string }).id }; };

describe('documents produits en mémoire', () => {
  it('version-calculee-et-unique', () => {
    const d = new DepotDocumentsMemoire();
    expect(d.ajouterVersion(A, doc('d1')).version).toBe(1);
    expect(d.ajouterVersion(A, doc('d2')).version).toBe(2);
    expect(d.ajouterVersion(B, doc('d1')).version).toBe(1);
  });
  it('remplacement-avec-motif', () => {
    const d = new DepotDocumentsMemoire();
    d.ajouterVersion(A, doc('d1'));
    d.valider(A, 'd1', { par: PAR, le: '2026-02-01' });
    expect(code(() => d.ajouterVersion(A, doc('d2')))).toBe('motif_obligatoire');
    expect(d.historique(A, 'declaration_tva', EX)).toHaveLength(1);
    d.ajouterVersion(A, doc('d2', { motif: 'correction fictive' }));
    expect(d.parId(A, 'd1')?.statut).toBe('remplace');
  });
  it('statuts-en-liste-fermee', () => {
    expect([...STATUTS_DOCUMENT].sort()).toEqual(['a_valider', 'brouillon', 'indicatif', 'remplace', 'valide']);
    expect([...STATUTS_PERIODE].sort()).toEqual(['deposee_par_client', 'ouverte', 'preparee', 'validee', 'verrouillee']);
    expect(code(() => new DepotDocumentsMemoire().ajouterVersion(A, doc('d1', { statut: 'inconnu' as never })))).toBe('statut_invalide');
  });
});

describe('TVA en mémoire', () => {
  it('periode-transitions-du-noyau', () => {
    const { d, id } = tva();
    expect(d.changerStatutPeriode(A, id, 'preparee').statut).toBe('preparee');
    expect(d.changerStatutPeriode(A, id, 'validee').statut).toBe('validee');
    expect(code(() => d.changerStatutPeriode(A, id, 'ouverte'))).toBe('transition_interdite');
    expect(d.periode(A, id)?.statut).toBe('validee');
  });
  it('accuse-depose-la-periode', () => {
    const { d, id } = tva();
    d.changerStatutPeriode(A, id, 'preparee');
    d.changerStatutPeriode(A, id, 'validee');
    const accuse = { id: 'ac1', periodeId: id, pieceId: '', saisiPar: PAR, saisiLe: '2026-02-01' };
    expect(code(() => d.enregistrerAccuse(A, accuse))).toBe('accuse_manquant');
    expect(d.periode(A, id)?.statut).toBe('validee');
    d.enregistrerAccuse(A, { ...accuse, pieceId: 'piece-1' });
    expect(d.periode(A, id)).toMatchObject({ statut: 'deposee_par_client', accusePieceId: 'piece-1' });
    expect(code(() => d.enregistrerAccuse(A, { ...accuse, pieceId: 'piece-1' }))).toBe('transition_interdite');
  });
  it.each([
    [{ bloque: true, code: 'ligne_absente', ligne: 'L9' } as ResultatFormules, 'ligne_absente'],
    [{ bloque: true, code: 'base_negative', ligne: 'L9', montant: -5 as never } as ResultatFormules, 'base_negative'],
  ])('declaration-bloquee-refusee %#', (resultat, attendu) => {
    const { d, id } = tva();
    expect(err(() => d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat }))).toMatchObject({ code: 'declaration_bloquee', detail: attendu });
    expect(d.declaration(A, 'dc1')).toBeNull();
  });
  it('montants-entiers-seulement', () => {
    const { d, id } = tva();
    for (const m of [NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(code(() => d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat: ok(100, m) }))).toBe('autre');
      expect(d.declaration(A, 'dc1')).toBeNull();
    }
    expect(d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat: ok() }).cases).toEqual([]);
    expect(code(() => d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat: ok() }))).toBe('deja_enregistre');
  });
  it('une-societe-ne-lit-jamais-une-autre', () => {
    const { d, id } = tva();
    const docs = new DepotDocumentsMemoire();
    docs.ajouterVersion(A, doc('d1'));
    d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat: ok(100) });
    const accuse = { id: 'ac1', periodeId: id, pieceId: 'piece-1', saisiPar: PAR, saisiLe: '2026-02-01' };
    const coups: [string, (s: string, x: string) => unknown][] = [
      ['historique', (s) => docs.historique(s, 'declaration_tva', EX)],
      ['parId', (s, x) => docs.parId(s, x === id ? 'd1' : x)],
      ['valider', (s, x) => docs.valider(s, x === id ? 'd1' : x, { par: PAR, le: '2026-02-01' })],
      ['periodes', (s) => d.periodes(s, EX)],
      ['periode', (s, x) => d.periode(s, x)],
      ['changerStatutPeriode', (s, x) => d.changerStatutPeriode(s, x, 'preparee')],
      ['enregistrerDeclaration', (s, x) => d.enregistrerDeclaration(s, { id: 'dc9', periodeId: x, documentId: 'd1', resultat: ok(1) })],
      ['declaration', (s, x) => d.declaration(s, x === id ? 'dc1' : x)],
      ['enregistrerAccuse', (s, x) => d.enregistrerAccuse(s, { ...accuse, periodeId: x })],
    ];
    for (const [nom, appel] of coups) {
      const issue = (s: string, x: string): unknown => { try { return appel(s, x); } catch (e) { return (e as Error).message; } };
      const autre = issue(B, id);
      expect(autre === null || autre === 'introuvable' || (Array.isArray(autre) && autre.length === 0), nom).toBe(true);
      expect(autre, nom).toEqual(issue(B, 'id-inexistant'));
    }
    expect(d.periode(A, id)?.statut).toBe('ouverte');
    expect(d.declaration(A, 'dc9')).toBeNull();
  });
  it.each(['', '  '])('societe-vide-refusee %j', (s) => {
    const d = new DepotTvaMemoire();
    const m = new DepotDocumentsMemoire();
    for (const f of [() => d.periode(s, 'x'), () => d.periodes(s, EX), () => d.declaration(s, 'x'), () => m.parId(s, 'x'), () => m.historique(s, 'fec', EX), () => d.enregistrerPeriodes(s, EX, [])]) {
      expect(code(f)).toBe('societe_invalide');
    }
  });
  it('copies-rendues', () => {
    const { d, id } = tva();
    (d.periode(A, id) as { statut: string }).statut = 'verrouillee';
    d.enregistrerDeclaration(A, { id: 'dc1', periodeId: id, documentId: 'd1', resultat: ok(100) });
    (d.declaration(A, 'dc1')?.cases[0] as { montant: number }).montant = 7;
    expect(d.periode(A, id)?.statut).toBe('ouverte');
    expect(d.declaration(A, 'dc1')?.cases[0]?.montant).toBe(100);
  });
  it('periodes-rejouees-sans-effet', () => {
    const { d, id } = tva();
    const again = d.enregistrerPeriodes(A, EX, [periode('2026-01-01', '2026-01-31')]);
    expect(again.map((p) => p.id)).toEqual([id]);
    expect(d.periodes(A, EX)).toHaveLength(1);
    expect(code(() => d.enregistrerPeriodes(A, EX, [periode('2026-01-01', '2026-02-15')]))).toBe('deja_enregistre');
    expect(code(() => d.enregistrerPeriodes(A, EX, [periode('2026-02-01', '2026-02-28'), periode('2026-01-01', '2026-02-15')]))).toBe('deja_enregistre');
    expect(d.periodes(A, EX)).toHaveLength(1);
  });
});
