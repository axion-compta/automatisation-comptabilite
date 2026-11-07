import { describe, expect, it } from 'vitest';
import { parametreAuJour } from '../au-jour.js';
import { ErreurCorrectif, appliquerPaquet, rapportImpact, type PaquetCorrectif } from '../correctif.js';
import type { ParametreSource } from '../source.js';

const URL_OFF = 'https://www.legifrance.gouv.fr/exemple-fictif';
function ligne(sur: Partial<ParametreSource> = {}): ParametreSource {
  return {
    cle: 'fictif.seuil_a',
    pays: 'XX',
    valeur: 'v-fausse',
    effet_debut: '2026-01-01',
    effet_fin: null,
    statut: 'valide',
    source: 'source fictive',
    date_releve: '2026-01-02',
    source_url: URL_OFF,
    source_titre: 'Texte fictif',
    source_maj: '2026-01-01',
    ...sur,
  };
}
const corrigee = (sur: Partial<ParametreSource> = {}) =>
  ligne({ valeur: 'v-juste', statut: 'a_verifier', date_releve: '2026-03-01', source_maj: null, ...sur });
function paquet(sur: Partial<PaquetCorrectif> = {}): PaquetCorrectif {
  return {
    version: 'c-1',
    date: '2026-03-02',
    motif: 'valeur fictive erronée',
    validateur: { id: 'pers-fictive-1', type: 'personne' },
    retraits: [{ cle: 'fictif.seuil_a', effet_debut: '2026-01-01' }],
    ajouts: [corrigee()],
    ...sur,
  };
}
const autre = ligne({ cle: 'fictif.autre', valeur: 'x' });
const entree = (): ParametreSource[] => [ligne(), autre];
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurCorrectif ? e.code : 'autre';
  }
  return undefined;
};

describe('paquet correctif', () => {
  it('ligne-retiree-jamais-modifiee', () => {
    const avant = ligne();
    const sortie = appliquerPaquet(entree(), paquet(), []);
    const retiree = sortie[0]!;
    expect(retiree.statut).toBe('retire');
    for (const k of Object.keys(avant) as (keyof ParametreSource)[]) {
      if (k !== 'statut') expect(retiree[k]).toEqual(avant[k]);
    }
    expect(Object.keys(retiree).sort()).toEqual(Object.keys(avant).sort());
    expect(sortie[1]).toEqual(autre);
  });

  it('ligne-corrigee-ajoutee', () => {
    const sortie = appliquerPaquet(entree(), paquet(), []);
    expect(sortie).toHaveLength(3);
    expect(sortie[2]).toEqual(corrigee());
    expect(sortie[2]!.source_url).toBe(URL_OFF);
  });

  it('lecture-apres-paquet', () => {
    const sortie = appliquerPaquet(entree(), paquet({ retraits: [{ cle: 'fictif.seuil_a', effet_debut: '2026-01-01' }], ajouts: [corrigee({ effet_debut: '2026-01-01' })] }), []);
    const lire = (j: string) => parametreAuJour(sortie, 'fictif.seuil_a', 'XX', j).valeur;
    expect(() => lire('2025-12-31')).toThrow(/parametre_absent/);
    expect(lire('2026-01-01')).toBe('v-juste');
    expect(lire('2026-01-02')).toBe('v-juste');
  });

  it('retrait-sans-remplacement-refuse', () => {
    expect(code(() => appliquerPaquet(entree(), paquet({ ajouts: [] }), []))).toBe('retrait_sans_remplacement');
    expect(code(() => appliquerPaquet(entree(), paquet({ ajouts: [corrigee({ effet_debut: '2026-02-01' })] }), []))).toBe('retrait_sans_remplacement');
    expect(code(() => appliquerPaquet(entree(), paquet({ retraits: [{ cle: 'inconnue', effet_debut: '2026-01-01' }] }), []))).toBe('ligne_introuvable');
  });

  it('validateur-absent-refuse', () => {
    const sans = { ...paquet(), validateur: undefined } as unknown as PaquetCorrectif;
    expect(code(() => appliquerPaquet(entree(), sans, []))).toBe('validateur_absent');
    for (const v of [{ id: '', type: 'personne' }, { id: 'a', type: 'robot' }]) {
      const p = { ...paquet(), validateur: v } as unknown as PaquetCorrectif;
      expect(code(() => appliquerPaquet(entree(), p, []))).toBe('validateur_absent');
    }
    expect(code(() => appliquerPaquet(entree(), paquet({ motif: ' ' }), []))).toBe('motif_vide');
  });

  it('version-deja-appliquee', () => {
    expect(code(() => appliquerPaquet(entree(), paquet(), ['c-0', 'c-1']))).toBe('version_deja_appliquee');
    expect(code(() => appliquerPaquet(entree(), paquet(), ['c-0']))).toBeUndefined();
  });

  const apres = () => appliquerPaquet(entree(), paquet(), []);
  const objets = {
    A: [
      { type: 'brouillon', date: '2026-02-10' },
      { type: 'brouillon', date: '2025-12-10' },
      { type: 'declaration_non_deposee', date: '2026-02-15', periode: '2026-02' },
      { type: 'ecriture_validee', date: '2026-01-01' },
    ],
    B: [{ type: 'brouillon', date: '2026-05-01' }],
  } as const;

  it('rapport-par-societe', () => {
    const r = rapportImpact(entree(), apres(), [
      { id: 'A', objets: [...objets.A] },
      { id: 'B', objets: [...objets.B] },
      { id: 'C', objets: [] },
    ]);
    expect(r.A).toMatchObject({ brouillons: 1, declarationsNonDeposees: ['2026-02'], ecrituresValideesTouchees: 1, carte: true });
    expect(r.B).toMatchObject({ brouillons: 1, declarationsNonDeposees: [], ecrituresValideesTouchees: 0, periodesDeposeesTouchees: [] });
    expect(r.C).toEqual({ brouillons: 0, declarationsNonDeposees: [], ecrituresValideesTouchees: 0, periodesDeposeesTouchees: [], regularisationProposee: false, carte: false });
    expect(JSON.stringify(r.B)).not.toContain('2026-02');
  });

  it('deposees-regularisation-proposee', () => {
    const o = [{ type: 'periode_deposee' as const, date: '2026-01-31', periode: '2026-01' }];
    const copie = JSON.stringify(o);
    const r = rapportImpact(entree(), apres(), [{ id: 'A', objets: o }, { id: 'B', objets: [{ type: 'periode_deposee', date: '2025-12-31', periode: '2025-12' }] }]);
    expect(r.A).toMatchObject({ periodesDeposeesTouchees: ['2026-01'], regularisationProposee: true, carte: true });
    expect(r.B).toMatchObject({ periodesDeposeesTouchees: [], regularisationProposee: false, carte: false });
    expect(JSON.stringify(o)).toBe(copie);
  });

  it('catalogue-d-entree-non-modifie', () => {
    const e = entree();
    const copie = JSON.stringify(e);
    const sortie = appliquerPaquet(e, paquet(), []);
    expect(JSON.stringify(e)).toBe(copie);
    expect(sortie).not.toBe(e);
    expect(sortie[0]).not.toBe(e[0]);
    expect(sortie[1]).not.toBe(e[1]);
  });
});
