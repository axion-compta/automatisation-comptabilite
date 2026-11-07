import { describe, expect, it } from 'vitest';
import type { Calendrier } from '../jours-ouvres.js';
import {
  type Ancres,
  type Echeance,
  ErreurCatalogue,
  type ProfilEcheances,
  type TypeEcheance,
  actionRappel,
  echeancesDe,
} from '../catalogue.js';

// Délais INVENTÉS (5 mois, 40 jours) ; calendrier de test : samedi et dimanche non ouvrés, un férié inventé.
const cal: Calendrier = { joursNonOuvres: [6, 7], feries: ['2027-05-18'] };
const profil: ProfilEcheances = { forme: 'forme-a', avecSalaries: true, avecVehicule: false, regimeTva: 'regime-x' };
const ancres: Ancres = { creation: '2026-01-04', clotures: ['2026-12-31'], anneesCiviles: [], finsDePeriode: [] };
const base: TypeEcheance = {
  code: 'approbation', ancrage: 'cloture', decalage: { mois: 5, jours: 0 }, report: 'suivant', condition: {},
  statutSource: 'verifie', niveau: 'preparee', rappelsJours: [], legale: true,
};
const avec = (p: Partial<TypeEcheance>): TypeEcheance => ({ ...base, ...p });
const vide: Ancres = { clotures: [], anneesCiviles: [], finsDePeriode: [] };
const nul = { mois: 0, jours: 0 };
const dates = (t: TypeEcheance[], p = profil, a = ancres) => echeancesDe(t, p, a, cal).map((e) => e.dateLimite);
const code = (action: () => unknown): string | undefined => {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurCatalogue ? e.code : 'autre';
  }
  return undefined;
};
const premiere = (): Echeance => {
  const e = echeancesDe([base], profil, ancres, cal)[0];
  if (e === undefined) throw new Error('échéance attendue');
  return e;
};

describe('catalogue des échéances', () => {
  it('approbation-depuis-la-cloture', () => {
    expect(echeancesDe([base], profil, ancres, cal)).toEqual([
      { code: 'approbation', dateLimite: '2027-05-31', dateAVerifier: false, rappels: [], niveau: 'preparee' },
    ]);
  });

  it('exercice-decale', () => {
    expect(dates([base], profil, { ...ancres, clotures: ['2027-03-31', '2026-12-31'] })).toEqual(['2027-05-31', '2027-08-31']);
  });

  it('report-au-jour-ouvre', () => {
    const a = { ...ancres, clotures: ['2026-12-15'] };
    const date = (report: TypeEcheance['report']) => dates([avec({ report })], profil, a)[0];
    expect([date('suivant'), date('precedent'), date('aucun')]).toEqual(['2027-05-17', '2027-05-14', '2027-05-15']);
  });

  it('source-non-verifiee-a-verifier', () => {
    expect(echeancesDe([avec({ statutSource: 'non_verifie' })], profil, ancres, cal)[0]?.dateAVerifier).toBe(true);
    expect(premiere().dateAVerifier).toBe(false);
  });

  it('sans-salarie-aucune-echeance-sociale', () => {
    const social = avec({ code: 'sociale', condition: { avecSalaries: true } });
    expect(dates([social], { ...profil, avecSalaries: false })).toEqual([]);
    expect(dates([social])).toHaveLength(1);
  });

  it('avec-vehicule-alerte', () => {
    const t = avec({
      code: 'vehicule', ancrage: 'periode', decalage: { mois: 0, jours: 40 }, report: 'aucun',
      condition: { avecVehicule: true }, niveau: 'alerte', rappelsJours: [30, 7], alerteJours: 15,
    });
    const a = { ...ancres, finsDePeriode: ['2027-06-30'] };
    expect(dates([t], profil, a)).toEqual([]);
    expect(echeancesDe([t], { ...profil, avecVehicule: true }, a, cal)).toEqual([
      { code: 'vehicule', dateLimite: '2027-08-09', dateAVerifier: false, rappels: ['2027-07-10', '2027-08-02'], alerte: '2027-07-25', niveau: 'alerte' },
    ]);
  });

  it('ne-plus-rappeler-interdit-si-legale', () => {
    expect(code(() => actionRappel(premiere(), 'ne_plus_rappeler', base))).toBe('interdit_echeance_legale');
    expect(actionRappel(premiere(), 'ne_plus_rappeler', avec({ legale: false }))).toEqual({ code: 'approbation', action: 'ne_plus_rappeler' });
  });

  it('plus-tard-permis', () => {
    expect(actionRappel(premiere(), 'plus_tard', base)).toEqual({ code: 'approbation', action: 'plus_tard' });
    expect(actionRappel(premiere(), 'moins_tot', base)).toEqual({ code: 'approbation', action: 'moins_tot' });
    expect(code(() => actionRappel(premiere(), 'autre' as never, base))).toBe('action_invalide');
    expect(code(() => actionRappel(premiere(), 'plus_tard', avec({ code: 'autre-code' })))).toBe('type_incoherent');
  });
});

