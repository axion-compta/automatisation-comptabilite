import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import { ErreurCompte } from '../comptes.js';
import {
  ErreurPlan,
  ajouterCompte,
  apercuFusion,
  categorieVersCompte,
  desactiverCompte,
  fusionner,
  renommerCompte,
  supprimerCompte,
  type Plan,
} from '../actions.js';
const REFERENCE = ['401', '411', '512', '606', '706'];
const PLAN: Plan = [
  { numero: '401', nom: 'Fournisseurs fictifs', actif: true },
  { numero: '6064', nom: 'Petit matériel fictif', actif: true },
  { numero: '6068', nom: 'Autres achats fictifs', actif: true },
];
function ecr(id: string, comptes: readonly [string, string]): Ecriture {
  return {
    id,
    journal: 'AC',
    date: '2026-03-01',
    statut: 'valide',
    lignes: [
      { compte: comptes[0], libelle: 'Achat fictif', debit: centimes(1000), credit: centimes(0) },
      { compte: comptes[1], libelle: 'Achat fictif', debit: centimes(0), credit: centimes(1000) },
    ],
  };
}
const ECRITURES: readonly Ecriture[] = [
  ecr('e1', ['6064', '401']),
  ecr('e2', ['6064', '401']),
  ecr('e3', ['6068', '401']),
];
function codePlan(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErreurPlan ? e.code : e instanceof ErreurCompte ? e.code : 'autre';
  }
  return undefined;
}
describe('actions du plan', () => {

  it('ajout-compte-valide', () => {
    const r = ajouterCompte(PLAN, { numero: '606.5', nom: ' Fournitures fictives ' }, REFERENCE);
    expect(r.plan).toHaveLength(4);
    expect(r.plan[3]).toEqual({ numero: '6065', nom: 'Fournitures fictives', actif: true });
    expect(r.avertissements).toEqual([]);
    expect(PLAN).toHaveLength(3);
    expect(codePlan(() => ajouterCompte(PLAN, { numero: '401', nom: 'Autre' }, REFERENCE))).toBe('compte_existant');
    expect(codePlan(() => ajouterCompte(PLAN, { numero: '6065', nom: '   ' }, REFERENCE))).toBe('nom_vide');
    expect(codePlan(() => ajouterCompte(PLAN, { numero: '60', nom: 'Court' }, REFERENCE))).toBe('trop_court');
  });

  it('ajout-hors-plan-avertit', () => {
    const r = ajouterCompte(PLAN, { numero: '455', nom: 'Associés fictifs' }, REFERENCE);
    expect(r.avertissements).toEqual(['hors_plan_reference']);
    expect(r.plan.map((c) => c.numero)).toContain('455');
    const sous = ajouterCompte(PLAN, { numero: '512100', nom: 'Banque fictive' }, REFERENCE);
    expect(sous.avertissements).toEqual([]);
  });

  it('ajout-classe-8-refuse', () => {
    expect(codePlan(() => ajouterCompte(PLAN, { numero: '801', nom: 'Fictif' }, REFERENCE))).toBe('classe_8_v1');
    expect(codePlan(() => ajouterCompte(PLAN, { numero: '901', nom: 'Fictif' }, REFERENCE))).toBe('classe_inconnue');
  });

  it('renommage-garde-le-numero', () => {
    const p = renommerCompte(PLAN, '6064', { nom: 'Petit outillage fictif', nomOfficiel: 'Achats officiels' });
    expect(p[1]).toEqual({ numero: '6064', nom: 'Petit outillage fictif', nomOfficiel: 'Achats officiels', actif: true });
    const seulOfficiel = renommerCompte(PLAN, '6064', { nomOfficiel: 'Libellé officiel' });
    expect(seulOfficiel[1]?.nom).toBe('Petit matériel fictif');
    expect(p.map((c) => c.numero)).toEqual(['401', '6064', '6068']);
    expect(PLAN[1]?.nom).toBe('Petit matériel fictif');
    expect(codePlan(() => renommerCompte(PLAN, '999', { nom: 'X' }))).toBe('compte_inconnu');
    expect(codePlan(() => renommerCompte(PLAN, '6064', { nom: '  ' }))).toBe('nom_vide');
  });

  it('desactivation-plus-propose', () => {
    const p = desactiverCompte(PLAN, '6064');
    expect(p[1]?.actif).toBe(false);
    expect(p[0]?.actif).toBe(true);
    expect(PLAN[1]?.actif).toBe(true);
    expect(categorieVersCompte('petit-materiel', p, { 'petit-materiel': '6064' })).toBeUndefined();
  });

  it('suppression-compte-mouvemente-refusee', () => {
    expect(codePlan(() => supprimerCompte(PLAN, '6064', ECRITURES))).toBe('compte_mouvemente');
    expect(codePlan(() => supprimerCompte(PLAN, '6068', ECRITURES))).toBe('compte_mouvemente');
    expect(PLAN).toHaveLength(3);
  });

  it('suppression-compte-vierge-acceptee', () => {
    const plan = [...PLAN, { numero: '6065', nom: 'Vierge fictif', actif: true }];
    const p = supprimerCompte(plan, '6065', ECRITURES);
    expect(p.map((c) => c.numero)).toEqual(['401', '6064', '6068']);
    expect(codePlan(() => supprimerCompte(PLAN, '999', ECRITURES))).toBe('compte_inconnu');
  });

  it('fusion-apercu-nombre-ecritures', () => {
    const a = apercuFusion(PLAN, ECRITURES, '6064', '6068');
    expect(a).toEqual({ source: '6064', cible: '6068', nbEcritures: 2 });
    expect(apercuFusion(PLAN, [ecr('e4', ['6064', '6064'])], '6064', '6068').nbEcritures).toBe(1);
    expect(apercuFusion(PLAN, [], '6064', '6068').nbEcritures).toBe(0);
    expect(codePlan(() => apercuFusion(PLAN, ECRITURES, '6064', '6064'))).toBe('fusion_meme_compte');
    expect(codePlan(() => apercuFusion(PLAN, ECRITURES, '999', '6068'))).toBe('compte_inconnu');
    const inactif = desactiverCompte(PLAN, '6068');
    expect(codePlan(() => apercuFusion(inactif, ECRITURES, '6064', '6068'))).toBe('cible_inactive');
  });

  it('fusion-sans-confirmation-sans-effet', () => {
    const apercu = apercuFusion(PLAN, ECRITURES, '6064', '6068');
    const sans = fusionner(PLAN, ECRITURES, apercu, false);
    expect(sans.applique).toBe(false);
    expect(sans).toEqual({ applique: false, plan: PLAN, apercu, reaffectations: [] });

    const avec = fusionner(PLAN, ECRITURES, apercu, true);
    expect(avec.applique).toBe(true);
    expect(avec.plan.find((c) => c.numero === '6064')?.actif).toBe(false);
    expect(avec.plan.find((c) => c.numero === '6068')?.actif).toBe(true);
    expect(avec.reaffectations).toEqual([
      { ecritureId: 'e1', ligne: 0, de: '6064', vers: '6068' },
      { ecritureId: 'e2', ligne: 0, de: '6064', vers: '6068' },
    ]);
    expect(ECRITURES[0]?.lignes[0]?.compte).toBe('6064');
    expect(codePlan(() => fusionner(PLAN, [...ECRITURES, ecr('e9', ['6064', '401'])], apercu, true))).toBe(
      'apercu_perime',
    );
    expect(codePlan(() => fusionner(PLAN, ECRITURES.slice(1), apercu, true))).toBe('apercu_perime');
  });

  it('correspondance-categorie-compte', () => {
    const table = { 'petit-materiel': '6064', fantome: '999', autres: '6068' };
    expect(categorieVersCompte('petit-materiel', PLAN, table)).toBe('6064');
    expect(categorieVersCompte('inconnue', PLAN, table)).toBeUndefined();
    expect(categorieVersCompte('fantome', PLAN, table)).toBeUndefined();
    expect(categorieVersCompte('autres', desactiverCompte(PLAN, '6064'), table)).toBe('6068');
    expect(categorieVersCompte('toString', PLAN, table)).toBeUndefined();
  });
});
