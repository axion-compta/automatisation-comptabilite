import { describe, expect, it } from 'vitest';
import { BARRE_MOBILE, MENU_BUREAU, MENU_PLUS } from '../menu.js';
import { ecransDecouverts, type DefinitionEcran } from '../ecrans.js';
import { ecransAuDela, planNavigation } from '../plan-navigation.js';

const ecran = (id: string, chemin: string): DefinitionEcran => ({ id, chemin, composant: () => null, groupe: 'autre', titre: id });
const dist = (ecrans: DefinitionEcran[], chemin: string) => planNavigation(ecrans).noeuds.find((n) => n.chemin === chemin)?.distance;

describe('plan de navigation', () => {
  it('chaque-ecran-a-deux-clics-au-plus', () => {
    const ecrans = [ecran('liste', '/documents'), ecran('detail', '/documents/piece'), ecran('profond', '/documents/piece/lignes'), ecran('plus', '/reglages/donnees')];
    const plan = planNavigation(ecrans);
    expect(dist(ecrans, '/documents')).toBe(1);
    expect(dist(ecrans, '/documents/piece')).toBe(2);
    expect(dist(ecrans, '/reglages')).toBe(2);
    expect(dist(ecrans, '/reglages/donnees')).toBe(3);
    // Frontière : à 2 clics au plus, seuls les écrans à 3 clics ou plus sont signalés.
    expect(ecransAuDela(plan, 2).map((n) => n.chemin).sort()).toEqual(['/documents/piece/lignes', '/reglages/donnees']);
    expect(ecransAuDela(plan, 3).map((n) => n.chemin)).toEqual([]);
    expect(ecransAuDela(plan, 0).length).toBe(plan.noeuds.filter((n) => n.distance !== null && n.distance > 0).length);
  });
  it('ecran-hors-menu-signale', () => {
    const ecrans = [ecran('perdu', '/perdu'), ecran('piege', '/documentsx'), ecran('faux-detail', '/documentsx/piece')];
    const plan = planNavigation(ecrans);
    expect(plan.horsMenu).toEqual(['perdu', 'piege', 'faux-detail']);
    expect(dist(ecrans, '/perdu')).toBeNull();
    // Un écran sans chemin d'accès n'est jamais rendu comme « au-delà » : il est signalé à part.
    expect(ecransAuDela(plan, 0).map((n) => n.id)).not.toContain('perdu');
  });
  it('plan-calcule-depuis-les-ecrans-decouverts', () => {
    const decouverts = ecransDecouverts();
    const plan = planNavigation(decouverts);
    const parChemin = new Map(plan.noeuds.map((n) => [n.chemin, n]));
    for (const e of decouverts) expect(plan.noeuds.some((n) => n.id === e.id && n.chemin === e.chemin)).toBe(true);
    for (const m of [...MENU_BUREAU, ...BARRE_MOBILE, ...MENU_PLUS]) expect(parChemin.get(m.chemin)?.distance).toBeGreaterThanOrEqual(1);
    expect(parChemin.get('/')?.distance).toBe(0);
    expect(parChemin.get('/discussion')?.distance).toBe(1);
    // Barre du bas et menu de bureau : 1 clic ; panneau « Plus » : 2 clics.
    for (const m of BARRE_MOBILE) expect(parChemin.get(m.chemin)?.distance).toBe(1);
    for (const m of MENU_BUREAU) expect(parChemin.get(m.chemin)?.distance).toBe(1);
    for (const m of MENU_PLUS) expect(parChemin.get(m.chemin)?.distance).toBe(BARRE_MOBILE.some((b) => b.id === m.id) || MENU_BUREAU.some((b) => b.id === m.id) ? 1 : 2);
    expect(plan.horsMenu.every((id) => decouverts.some((e) => e.id === id))).toBe(true);
  });
  it('detail-atteint-par-sa-liste', () => {
    const ecrans = [ecran('liste', '/factures/ventes'), ecran('detail', '/factures/ventes/fiche')];
    const plan = planNavigation(ecrans);
    const detail = plan.noeuds.find((n) => n.id === 'detail');
    expect(detail?.parent).toBe('/factures/ventes');
    // La liste est elle-même atteinte par l'entrée « Factures » (1 clic) : liste 2, détail 3.
    expect(dist(ecrans, '/factures/ventes')).toBe(2);
    expect(detail?.distance).toBe(3);
    // Un détail d'un écran de menu direct : parent = l'entrée de menu.
    expect(planNavigation([ecran('d', '/mois/detail')]).noeuds.find((n) => n.id === 'd')?.parent).toBe('/mois');
  });
});
