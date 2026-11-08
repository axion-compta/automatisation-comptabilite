import { describe, expect, it } from 'vitest';
import { CATALOGUE_GESTES } from '../../../../../packages/noyau/src/principes/gestes.js';
import type { CorrectionClassement } from '../../../../../packages/noyau/src/principes/memoire-correction.js';
import { ErreurPersistance, creerBaseMemoire, type RefusGeste } from '../principes.js';

const A = 'societe-a';
const B = 'societe-b';
const T0 = 1_700_000_000_000;

const refus = (o: Partial<RefusGeste> = {}): RefusGeste => ({
  id: 'r1', societeId: A, geste: 'G01', operationId: 'op-1', acteurType: 'agent', code: 'geste_requis', canal: 'chat', horodatage: T0, ...o,
});
const corr = (o: Partial<CorrectionClassement> = {}): CorrectionClassement => ({
  societeId: A, fournisseurId: 'f1', libelle: 'Papeterie fictive', ancienCompte: '606', nouveauCompte: '616', canal: 'chat', ecritureId: 'e1', date: '2026-01-02', ...o,
});
async function amorcee(codes: string[] = ['ia-classement', 'ia-relance']) {
  const base = creerBaseMemoire();
  await base.amorcer({ societeId: A, codesInterrupteurs: codes, maintenant: T0 });
  return base;
}
async function code(p: Promise<unknown>): Promise<string | undefined> {
  try { await p; } catch (e) { return e instanceof ErreurPersistance ? e.code : 'autre'; }
  return undefined;
}

