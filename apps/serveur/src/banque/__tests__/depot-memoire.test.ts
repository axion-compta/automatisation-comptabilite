import { describe, expect, it } from 'vitest';
import { verifierChaine } from '../../../../../packages/noyau/src/journal/verifier.js';
import { CANAUX } from '../../../../../packages/noyau/src/securite/types.js';
import { ErreurDepot, TABLES_BANQUE, verifierValeurs, type Contexte } from '../depot.js';
import { creerDepotMemoire, nouvelIdOrdonne } from '../depot-memoire.js';

const T0 = '2026-01-01T00:00:00.000Z';
const ctx = (societeId: string, extra: Partial<Contexte> = {}): Contexte => ({
  societeId, acteur: { type: 'personne', id: 'acteur-fictif' }, module: 'banque', canal: 'api', horodatage: T0, ...extra,
});
const A = ctx('S-A');
const B = ctx('S-B');
const neuf = () => creerDepotMemoire({ nouvelId: nouvelIdOrdonne() });
const code = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
  } catch (e) {
    return e instanceof ErreurDepot ? e.code : 'autre';
  }
  return 'aucune';
};

describe('dépôt banque en mémoire', () => {
  it('t01-1-societe-a-lit-b', async () => {
    const d = neuf();
    const r = await d.ajouter(B, 'compte_bancaire', { nom: 'Compte fictif' });
    const avantB = (await d.journal(B)).length;
    expect(await code(d.lire(A, 'compte_bancaire', r.id))).toBe('acces_refuse');
    const ja = await d.journal(A);
    expect(ja).toHaveLength(1);
    expect(ja[0]?.evenement).toBe('banque.acces_refuse');
    expect(JSON.stringify(ja)).not.toContain('Compte fictif');
    expect(JSON.stringify(ja)).not.toContain('S-B');
    expect(await d.journal(B)).toHaveLength(avantB);
  });

  it('lister-ne-rend-que-sa-societe', async () => {
    const d = neuf();
    await d.ajouter(A, 'releve', { periode: '2026-01' });
    await d.ajouter(B, 'releve', { periode: '2026-01' });
    await d.ajouter(A, 'releve', { periode: '2026-02' });
    expect((await d.lister(A, 'releve')).map((r) => r.societeId)).toEqual(['S-A', 'S-A']);
    expect(await d.lister(A, 'releve', { periode: '2026-02' })).toHaveLength(1);
  });

  it('t01-2-lien-valide-fige', async () => {
    const d = neuf();
    const l = await d.ajouter(A, 'lien_rapprochement', { etat: 'valide' });
    expect(await code(d.modifier(A, 'lien_rapprochement', l.id, 1, { etat: 'propose' }))).toBe('lien_valide_fige');
    expect((await d.lire(A, 'lien_rapprochement', l.id)).etat).toBe('valide');
  });

  it('lien-propose-modifiable-version-plus-un', async () => {
    const d = neuf();
    const l = await d.ajouter(A, 'lien_rapprochement', { etat: 'propose' });
    const m = await d.modifier(A, 'lien_rapprochement', l.id, 1, { etat: 'valide' });
    expect(m.version).toBe(2);
    expect(m.etat).toBe('valide');
    const ev = (await d.journal(A)).map((e) => e.evenement);
    expect(ev).toEqual(['banque.ajout', 'banque.modification']);
  });

  it('version-perimee', async () => {
    const d = neuf();
    const l = await d.ajouter(A, 'lien_rapprochement', { etat: 'propose' });
    for (const v of [0, 2, 1.5, Number.NaN, Infinity]) {
      expect(await code(d.modifier(A, 'lien_rapprochement', l.id, v, { etat: 'x' }))).toBe('version_perimee');
    }
    expect((await d.lire(A, 'lien_rapprochement', l.id)).version).toBe(1);
  });

  it('ajout-seul-fichier-source-et-journal-reserve', async () => {
    const d = neuf();
    const f = await d.ajouter(A, 'fichier_source', { nom: 'releve.csv' });
    expect(await code(d.modifier(A, 'fichier_source', f.id, 1, { nom: 'autre' }))).toBe('ajout_seul');
    expect(await code(d.ajouter(A, 'journal_action', { x: 1 }))).toBe('journal_reserve');
    expect(await code(d.modifier(A, 'journal_action', 'x', 1, {}))).toBe('journal_reserve');
  });

  it('aucune-methode-de-suppression', () => {
    const noms = Object.keys(neuf());
    expect(noms.sort()).toEqual(['ajouter', 'journal', 'lire', 'lister', 'modifier']);
    expect(noms.some((n) => /supprim|delete|retir|effac|remove/i.test(n))).toBe(false);
  });

  it('iban-en-clair-refuse', async () => {
    const d = neuf();
    const iban = 'FR00' + '1'.repeat(10);
    expect(await code(d.ajouter(A, 'compte_bancaire', { iban }))).toBe('iban_en_clair');
    expect(await code(d.ajouter(A, 'compte_bancaire', { ibanBrut: iban }))).toBe('iban_en_clair');
    expect(await code(d.ajouter(A, 'compte_bancaire', { ibanHache: 'h', ibanMasque: 'FR****0001' }))).toBe('aucune');
    expect(verifierValeurs({ societeId: 'S-B' }, 'banque')).toBe('champ_protege');
    expect(await code(d.ajouter(A, 'compte_bancaire', { societeId: 'S-B' }))).toBe('champ_protege');
  });

  it('colonne-iban-ou-libelle-d-un-autre-module', async () => {
    const d = neuf();
    const autre = ctx('S-A', { module: 'rapprochement' });
    expect(await code(d.ajouter(autre, 'ligne_bancaire', { libelleBrut: 'x' }))).toBe('colonne_reservee');
    expect(await code(d.ajouter(autre, 'compte_bancaire', { ibanMasque: 'x' }))).toBe('colonne_reservee');
    expect(await code(d.ajouter(A, 'ligne_bancaire', { libelleBrut: 'x' }))).toBe('aucune');
  });

  it('montants-entiers-seulement', async () => {
    const d = neuf();
    const mauvais: unknown[] = [Number.NaN, Infinity, 1.5, 2 ** 53, '100'];
    for (const m of mauvais) {
      expect(await code(d.ajouter(A, 'ligne_bancaire', { montant: m }))).toBe('montant_invalide');
      expect(await code(d.ajouter(A, 'releve', { soldeCloture: m }))).toBe('montant_invalide');
    }
    expect(await code(d.ajouter(A, 'ligne_bancaire', { montant: -150000 }))).toBe('aucune');
    const l = await d.ajouter(A, 'ligne_bancaire', { montant: 1 });
    expect(await code(d.modifier(A, 'ligne_bancaire', l.id, 1, { montant: 0.5 }))).toBe('montant_invalide');
  });

  it('taux-en-bigint', async () => {
    const d = neuf();
    expect(await code(d.ajouter(A, 'taux_change', { taux: 0.5 }))).toBe('taux_invalide');
    expect(await code(d.ajouter(A, 'taux_change', { taux: '12345678' }))).toBe('taux_invalide');
    const r = await d.ajouter(A, 'taux_change', { taux: 12345678n });
    expect(r.taux).toBe(12345678n);
  });

  it('identifiants-tries-par-creation', async () => {
    const d = neuf();
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) ids.push((await d.ajouter(A, 'contrepartie', { rang: i })).id);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(12);
    expect((await d.lister(A, 'contrepartie')).map((r) => r.id)).toEqual(ids);
  });

  it('journal-chaine-verifie', async () => {
    const d = neuf();
    const r = await d.ajouter(A, 'ligne_bancaire', { libelleBrut: 'LIBELLE-FICTIF-UNIQUE', montant: 100 });
    await d.modifier(A, 'ligne_bancaire', r.id, 1, { montant: 200 });
    await code(d.lire(A, 'ligne_bancaire', 'absent'));
    const j = await d.journal(A);
    expect(j.map((e) => e.sequence)).toEqual([1, 2]);
    expect(verifierChaine(j, { societeId: 'S-A', creeLe: T0 })).toMatchObject({ ok: true });
    expect(JSON.stringify(j)).not.toContain('LIBELLE-FICTIF-UNIQUE');
    expect(j[0]?.apres).toEqual({ table: 'ligne_bancaire', id: r.id, version: 1, champs: ['libelleBrut', 'montant'] });
    const copie = await d.lire(A, 'ligne_bancaire', r.id);
    copie.montant = 999;
    expect((await d.lire(A, 'ligne_bancaire', r.id)).montant).toBe(200);
  });

  it('contexte-et-table-invalides', async () => {
    const d = neuf();
    const mauvais: Contexte[] = [
      ctx(''), ctx('S-A', { module: '' }), ctx('S-A', { acteur: { type: 'ia', id: '' } }),
      ctx('S-A', { canal: 'inconnu' as never }), ctx('S-A', { horodatage: 'pas-une-date' }),
    ];
    for (const c of mauvais) expect(await code(d.ajouter(c, 'releve', {}))).toBe('contexte_invalide');
    expect(await code(d.ajouter(A, 'table_x' as never, {}))).toBe('table_inconnue');
    expect(await code(d.lire(A, 'releve', 'absent'))).toBe('inconnu');
    expect(TABLES_BANQUE).toHaveLength(29);
    expect(CANAUX).toContain(A.canal);
  });
});
