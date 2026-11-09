import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { ErreurDepotProfil, creerDepotProfilMemoire, type ContexteSociete } from '../depot-profil.js';

const A: ContexteSociete = { societeId: 'societe-a' };
const B: ContexteSociete = { societeId: 'societe-b' };
let n = 0;
const depots = () => creerDepotProfilMemoire({ nouvelId: () => `id-${++n}` });
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return (e as { code?: string }).code; } return undefined; };
const champ = (cle = 'denomination', effetDebut = '2026-01-01') => ({ cle, valeur: 'Atelier Fictif', origine: 'saisie_personne', confiance: 'sur', effetDebut }) as const;
const imposition = (effetDebut: string, effetFin: string | null = null, statut: 'propose' | 'confirme' = 'propose') =>
  ({ effetDebut, effetFin, impot: 'IS', categorie: 'BIC', regime: 'reel_simplifie', motif: 'creation', statut }) as const;
const taille = (o: Record<string, number | null> = {}) => ({ totalBilanCentimes: 1000 as Centimes, caNetCentimes: 2000 as Centimes, effectifMoyen: 3, source: 'estimation', ...o }) as never;
const REF = { cle: 'denomination', effetDebut: '2026-01-01' };
const PERSONNE = { type: 'personne', id: 'personne-1' } as const;
const lecture = (o: Record<string, unknown> = {}) => ({
  parametreCle: 'cle-fictive', lecteur: { id: 'lecteur-1', modele: 'modele-fictif', version: '1' },
  sourceUrl: 'https://www.legifrance.gouv.fr/exemple', extrait: 'extrait fictif', valeurLue: 'x',
  luLe: '2026-02-01', complete: true, conclusion: 'concorde', ...o,
});

