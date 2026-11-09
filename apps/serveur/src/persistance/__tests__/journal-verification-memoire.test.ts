import { describe, expect, it } from 'vitest';
import type { LigneJournal } from '../../../../../packages/noyau/src/controles/journal.js';
import { creerJournalVerificationMemoire } from '../journal-verification-memoire.js';

const A = { societe: 'societe-a' };
const B = { societe: 'societe-b' };
const ligne = (extra: Partial<LigneJournal> = {}): LigneJournal => ({ horodatage: '2026-01-01T10:00:00Z', declencheur: 'arrivee', regleId: 'R1', versionRegle: 1, objetType: 'piece', objetId: 'p1', resultat: 'OK', versionParametres: 'v1', ...extra });
const neuf = () => { let n = 0; return creerJournalVerificationMemoire({ nouvelId: () => `id-${++n}` }); };
const code = async (p: Promise<unknown>): Promise<string | undefined> => { try { await p; } catch (e) { return (e as { code?: string }).code ?? 'autre'; } return undefined; };

describe('journal de vérification en mémoire', () => {
  it('CT-40', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne({ declencheur: 'arrivee' })]);
    await j.ajouterLot(A, [ligne({ declencheur: 'nocturne', horodatage: '2026-01-02T00:00:00Z' })]);
    await j.ajouterLot(A, [ligne({ declencheur: 'avant_export', horodatage: '2026-01-03T00:00:00Z', resultat: 'ALERTE' })]);
    const h = await j.historique(A, 'piece', 'p1');
    expect(h.map((l) => l.declencheur)).toEqual(['arrivee', 'nocturne', 'avant_export']);
    expect(await code(j.modifier(A, 'id-1', { resultat: 'ALERTE' }))).toBe('ajout_seul');
    expect(await j.historique(A, 'piece', 'p1')).toEqual(h);
  });
  it('modification-refusee', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne()]);
    expect(await code(j.modifier(A, 'id-1', { resultat: 'ALERTE' }))).toBe('ajout_seul');
    expect(await code(j.modifier(A, 'inconnu', {}))).toBe('ajout_seul');
    expect((await j.historique(A, 'piece', 'p1'))[0]?.resultat).toBe('OK');
  });
  it('suppression-refusee', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne()]);
    expect(await code(j.supprimer(A, 'id-1'))).toBe('ajout_seul');
    expect(await code(j.supprimer(A, 'inconnu'))).toBe('ajout_seul');
    expect(await j.historique(A, 'piece', 'p1')).toHaveLength(1);
  });
  it('lot-tout-ou-rien', async () => {
    const j = neuf();
    expect(await code(j.ajouterLot(A, [ligne(), ligne({ regleId: ' ' })]))).toBe('ligne_invalide');
    expect(await j.historique(A, 'piece', 'p1')).toEqual([]);
  });
  it('historique-ordonne', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne({ horodatage: '2026-01-02', regleId: 'R2' }), ligne({ horodatage: '2026-01-01', regleId: 'R9' }), ligne({ horodatage: '2026-01-02', regleId: 'R1' })]);
    expect((await j.historique(A, 'piece', 'p1')).map((l) => `${l.horodatage}/${l.regleId}`)).toEqual(['2026-01-01/R9', '2026-01-02/R1', '2026-01-02/R2']);
  });
  it('isolation-societe', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne()]);
    expect(await j.historique(B, 'piece', 'p1')).toEqual([]);
    expect(await j.historique(A, 'piece', 'p1')).toHaveLength(1);
  });
  it('copie-non-modifiable', async () => {
    const j = neuf();
    const source = ligne();
    await j.ajouterLot(A, [source]);
    source.resultat = 'ALERTE';
    (await j.historique(A, 'piece', 'p1'))[0]!.resultat = 'ALERTE';
    expect((await j.historique(A, 'piece', 'p1'))[0]?.resultat).toBe('OK');
  });
  it('reussites-ecrites', async () => {
    const j = neuf();
    await j.ajouterLot(A, [ligne({ resultat: 'OK' }), ligne({ resultat: 'ALERTE', regleId: 'R2' })]);
    expect((await j.historique(A, 'piece', 'p1')).map((l) => l.resultat)).toEqual(['OK', 'ALERTE']);
  });
  it('ligne-invalide', async () => {
    const cas: Partial<LigneJournal>[] = [
      { ecartCentimes: Number.NaN }, { ecartCentimes: Number.POSITIVE_INFINITY }, { ecartCentimes: 1.5 },
      { valeur: Number.NaN }, { valeur: Number.NEGATIVE_INFINITY },
      { versionRegle: 0 }, { versionRegle: 1.5 }, { versionRegle: Number.NaN },
      { versionParametres: '' }, { horodatage: '  ' }, { regleId: '' }, { objetType: '' }, { objetId: ' ' },
    ];
    for (const c of cas) {
      const j = neuf();
      expect(await code(j.ajouterLot(A, [ligne(c)]))).toBe('ligne_invalide');
      expect(await j.historique(A, 'piece', 'p1')).toEqual([]);
    }
    const j = neuf();
    await j.ajouterLot(A, [ligne({ valeur: 0.2, ecartCentimes: 0 })]);
    expect(await j.historique(A, 'piece', 'p1')).toHaveLength(1);
  });
  it('contexte-invalide', async () => {
    const j = neuf();
    for (const societe of ['', '   ']) {
      const ctx = { societe };
      expect(await code(j.ajouterLot(ctx, [ligne({ regleId: '' })]))).toBe('contexte_invalide');
      expect(await code(j.historique(ctx, 'piece', 'p1'))).toBe('contexte_invalide');
      expect(await code(j.modifier(ctx, 'x', {}))).toBe('contexte_invalide');
      expect(await code(j.supprimer(ctx, 'x'))).toBe('contexte_invalide');
    }
  });
  it('lot-vide', async () => {
    const j = neuf();
    expect(await code(j.ajouterLot(A, []))).toBeUndefined();
    expect(await j.historique(A, 'piece', 'p1')).toEqual([]);
  });
});
