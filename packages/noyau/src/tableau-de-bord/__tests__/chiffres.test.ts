import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, StatutEcriture } from '../../ecritures/modele.js';
import { calculerChiffres, chiffreAffaires, ErreurChiffres, resultatProvisoire, tresorerie, type DefinitionsIndicateurs } from '../chiffres.js';

const DEF: DefinitionsIndicateurs = {
  ca: { prefixes: ['91'], deduire: ['919'] },
  charges: { prefixes: ['92'], exclure: ['929'] },
  produits: { prefixes: ['91', '93'] },
  tresorerie: { prefixes: ['94'] },
};
const P = { debut: '2026-01-01', fin: '2026-12-31' };
// Écriture à deux lignes : debit sur `d`, crédit sur `c`.
const ecr = (id: string, date: string, d: string, c: string, montant: number, statut: StatutEcriture = 'valide'): Ecriture => ({
  id, date, statut, journal: 'OD',
  lignes: [
    { compte: d, libelle: 'x', debit: centimes(montant), credit: centimes(0) },
    { compte: c, libelle: 'x', debit: centimes(0), credit: centimes(montant) },
  ],
});
const codeErreur = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurChiffres ? e.code : 'autre'; }
  return undefined;
};

describe('chiffres clés du tableau de bord', () => {
  it('ca-avec-deduction', () => {
    const l = [ecr('a', '2026-02-01', '94', '911', 10000), ecr('b', '2026-02-02', '919', '94', 1500)];
    expect(chiffreAffaires(l, P, DEF)).toBe(8500);
    expect(calculerChiffres(l, P, DEF).ca).toBe(8500);
  });

  it('compte-deduit-pas-compte-deux-fois', () => {
    // 919 commence par le préfixe 91 : il n'est retiré qu'une fois, jamais ajouté en plus.
    const l = [ecr('a', '2026-02-01', '94', '911', 10000), ecr('b', '2026-02-02', '919', '94', 1000)];
    expect(chiffreAffaires(l, P, DEF)).toBe(9000);
    expect(chiffreAffaires([ecr('c', '2026-02-02', '919', '94', 1000)], P, DEF)).toBe(-1000);
  });

  it('charges-hors-exclus', () => {
    const l = [ecr('a', '2026-03-01', '921', '94', 3000), ecr('b', '2026-03-02', '929', '94', 700)];
    expect(calculerChiffres(l, P, DEF).charges).toBe(3000);
  });

  it('resultat-produits-moins-charges', () => {
    const l = [
      ecr('a', '2026-02-01', '94', '911', 10000), ecr('b', '2026-02-02', '94', '931', 500),
      ecr('c', '2026-03-01', '921', '94', 4000),
    ];
    expect(resultatProvisoire(l, P, DEF)).toBe(6500);
    expect(calculerChiffres(l, P, DEF).resultatProvisoire).toBe(6500);
  });

  it('tresorerie-solde-a-la-fin', () => {
    const l = [
      ecr('a', '2025-12-31', '94', '911', 5000), ecr('b', '2026-06-01', '94', '911', 2000),
      ecr('c', '2026-07-01', '921', '94', 800), ecr('d', '2027-01-01', '94', '911', 9999),
    ];
    expect(tresorerie(l, '2026-12-31', DEF)).toBe(6200);
    expect(calculerChiffres(l, P, DEF).tresorerie).toBe(6200);
    expect(tresorerie(l, '2026-06-30', DEF)).toBe(7000);
  });

  it('brouillon-et-propose-hors-chiffres', () => {
    const l = [
      ecr('a', '2026-02-01', '94', '911', 1000),
      ecr('b', '2026-02-02', '94', '911', 400, 'brouillon'),
      ecr('c', '2026-02-03', '94', '911', 250, 'propose'),
      ecr('d', '2027-02-03', '94', '911', 99, 'propose'),
    ];
    const r = calculerChiffres(l, P, DEF);
    expect(r.ca).toBe(1000);
    expect(r.tresorerie).toBe(1000);
    expect(r.enAttente).toEqual({ nombre: 2, montant: 650 });
  });

  it('periode-bornes-incluses', () => {
    const l = [
      ecr('a', '2025-12-31', '94', '911', 1), ecr('b', '2026-01-01', '94', '911', 10),
      ecr('c', '2026-12-31', '94', '911', 100), ecr('d', '2027-01-01', '94', '911', 1000),
    ];
    expect(chiffreAffaires(l, P, DEF)).toBe(110);
    expect(codeErreur(() => chiffreAffaires(l, { debut: '2026-12-31', fin: '2026-01-01' }, DEF))).toBe('periode_invalide');
  });

  it('aucune-ecriture-zero', () => {
    expect(calculerChiffres([], P, DEF)).toEqual({
      ca: 0, charges: 0, resultatProvisoire: 0, tresorerie: 0, enAttente: { nombre: 0, montant: 0 },
    });
  });

  it('definitions-vides-refusees', () => {
    const mauvaises: DefinitionsIndicateurs[] = [
      { ...DEF, ca: { prefixes: [], deduire: [] } },
      { ...DEF, ca: { prefixes: [''], deduire: [] } },
      { ...DEF, ca: { prefixes: ['91'], deduire: [''] } },
      { ...DEF, charges: { prefixes: [], exclure: [] } },
      { ...DEF, charges: { prefixes: ['92'], exclure: [''] } },
      { ...DEF, produits: { prefixes: [] } },
      { ...DEF, tresorerie: { prefixes: [''] } },
    ];
    for (const d of mauvaises) expect(codeErreur(() => calculerChiffres([], P, d))).toBe('definitions_invalides');
  });

  it('somme-exacte-au-centime', () => {
    const l: Ecriture[] = [];
    let attendu = 0;
    for (let i = 0; i < 1000; i++) {
      const m = ((i * 7919) % 100003) + 1;
      attendu += m;
      l.push(ecr('e' + String(i), '2026-05-05', '94', '91' + String(i % 7), m));
    }
    expect(chiffreAffaires(l, P, DEF)).toBe(attendu);
    expect(Number.isInteger(attendu)).toBe(true);
  });
});