describe('depot-profil', () => {
  it('ajout-seul-modifier-refuse', () => {
    const d = depots();
    d.champs.ajouter(A, champ(), '2026-01-02');
    d.lectures.ajouter(A, lecture());
    for (const depot of [d.champs, d.lectures]) expect(code(() => depot.modifier(A, 'x'))).toBe('ajout_seul');
    expect(d.champs.lire(A, 'denomination', '2026-06-01')?.valeur).toBe('Atelier Fictif');
    expect(d.lectures.lister(A, 'cle-fictive')[0]?.valeurLue).toBe('x');
  });

  it('ajout-seul-supprimer-refuse', () => {
    const d = depots();
    d.champs.ajouter(A, champ(), '2026-01-02');
    d.lectures.ajouter(A, lecture());
    for (const depot of [d.champs, d.lectures]) expect(code(() => depot.supprimer(A, 'x'))).toBe('ajout_seul');
    expect(d.champs.lister(A)).toHaveLength(1);
    expect(d.lectures.lister(A, 'cle-fictive')).toHaveLength(1);
    expect(code(() => d.lectures.ajouter(A, lecture()))).toBe('lecture_en_double');
  });

  it('chevauchement-refuse', () => {
    const d = depots();
    d.imposition.ajouter(A, imposition('2026-01-01', '2026-07-01'));
    for (const debut of ['2026-03-01', '2025-12-01']) expect(code(() => d.imposition.ajouter(A, imposition(debut)))).toBe('chevauchement');
    expect(code(() => d.imposition.ajouter(A, imposition('2026-07-01', '2026-01-01')))).toBe('ordre_inverse');
    expect(d.imposition.lister(A)).toHaveLength(1);
    d.imposition.ajouter(A, imposition('2026-07-01'));
    expect(d.imposition.lister(A)).toHaveLength(2);
    expect(d.imposition.auJour(A, '2026-08-01')?.effetDebut).toBe('2026-07-01');
    expect(d.imposition.auJour(A, '2026-02-01')?.effetFin).toBe('2026-07-01');
    d.imposition.ajouter(B, imposition('2026-03-01'));
  });

  it('confirme-sans-personne-refuse', () => {
    const d = depots();
    d.champs.ajouter(A, champ(), '2026-01-02');
    for (const c of [{ type: 'agent', id: 'agent-1' }, { type: 'personne', id: '  ' }] as const) {
      expect(code(() => d.champs.confirmer(A, REF, c, '2026-01-03T10:00:00Z'))).toBe('confirme_sans_personne');
    }
    expect(code(() => d.champs.ajouter(A, { ...champ('autre'), statut: 'confirme' }, '2026-01-02'))).toBe('confirmation_par_agent');
    expect(code(() => d.imposition.ajouter(A, imposition('2026-01-01', null, 'confirme')))).toBe('confirme_sans_personne');
    expect(d.champs.lire(A, 'denomination', '2026-06-01')?.statut).toBe('a_confirmer');
    d.champs.confirmer(A, REF, PERSONNE, '2026-01-03T10:00:00Z');
    expect(d.champs.lire(A, 'denomination', '2026-06-01')).toMatchObject({ statut: 'confirme', confirmePar: 'personne-1' });
    d.imposition.ajouter(A, imposition('2026-01-01', null, 'confirme'), 'personne-1');
  });

  it('centimes-entiers', () => {
    const d = depots();
    for (const v of [Number.NaN, Infinity, -Infinity, 1.5, -1]) {
      for (const champTaille of ['caNetCentimes', 'totalBilanCentimes']) expect(code(() => d.taille.enregistrer(A, 'ex-1', taille({ [champTaille]: v })))).toBe('centimes_invalides');
    }
    expect(code(() => d.taille.enregistrer(A, 'ex-1', taille({ effectifMoyen: 2.5 })))).toBe('centimes_invalides');
    expect(d.taille.lire(A, 'ex-1')).toBeUndefined();
    const id = d.taille.enregistrer(A, 'ex-1', taille({ caNetCentimes: null }));
    expect(d.taille.enregistrer(A, 'ex-1', taille())).toBe(id);
    expect(d.taille.lire(A, 'ex-1')?.caNetCentimes).toBe(2000);
  });

  it('societe-voisine-invisible', () => {
    const d = depots();
    d.champs.ajouter(A, { ...champ(), societeId: 'societe-b' } as never, '2026-01-02');
    d.imposition.ajouter(A, { ...imposition('2026-01-01'), societeId: 'societe-b' } as never);
    d.taille.enregistrer(A, 'ex-1', taille());
    d.associes.remplacer(A, [{ id: 'p1', nature: 'physique', roles: ['gerant'], partPdb: 10000 }]);
    d.lectures.ajouter(A, lecture());
    expect(d.champs.lister(B)).toEqual([]);    expect([d.champs.lire(B, 'denomination', '2026-06-01'), d.imposition.auJour(B, '2026-06-01')]).toEqual([null, null]);
    expect([d.imposition.lister(B), d.associes.lister(B), d.lectures.lister(B, 'cle-fictive')]).toEqual([[], [], []]);
    expect(d.taille.lire(B, 'ex-1')).toBeUndefined();
    expect(d.champs.lister(A)[0]?.societeId).toBe('societe-a');
    expect(code(() => d.champs.lister({ societeId: ' ' }))).toBe('societe_invalide');
    expect(code(() => d.associes.remplacer(A, [{ id: 'p1', nature: 'physique', roles: [], partPdb: 5 }]))).toBe('repartition_invalide');
  });

  it('lecture-a-une-date', () => {
    const d = depots();
    d.champs.ajouter(A, { ...champ(), valeur: 'v1' }, '2026-01-02');
    d.champs.ajouter(A, { ...champ('denomination', '2026-06-01'), valeur: 'v2' }, '2026-06-02');
    expect(d.champs.lire(A, 'denomination', '2025-12-31')).toBeNull();
    expect(d.champs.lire(A, 'denomination', '2026-05-31')?.valeur).toBe('v1');
    expect(d.champs.lire(A, 'denomination', '2026-06-01')?.valeur).toBe('v2');
    expect(code(() => d.champs.lire(A, 'denomination', '2026-13-01'))).toBe('date_invalide');
    expect(d.champs.lister(A)).toHaveLength(2);
  });

  it('copie-non-modifiable', () => {
    const d = depots();
    const entree = { ...champ(), valeur: { nom: 'Atelier Fictif' } };
    d.champs.ajouter(A, entree, '2026-01-02');
    entree.valeur.nom = 'change';
    const lu = d.champs.lire(A, 'denomination', '2026-06-01');
    expect(lu?.valeur).toEqual({ nom: 'Atelier Fictif' });
    expect(() => { (lu as { statut: string }).statut = 'confirme'; }).toThrow(TypeError);
    (lu?.valeur as { nom: string }).nom = 'autre';
    expect(d.champs.lire(A, 'denomination', '2026-06-01')?.valeur).toEqual({ nom: 'Atelier Fictif' });
    const liste = d.champs.lister(A);
    expect(() => { (liste as unknown[]).push(1); }).toThrow(TypeError);
  });
});