describe('catalogue : cas limites', () => {
  it('ancres absentes : aucune échéance inventée', () => {
    const types = (['creation', 'cloture', 'annee_civile', 'periode'] as const).map((a) => avec({ code: a, ancrage: a }));
    expect(dates(types, profil, vide)).toEqual([]);
    expect(dates([])).toEqual([]);
  });

  it('année civile et création', () => {
    const t = [avec({ code: 'c', ancrage: 'creation', decalage: nul, report: 'aucun' }), avec({ code: 'a', ancrage: 'annee_civile', decalage: nul, report: 'aucun' })];
    expect(dates(t, profil, { ...ancres, anneesCiviles: [2026] })).toEqual(['2026-01-04', '2026-12-31']);
  });

  it('tri par date puis code ; conditions de forme et de régime', () => {
    const t = avec({ code: 'a', ancrage: 'creation', decalage: { mois: 0, jours: 1 }, report: 'aucun' });
    const codes = echeancesDe([avec({ code: 'z' }), avec({ code: 'b' }), t], profil, ancres, cal).map((e) => e.code);
    expect(codes).toEqual(['a', 'b', 'z']);
    const n = (condition: TypeEcheance['condition'], p = profil) => dates([avec({ condition })], p).length;
    expect([n({ formes: ['forme-b'] }), n({ formes: ['forme-a'] }), n({ regimesTva: ['regime-y'] }), n({ regimesTva: ['regime-x'] })]).toEqual([0, 1, 0, 1]);
    expect(n({ regimesTva: ['regime-x'] }, { avecSalaries: true, avecVehicule: false })).toBe(0);
  });

  it('refus des paramètres invalides', () => {
    const essai = (...t: TypeEcheance[]) => code(() => echeancesDe(t, profil, ancres, cal));
    for (const v of [Number.NaN, Infinity, 1.5]) {
      expect(essai(avec({ decalage: { mois: v, jours: 0 } }))).toBe('decalage_invalide');
      expect(essai(avec({ decalage: { mois: 0, jours: v } }))).toBe('decalage_invalide');
      expect(essai(avec({ rappelsJours: [v] }))).toBe('rappel_invalide');
    }
    expect(essai(avec({ rappelsJours: [-1] }))).toBe('rappel_invalide');
    expect(essai(avec({ alerteJours: -1 }))).toBe('rappel_invalide');
    expect(essai(base, base)).toBe('code_double');
    const mauvais = [{ code: '' }, { niveau: 'x' }, { ancrage: 'x' }, { report: 'x' }, { statutSource: 'x' }, { legale: 'oui' }];
    for (const m of mauvais) expect(essai(avec(m as never))).toBe('type_invalide');
    const creation = [avec({ ancrage: 'creation' })];
    const ancre = (a: Partial<Ancres>, t = [base]) => code(() => echeancesDe(t, profil, { ...ancres, ...a }, cal));
    expect(ancre({ clotures: ['pas-une-date'] })).toBe('ancre_invalide');
    expect(ancre({ creation: '2026-02-30' }, creation)).toBe('ancre_invalide');
    expect(ancre({ anneesCiviles: [2026.5] }, [avec({ ancrage: 'annee_civile' })])).toBe('ancre_invalide');
  });

  it('types invalides refusés même sans ancre ni condition remplie', () => {
    const t = avec({ decalage: { mois: Number.NaN, jours: 0 } });
    expect(code(() => echeancesDe([t], { ...profil, avecSalaries: false }, vide, cal))).toBe('decalage_invalide');
  });
});