describe('principes en mémoire', () => {
  it('douze-lignes-de-gestes', async () => {
    const base = creerBaseMemoire();
    expect(await base.gestes.lister()).toEqual([]);
    await base.amorcer({ societeId: A, codesInterrupteurs: [], maintenant: T0 });
    const l = await base.gestes.lister();
    expect(l).toEqual(CATALOGUE_GESTES);
    expect(l).toHaveLength(CATALOGUE_GESTES.length);
    expect(l.map((g) => g.code)).toEqual(expect.arrayContaining(['G01', 'G12']));
    expect(l).not.toBe(CATALOGUE_GESTES);
    expect(Object.keys(base.gestes)).toEqual(['lister']);
  });

  it('refus-en-ajout-seul', async () => {
    const base = await amorcee();
    await base.refus.ajouter(refus());
    expect(await code(base.refus.ajouter(refus({ code: 'autre_code' })))).toBe('ajout_seul');
    const l = await base.refus.lister(A);
    expect(l).toHaveLength(1);
    expect(l[0]?.code).toBe('geste_requis');
    for (const depot of [base.refus, base.corrections, base.gestes]) {
      expect('modifier' in depot).toBe(false);
      expect('supprimer' in depot).toBe(false);
    }
    (l[0] as { code: string }).code = 'altere';
    expect((await base.refus.lister(A))[0]?.code).toBe('geste_requis');
    await base.corrections.ajouter(corr());
    expect(await code(base.corrections.ajouter(corr({ nouveauCompte: '999' })))).toBe('ajout_seul');
    const c = await base.corrections.lister(A);
    expect(c).toHaveLength(1);
    expect(c[0]?.nouveauCompte).toBe('616');
    (c[0] as { nouveauCompte: string }).nouveauCompte = 'x';
    expect((await base.corrections.lister(A))[0]?.nouveauCompte).toBe('616');
  });

  it('memoire-filtree-par-societe', async () => {
    const base = await amorcee();
    await base.amorcer({ societeId: B, codesInterrupteurs: ['ia-classement'], maintenant: T0 });
    await base.refus.ajouter(refus());
    await base.corrections.ajouter(corr());
    expect(await base.refus.lister(B)).toEqual([]);
    expect(await base.corrections.lister(B)).toEqual([]);
    expect(await base.interrupteurs.lire(B, 'ia-relance')).toBeNull();
    expect(await base.interrupteurs.lister(B)).toHaveLength(1);
    await base.corrections.ajouter(corr({ societeId: B }));
    expect(await base.corrections.lister(A)).toHaveLength(1);
    const autre = await amorcee();
    expect(await autre.refus.lister(A)).toEqual([]);
    expect(await autre.corrections.lister(A)).toEqual([]);
  });

  it('interrupteur-cree-ferme', async () => {
    const base = await amorcee();
    expect(await base.interrupteurs.lire(A, 'ia-classement')).toEqual({ code: 'ia-classement', etat: 'ferme', depuis: T0 });
    expect((await base.interrupteurs.lister(A)).map((e) => e.etat)).toEqual(['ferme', 'ferme']);
    expect(await base.interrupteurs.lire(A, 'absent')).toBeNull();
  });

  it('migration-appliquee-deux-fois-sans-effet', async () => {
    const base = await amorcee();
    await base.interrupteurs.enregistrer(A, { code: 'ia-classement', etat: 'pilote', depuis: T0 + 5 });
    const avant = JSON.stringify([await base.gestes.lister(), await base.interrupteurs.lister(A)]);
    await base.amorcer({ societeId: A, codesInterrupteurs: ['ia-classement', 'ia-relance'], maintenant: T0 + 99 });
    expect(JSON.stringify([await base.gestes.lister(), await base.interrupteurs.lister(A)])).toBe(avant);
    expect((await base.interrupteurs.lire(A, 'ia-classement'))?.etat).toBe('pilote');
    await base.amorcer({ societeId: A, codesInterrupteurs: ['ia-nouveau'], maintenant: T0 + 99 });
    expect(await base.interrupteurs.lire(A, 'ia-nouveau')).toEqual({ code: 'ia-nouveau', etat: 'ferme', depuis: T0 + 99 });
  });

  it('interrupteur-inconnu-refuse', async () => {
    const base = await amorcee();
    expect(await code(base.interrupteurs.enregistrer(A, { code: 'jamais', etat: 'ouvert', depuis: T0 }))).toBe('interrupteur_inconnu');
    expect(await code(base.interrupteurs.enregistrer(B, { code: 'ia-classement', etat: 'ouvert', depuis: T0 }))).toBe('interrupteur_inconnu');
    expect(await base.interrupteurs.lire(A, 'jamais')).toBeNull();
    const e = await base.interrupteurs.lire(A, 'ia-classement');
    (e as { etat: string }).etat = 'ouvert';
    expect((await base.interrupteurs.lire(A, 'ia-classement'))?.etat).toBe('ferme');
  });

  it('tri-stable-des-listes', async () => {
    const base = await amorcee();
    await base.refus.ajouter(refus({ id: 'r3', horodatage: T0 + 2 }));
    await base.refus.ajouter(refus({ id: 'r2', horodatage: T0 + 1 }));
    await base.refus.ajouter(refus({ id: 'r1', horodatage: T0 + 1 }));
    expect((await base.refus.lister(A)).map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    await base.corrections.ajouter(corr({ ecritureId: 'e3', date: '2026-02-01' }));
    await base.corrections.ajouter(corr({ ecritureId: 'e2', date: '2026-01-01' }));
    await base.corrections.ajouter(corr({ ecritureId: 'e1', date: '2026-01-01' }));
    expect((await base.corrections.lister(A)).map((c) => c.ecritureId)).toEqual(['e1', 'e2', 'e3']);
  });

  it('entrees-invalides', async () => {
    const base = await amorcee();
    for (const societeId of ['', '   ']) {
      expect(await code(base.refus.ajouter(refus({ societeId })))).toBe('entree_invalide');
      expect(await code(base.corrections.ajouter(corr({ societeId })))).toBe('entree_invalide');
      expect(await code(base.refus.lister(societeId))).toBe('entree_invalide');
      expect(await code(base.corrections.lister(societeId))).toBe('entree_invalide');
      expect(await code(base.interrupteurs.lister(societeId))).toBe('entree_invalide');
      expect(await code(base.interrupteurs.lire(societeId, 'ia-classement'))).toBe('entree_invalide');
      expect(await code(base.amorcer({ societeId, codesInterrupteurs: [], maintenant: T0 }))).toBe('entree_invalide');
    }
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(await code(base.refus.ajouter(refus({ id: 'x', horodatage: mauvais })))).toBe('entree_invalide');
      expect(await code(base.amorcer({ societeId: B, codesInterrupteurs: ['k'], maintenant: mauvais }))).toBe('entree_invalide');
      expect(await code(base.interrupteurs.enregistrer(A, { code: 'ia-classement', etat: 'pilote', depuis: mauvais }))).toBe('entree_invalide');
    }
    expect(await code(base.refus.ajouter(refus({ id: 'y', geste: 'G99' as never })))).toBe('entree_invalide');
    expect(await code(base.refus.ajouter(refus({ id: ' ' })))).toBe('entree_invalide');
    await base.refus.ajouter(refus({ id: 'z', geste: null }));
    expect(await base.refus.lister(A)).toHaveLength(1);
    expect(await base.interrupteurs.lister(B)).toEqual([]);
    expect((await base.interrupteurs.lire(A, 'ia-classement'))?.etat).toBe('ferme');
  });
});
