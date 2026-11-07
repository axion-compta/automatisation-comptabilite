import { describe, expect, it } from 'vitest';
import { annulerEtape, appliquerPlan, creerPlan, etatDuPlan } from '../plan-etapes.js';
import { creerProposition, type Proposition } from '../proposition.js';
import { ErreurChat } from '../types.js';

const T0 = '2030-01-01T00:00:00.000Z';
const MAX = 5;
const prop = (id: string, dureeMs = 60_000): Proposition =>
  creerProposition({ id, outil: 'proposer_validation', niveau: 'B', cibles: [`cible_${id}`], avant: 0, apres: 1, creeLe: T0, dureeMs });
const trois = () => [prop('p1'), prop('p2'), prop('p3')];
const ctx = (o: Partial<Parameters<typeof appliquerPlan>[1]> = {}) => ({
  acteur: 'personne', cle: 'geste_a', maintenant: T0, niveauIOuvert: false, ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChat ? e.code : 'autre';
  }
  return undefined;
};

describe('plan par étapes', () => {
  it('rien-avant-le-geste', () => {
    const plan = creerPlan(trois(), MAX);
    expect(plan.etapes.every((p) => p.etat === 'proposee' && p.cleApplication === undefined)).toBe(true);
    expect(etatDuPlan(plan)).toEqual({ appliquees: 0, annulees: 0, restantes: 3 });
  });
  it('trois-etapes-appliquees', () => {
    const r = appliquerPlan(creerPlan(trois(), MAX), ctx());
    expect(r.appliquees).toEqual(['p1', 'p2', 'p3']);
    expect(r.arretee).toBeUndefined();
    expect(r.plan.etapes.map((p) => p.cleApplication)).toEqual(['geste_a:1', 'geste_a:2', 'geste_a:3']);
    expect(etatDuPlan(r.plan)).toEqual({ appliquees: 3, annulees: 0, restantes: 0 });
  });
  it('etape-deux-annulee-seule', () => {
    const applique = appliquerPlan(creerPlan(trois(), MAX), ctx()).plan;
    const plan = annulerEtape(applique, 2);
    expect(plan.etapes.map((p) => p.etat)).toEqual(['appliquee', 'annulee', 'appliquee']);
    expect(etatDuPlan(plan)).toEqual({ appliquees: 2, annulees: 1, restantes: 0 });
    expect(applique.etapes[1]?.etat).toBe('appliquee');
    expect(code(() => annulerEtape(plan, 2))).toBe('proposition_inconnue');
    for (const rang of [0, 4, 1.5, Number.NaN]) expect(code(() => annulerEtape(plan, rang))).toBe('parametre_invalide');
  });
  it('erreur-arrete-la-suite', () => {
    const plan = creerPlan([prop('p1'), prop('p2', 1), prop('p3')], MAX);
    const r = appliquerPlan(plan, ctx({ maintenant: '2030-01-01T00:00:00.001Z' }));
    expect(r.appliquees).toEqual(['p1']);
    expect(r.arretee).toEqual({ rang: 2, code: 'proposition_expiree' });
    expect(r.plan.etapes.map((p) => p.etat)).toEqual(['appliquee', 'proposee', 'proposee']);
    expect(appliquerPlan(plan, ctx({ acteur: 'modele' })).arretee).toEqual({ rang: 1, code: 'acteur_non_humain' });
  });
  it('rejeu-sans-double-effet', () => {
    const premier = appliquerPlan(creerPlan(trois(), MAX), ctx());
    const rejeu = appliquerPlan(premier.plan, ctx());
    expect(rejeu.appliquees).toEqual([]);
    expect(rejeu.arretee).toBeUndefined();
    expect(rejeu.plan).toEqual(premier.plan);
    expect(appliquerPlan(premier.plan, ctx({ cle: 'geste_b' })).arretee).toEqual({ rang: 1, code: 'parametre_invalide' });
    const sans2 = appliquerPlan(annulerEtape(premier.plan, 2), ctx());
    expect(sans2.appliquees).toEqual([]);
  });
  it('plan-vide-refuse', () => {
    expect(code(() => creerPlan([], MAX))).toBe('parametre_invalide');
  });
  it('plan-trop-long-refuse', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => prop(i));
    expect(code(() => creerPlan(six, MAX))).toBe('parametre_invalide');
    expect(creerPlan(six.slice(0, MAX), MAX).etapes).toHaveLength(MAX);
    for (const max of [0, Number.NaN, 1.5, -1, Number.POSITIVE_INFINITY]) {
      expect(code(() => creerPlan([prop('a')], max))).toBe('parametre_invalide');
    }
  });
  it('proposition-en-double-refusee', () => {
    expect(code(() => creerPlan([prop('a'), prop('b'), prop('a')], MAX))).toBe('parametre_invalide');
  });
});
