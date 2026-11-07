import { describe, expect, it } from 'vitest';
import { genererCompta } from '../../../donnees-fictives/src/compta.js';
import { creerServicePlan } from '../domaines/plan-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';
import { contrat } from '../routes.js';

const pleine = genererCompta().societes.find((s) => s.profil === 'pleine')!;

/** Solde recalculé à part, sur l'année civile de l'exercice. */
const soldeAttendu = (compte: string, annee: string): number =>
  pleine.ecritures
    .filter((e) => e.statut === 'validee' && e.date.startsWith(annee))
    .flatMap((e) => e.lignes)
    .filter((l) => l.compte === compte)
    .reduce((t, l) => t + l.debitCentimes - l.creditCentimes, 0);

describe('plan comptable en mémoire', () => {
  it('exercices-enveloppe-et-tri', () => {
    const r = creerServicePlan().exercices();
    expect(r.decalage).toBe(0);
    expect(r.total).toBe(2);
    expect(r.body.map((e) => e.id)).toEqual(['EX2026', 'EX2025']);
    expect(r.body[0]).toEqual({ id: 'EX2026', libelle: 'Exercice 2026', debut: '2026-01-01', fin: '2026-12-31', statut: 'ouvert' });
  });

  it('plan-filtre-classe', () => {
    const s = creerServicePlan();
    const tout = s.plan('EX2026')!;
    expect(tout.total).toBe(pleine.plan.length);
    const c6 = s.plan('EX2026', { classe: 6 })!;
    expect(c6.total).toBe(pleine.plan.filter((c) => c.classe === 6).length);
    expect(c6.total).toBeGreaterThan(0);
    expect(c6.body.every((c) => c.classe === 6)).toBe(true);
    expect(s.plan('EX2026', { classe: 5 })!.body.map((c) => c.numero)).toEqual(['512000', '530000']);
    // solde = débits - crédits des écritures validées de l'exercice seulement
    for (const annee of ['2025', '2026']) {
      for (const compte of ['411000', '706000', '512000', '606000', '401000', '613000', '530000']) {
        const ligne = s.plan('EX' + annee, { q: compte })!.body[0]!;
        expect(ligne.soldeCentimes).toBe(soldeAttendu(compte, annee));
      }
    }
    expect(soldeAttendu('606000', '2025')).toBe(0);
    expect(soldeAttendu('606000', '2026')).not.toBe(0);
    expect(soldeAttendu('706000', '2025')).toBeLessThan(0);
    // pagination : total reste celui du filtre
    const page = s.plan('EX2026', { limite: 3, decalage: 2 })!;
    expect(page.body.map((c) => c.numero)).toEqual(tout.body.slice(2, 5).map((c) => c.numero));
    expect(page.decalage).toBe(2);
    expect(page.total).toBe(tout.total);
  });

  it('plan-recherche-sans-accent', () => {
    const s = creerServicePlan();
    expect(s.plan('EX2026', { q: 'RESERVES' })!.body.map((c) => c.numero)).toEqual(['106000']);
    expect(s.plan('EX2026', { q: 'résultat' })!.body.map((c) => c.numero)).toEqual(['120000']);
    expect(s.plan('EX2026', { q: '4457' })!.body.map((c) => c.numero)).toEqual(['445710']);
    expect(s.plan('EX2026', { q: 'tva', classe: 4 })!.total).toBe(2);
    expect(s.plan('EX2026', { q: 'introuvable-xyz' })!.total).toBe(0);
  });

  it('exercice-inconnu-404', () => {
    expect(creerServicePlan().plan('EX1999')).toBeUndefined();
    const erreurs = (contrat.plan.listerPlan as unknown as { '~orpc': { errorMap: Record<string, { status: number }> } })['~orpc'].errorMap;
    expect(erreurs['EXERCICE_INCONNU']?.status).toBe(404);
  });

  it('openapi-contient-les-routes-du-plan', () => {
    const paths = (genererOpenapi() as { paths: Record<string, Record<string, { operationId: string; parameters: Array<{ name: string; in: string }>; responses: Record<string, unknown> }>> }).paths;
    expect(paths['/exercices']?.['get']?.operationId).toBe('listerExercices');
    const plan = paths['/exercices/{exercice}/plan']?.['get'];
    expect(plan?.operationId).toBe('listerPlan');
    expect(plan?.parameters.map((p) => `${p.in}:${p.name}`).sort()).toEqual(['path:exercice', 'query:classe', 'query:decalage', 'query:limite', 'query:q']);
    expect(Object.keys(plan?.responses ?? {})).toContain('404');
    expect(paths['/ecritures']).toBeDefined();
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
