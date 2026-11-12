import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, StatutEcriture } from '../../ecritures/modele.js';
import { calculerFlux, ErreurFlux, type DefinitionsFlux } from '../flux.js';
import { ErreurPeriode, type ExerciceBorne } from '../periodes.js';

const DEF: DefinitionsFlux = {
  recettes: { prefixes: ['7'] },
  depenses: { prefixes: ['6'] },
  categories: [
    { nom: 'achats', prefixes: ['60'] },
    { nom: 'locaux', prefixes: ['61'] },
    { nom: 'personnel', prefixes: ['64'] },
  ],
  ca: { prefixes: ['70'], deduire: ['709'] },
  achatsConsommes: { prefixes: ['607'] },
};
const E2026: ExerciceBorne = { id: 'e2026', debut: '2026-01-01', fin: '2026-12-31' };
const E2025: ExerciceBorne = { id: 'e2025', debut: '2025-01-01', fin: '2025-12-31' };
const JOUR = '2026-03-15';

const ecr = (id: string, date: string, d: string, c: string, montant: number, statut: StatutEcriture = 'valide'): Ecriture => ({
  id, date, statut, journal: 'OD',
  lignes: [{ compte: d, libelle: 'x', debit: centimes(montant), credit: centimes(0) }, { compte: c, libelle: 'x', debit: centimes(0), credit: centimes(montant) }],
});
const ECRITURES: Ecriture[] = [
  ecr('v1', '2026-01-10', '512', '706', 100000), ecr('v2', '2026-03-05', '512', '707', 50000), ecr('v3', '2026-02-03', '512', '706', 33),
  ecr('a1', '2026-01-12', '607', '401', 30000), ecr('l1', '2026-03-02', '613', '512', 20000), ecr('o1', '2026-02-01', '658', '512', 1234),
  ecr('r1', '2026-03-04', '709', '512', 5000), ecr('s1', '2026-03-20', '641', '512', 99999),
  ecr('b1', '2026-03-03', '512', '706', 77777, 'brouillon'), ecr('p1', '2026-03-03', '512', '706', 66666, 'propose'),
  ecr('h1', '2025-03-05', '512', '706', 40000), ecr('h2', '2025-03-20', '512', '706', 10000), ecr('h3', '2025-02-01', '613', '512', 700),
];
const calculer = (ecritures = ECRITURES, def = DEF, precedent: ExerciceBorne | null = E2025, jour = JOUR) =>
  calculerFlux(ecritures, { jour, exercice: E2026, ...(precedent === null ? {} : { precedent }) }, def);
const codeErreur = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurFlux || e instanceof ErreurPeriode ? e.code : 'autre'; }
};

