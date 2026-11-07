import { describe, expect, it } from 'vitest';
import { ErreurConvocation, convocation, deplacerAssemblee } from '../convocation.js';
import type { Calendrier, RegleConvocation } from '../convocation.js';

// Valeurs INVENTÉES : délai de 15 jours calendaires, rappel 3 jours avant. Samedi et dimanche non ouvrés.
const cal: Calendrier = {
  ajouterJours: (d, n) => {
    const [y, m, j] = d.split('-').map(Number);
    return new Date(Date.UTC(y!, m! - 1, j! + n)).toISOString().slice(0, 10);
  },
  estOuvre: (d) => ![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()),
};
const regle: RegleConvocation = {
  formesDelaiLegal: ['FORME_A'],
  formesDelaiStatuts: ['FORME_B'],
  formesAssocieUnique: ['FORME_U'],
  delaiLegalJours: 15,
  decompte: 'calendaires',
  joursAvantRappel: 3,
  maxRecul: 7,
};
const base = { forme: 'FORME_A', dateAssemblee: '2027-06-30', delaiStatutsJours: null, dateEnvoiReelle: null, aujourdhui: '2027-05-01' };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurConvocation ? e.code : 'autre';
  }
  return undefined;
};

describe('convocation', () => {
  it('c1-date-limite-15-06-2027', () => {
    expect(convocation(base, regle, cal)).toMatchObject({ applicable: true, dateLimite: '2027-06-15', cartes: [] });
  });
  it('c1-rappel-samedi-avance-au-vendredi-11-06-2027', () => {
    // 15-06 moins 3 jours = samedi 12-06 : avancé au vendredi.
    expect(convocation(base, regle, cal)).toMatchObject({ rappel: '2027-06-11' });
    // Un rappel en jour ouvré n'est pas déplacé (lundi 14-06).
    expect(convocation(base, { ...regle, joursAvantRappel: 1 }, cal)).toMatchObject({ rappel: '2027-06-14' });
    // Un rappel dimanche recule de deux jours.
    expect(convocation(base, { ...regle, joursAvantRappel: 2 }, cal)).toMatchObject({ rappel: '2027-06-11' });
  });
  it('c1-envoi-le-20-06-carte-tardive', () => {
    expect(convocation({ ...base, dateEnvoiReelle: '2027-06-20' }, regle, cal)).toMatchObject({ cartes: ['convocation_tardive'] });
    expect(convocation({ ...base, dateEnvoiReelle: '2027-06-16' }, regle, cal)).toMatchObject({ cartes: ['convocation_tardive'] });
    // Envoi le jour même de la date limite ou avant : pas tardif.
    expect(convocation({ ...base, dateEnvoiReelle: '2027-06-15' }, regle, cal)).toMatchObject({ cartes: [] });
    expect(convocation({ ...base, dateEnvoiReelle: '2027-06-14' }, regle, cal)).toMatchObject({ cartes: [] });
  });
  it('statuts-sans-delai-aucune-date-et-carte', () => {
    expect(convocation({ ...base, forme: 'FORME_B' }, regle, cal)).toEqual({
      applicable: true,
      dateLimite: null,
      rappel: null,
      cartes: ['saisir_delai_statuts'],
      premiereDatePossible: null,
    });
  });
  it('statuts-avec-delai-saisi', () => {
    const r = convocation({ ...base, forme: 'FORME_B', delaiStatutsJours: 10 }, regle, cal);
    expect(r).toMatchObject({ dateLimite: '2027-06-20', cartes: [] });
    // Délai nul accepté : date limite = date d'assemblée.
    expect(convocation({ ...base, forme: 'FORME_B', delaiStatutsJours: 0 }, regle, cal)).toMatchObject({ dateLimite: '2027-06-30' });
    // Le délai saisi n'est pas utilisé pour une forme à délai légal.
    expect(convocation({ ...base, delaiStatutsJours: 10 }, regle, cal)).toMatchObject({ dateLimite: '2027-06-15' });
  });
  it('associe-unique-non-applicable', () => {
    expect(convocation({ ...base, forme: 'FORME_U' }, regle, cal)).toEqual({ applicable: false });
  });
  it('assemblee-trop-proche-premiere-date-possible', () => {
    const r = convocation({ ...base, aujourdhui: '2027-06-16' }, regle, cal);
    expect(r).toMatchObject({ cartes: ['assemblee_trop_proche'], premiereDatePossible: '2027-07-01' });
    // Le jour même de la date limite : encore possible.
    expect(convocation({ ...base, aujourdhui: '2027-06-15' }, regle, cal)).toMatchObject({ cartes: [], premiereDatePossible: null });
  });
  it('decompte-inconnu-refuse', () => {
    expect(code(() => convocation(base, { ...regle, decompte: 'ouvres' }, cal))).toBe('decompte_non_traite');
  });
  it('deplacer-assemblee-garde-l-ancienne-date', () => {
    expect(deplacerAssemblee('2027-06-30', '2027-07-15')).toEqual({ ancienneDate: '2027-06-30', nouvelleDate: '2027-07-15' });
    expect(code(() => deplacerAssemblee('2027-06-30', 'demain'))).toBe('date_invalide');
    expect(code(() => deplacerAssemblee('', '2027-07-15'))).toBe('date_invalide');
  });
});