describe('flux du tableau de bord', () => {
  it('totaux-egaux-soldes-classes-6-7-au-centime', () => {
    const r = calculer().exerciceADate;
    const lignes = ECRITURES.filter((e) => e.statut === 'valide' && e.date >= '2026-01-01' && e.date <= JOUR).flatMap((e) => e.lignes);
    const net = (classe: string, sens: 1 | -1) => lignes.filter((l) => l.compte.startsWith(classe)).reduce((t, l) => t + sens * (l.credit - l.debit), 0);
    const [produits, charges] = [net('7', 1), net('6', -1)];
    expect(r.recettes).toBe(145033);
    expect(r.depenses).toBe(51234);
    expect(r.recettes).toBe(produits);
    expect(r.depenses).toBe(charges);
    expect(calculer([]).exerciceADate.recettes).toBe(0);
  });
  it('mois-et-exercice-a-date', () => {
    const r = calculer();
    expect(r.mois).toMatchObject({ periode: { debut: '2026-03-01', fin: JOUR }, recettes: 45000, depenses: 20000 });
    expect(r.exerciceADate.periode).toEqual({ debut: '2026-01-01', fin: JOUR });
    const bord = [ecr('j1', JOUR, '512', '706', 700), ecr('j2', '2026-03-16', '512', '706', 900), ecr('j3', '2026-03-01', '512', '706', 300)];
    expect(calculer(bord).mois.recettes).toBe(1000);
    expect(calculer(bord, DEF, null, '2026-12-31').exerciceADate.recettes).toBe(1900);
  });
  it('comparaison-meme-nombre-de-mois', () => {
    const r = calculer();
    expect(r.comparaison.mois).toEqual({ periode: { debut: '2025-03-01', fin: '2025-03-15' }, recettes: 40000, depenses: 0, resultat: 40000 });
    expect(r.comparaison.exerciceADate).toEqual({ periode: { debut: '2025-01-01', fin: '2025-03-15' }, recettes: 40000, depenses: 700, resultat: 39300 });
    expect(calculer(ECRITURES, DEF, null).comparaison).toEqual({ mois: { vide: 'pas_d_exercice_precedent' }, exerciceADate: { vide: 'pas_d_exercice_precedent' } });
    const court: ExerciceBorne = { id: 'c', debut: '2025-01-01', fin: '2025-02-10' };
    expect(calculer(ECRITURES, DEF, court).comparaison.mois).toEqual({ vide: 'precedent_trop_court' });
    const coupe: ExerciceBorne = { id: 'd', debut: '2025-01-01', fin: '2025-03-10' };
    expect(calculer(ECRITURES, DEF, coupe).comparaison.mois).toEqual({ periode: { debut: '2025-03-01', fin: '2025-03-10' }, recettes: 40000, depenses: 0, resultat: 40000, tronquee: true });
    expect(r.comparaison.mois).not.toHaveProperty('tronquee');
  });
  it('categories-somme-egale-depenses', () => {
    const { categories, exerciceADate } = calculer();
    expect(categories).toEqual([{ nom: 'achats', montant: 30000 }, { nom: 'locaux', montant: 20000 }, { nom: 'personnel', montant: 0 }, { nom: 'non_classe', montant: 1234 }]);
    expect(categories.reduce((s, c) => s + c.montant, 0)).toBe(exerciceADate.depenses);
    const sans = calculer(ECRITURES.filter((e) => e.id !== 'o1'));
    expect(sans.categories.map((c) => c.nom)).toEqual(['achats', 'locaux', 'personnel']);
    const double = calculer(ECRITURES, { ...DEF, categories: [{ nom: 'tout', prefixes: ['6'] }, { nom: 'achats', prefixes: ['60'] }] });
    expect(double.categories).toEqual([{ nom: 'tout', montant: 51234 }, { nom: 'achats', montant: 0 }]);
  });
  it('resultat-produits-moins-charges-a-date', () => {
    const r = calculer();
    expect(r.exerciceADate.resultat).toBe(145033 - 51234);
    expect(r.mois.resultat).toBe(25000);
    const perte = calculer([ecr('x', '2026-01-05', '613', '512', 500)]);
    expect(perte.exerciceADate.resultat).toBe(-500);
    expect(calculer(ECRITURES, DEF, E2025, '2026-03-31').exerciceADate.resultat).toBe(145033 - 51234 - 99999);
  });
  it('marge', () => {
    const r = calculer();
    expect(r.exerciceADate).toMatchObject({ ca: 145033, achatsConsommes: 30000, marge: 115033 });
    expect(r.mois.ca).toBe(45000);
    expect(r.mois.marge).toBe(45000);
    expect(calculer([ecr('z', '2026-01-05', '607', '401', 800)]).exerciceADate.marge).toBe(-800);
  });

  it.each([
    { recettes: { prefixes: [] } }, { depenses: { prefixes: [''] } }, { ca: { prefixes: [], deduire: [] } }, { ca: { prefixes: ['70'], deduire: [''] } },
    { achatsConsommes: { prefixes: [''] } }, { categories: [{ nom: 'a', prefixes: [] }] }, { categories: [{ nom: '', prefixes: ['60'] }] },
    { categories: [{ nom: 'non_classe', prefixes: ['60'] }] },
    { categories: [{ nom: 'a', prefixes: ['60'] }, { nom: 'a', prefixes: ['61'] }] },
  ] as Partial<DefinitionsFlux>[])('refuse la définition %j', (d) => {
    expect(codeErreur(() => calculer(ECRITURES, { ...DEF, ...d }))).toBe('definitions_invalides');
  });
  it('accepte une liste deduire vide', () => { expect(calculer(ECRITURES, { ...DEF, ca: { prefixes: ['70'], deduire: [] } }).exerciceADate.ca).toBe(145033); });
  it('refuse les dates invalides', () => {
    expect(codeErreur(() => calculer(ECRITURES, DEF, E2025, '2027-01-01'))).toBe('jour_hors_exercice');
    expect(codeErreur(() => calculer(ECRITURES, DEF, E2025, 'pas-une-date'))).toBe('date_invalide');
  });
});