describe('refus', () => {
  it('delais-invalides', () => {
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => convocation({ ...base, forme: 'FORME_B', delaiStatutsJours: v }, regle, cal))).toBe('delai_invalide');
      expect(code(() => convocation(base, { ...regle, delaiLegalJours: v }, cal))).toBe('regle_invalide');
      expect(code(() => convocation(base, { ...regle, joursAvantRappel: v }, cal))).toBe('regle_invalide');
      expect(code(() => convocation(base, { ...regle, maxRecul: v }, cal))).toBe('regle_invalide');
    }
  });
  it('dates-mal-formees', () => {
    for (const d of ['', '30/06/2027', '2027-02-30', '2027-6-30']) {
      expect(code(() => convocation({ ...base, dateAssemblee: d }, regle, cal))).toBe('date_invalide');
    }
    expect(code(() => convocation({ ...base, aujourdhui: 'hier' }, regle, cal))).toBe('date_invalide');
    expect(code(() => convocation({ ...base, dateEnvoiReelle: 'hier' }, regle, cal))).toBe('date_invalide');
  });
  it('forme-ambigue-ou-inconnue', () => {
    expect(code(() => convocation(base, { ...regle, formesDelaiStatuts: ['FORME_A'] }, cal))).toBe('regle_ambigue');
    expect(code(() => convocation(base, { ...regle, formesAssocieUnique: ['FORME_A'] }, cal))).toBe('regle_ambigue');
    expect(code(() => convocation({ ...base, forme: 'FORME_B' }, { ...regle, formesAssocieUnique: ['FORME_B'] }, cal))).toBe('regle_ambigue');
    expect(code(() => convocation({ ...base, forme: 'FORME_Z' }, regle, cal))).toBe('forme_inconnue');
    expect(code(() => convocation({ ...base, forme: 'FORME_A' }, { ...regle, formesDelaiLegal: [] }, cal))).toBe('forme_inconnue');
  });
  it('calendrier-sans-jour-ouvre-borne', () => {
    const ferme: Calendrier = { ...cal, estOuvre: () => false };
    expect(code(() => convocation(base, regle, ferme))).toBe('calendrier_sans_jour_ouvre');
    // Samedi : un seul recul nécessaire. maxRecul 1 passe, 0 échoue.
    expect(code(() => convocation(base, { ...regle, maxRecul: 1 }, cal))).toBeUndefined();
    expect(code(() => convocation(base, { ...regle, maxRecul: 0 }, cal))).toBe('calendrier_sans_jour_ouvre');
  });
});
