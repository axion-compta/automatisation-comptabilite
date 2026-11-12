import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { ConventionPays } from '../../pieces/lecture/conventions.js';
import { comparerEtats, controlerPied, pagesARelire, type Lecture } from '../double-lecture.js';

const FR: ConventionPays = { decimal: ',', ordreDate: 'JMA' };
const US: ConventionPays = { decimal: '.', ordreDate: 'MJA' };
const lecture = (entrees: Record<string, [string, ConventionPays]>): Lecture =>
  Object.fromEntries(Object.entries(entrees).map(([champ, [texte, convention]]) => [champ, { texte, convention }]));

describe('double lecture', () => {
  it('deux-lectures-concordantes', () => {
    const a = lecture({ total: ['1 234,56', FR], poste1: ['34,56', FR] });
    const b = lecture({ total: ['1 234,56', FR], poste1: ['34,56', FR] });
    expect(comparerEtats(a, b)).toEqual([
      { champ: 'poste1', statut: 'retenue', valeur: 3456 },
      { champ: 'total', statut: 'retenue', valeur: 123456 },
    ]);
    // zéro et négatif concordent aussi
    expect(comparerEtats(lecture({ x: ['0,00', FR] }), lecture({ x: ['0,00', FR] }))).toEqual([{ champ: 'x', statut: 'retenue', valeur: 0 }]);
    expect(comparerEtats(lecture({ x: ['-5,10', FR] }), lecture({ x: ['5,10-', FR] }))).toEqual([{ champ: 'x', statut: 'retenue', valeur: -510 }]);
  });

  it('divergence-non-arbitree-zero', () => {
    const r = comparerEtats(lecture({ total: ['100,00', FR] }), lecture({ total: ['100,01', FR] }));
    expect(r).toEqual([{ champ: 'total', statut: 'a_arbitrer', valeurA: 10000, valeurB: 10001 }]);
    expect(r[0]).not.toHaveProperty('valeur'); // ni choix ni moyenne
    // champ absent d'une lecture, ou illisible : arbitrage, jamais une valeur
    const absent = comparerEtats(lecture({ a: ['1,00', FR], b: ['2,00', FR] }), lecture({ a: ['1,00', FR] }));
    expect(absent).toEqual([{ champ: 'a', statut: 'retenue', valeur: 100 }, { champ: 'b', statut: 'a_arbitrer', valeurA: 200 }]);
    const illisible = comparerEtats(lecture({ a: ['abc', FR] }), lecture({ a: ['abc', FR] }));
    expect(illisible).toEqual([{ champ: 'a', statut: 'a_arbitrer' }]);
    const moitie = comparerEtats(lecture({ a: ['abc', FR] }), lecture({ a: ['3,00', FR] }));
    expect(moitie).toEqual([{ champ: 'a', statut: 'a_arbitrer', valeurB: 300 }]);
    // champ hérité du prototype (« constructor ») présent dans une seule lecture : jamais lu comme une valeur
    const herite = comparerEtats(lecture({ constructor: ['1,00', FR] as [string, ConventionPays] }), lecture({ a: ['1,00', FR] }));
    expect(herite).toEqual([{ champ: 'a', statut: 'a_arbitrer', valeurB: 100 }, { champ: 'constructor', statut: 'a_arbitrer', valeurA: 100 }]);
  });

  it('pied-d-etat-faux-signale', () => {
    expect(controlerPied({ postes: [centimes(1000), centimes(250)], total: centimes(1250) })).toEqual({ coherent: true, ecart: 0 });
    expect(controlerPied({ postes: [centimes(1000), centimes(250)], total: centimes(1251) })).toEqual({ coherent: false, ecart: -1 });
    expect(controlerPied({ postes: [centimes(1000), centimes(250)], total: centimes(1249) })).toEqual({ coherent: false, ecart: 1 });
    expect(controlerPied({ postes: [], total: centimes(0) })).toEqual({ coherent: true, ecart: 0 });
    expect(controlerPied({ postes: [], total: centimes(1) })).toEqual({ coherent: false, ecart: -1 });
    expect(controlerPied({ postes: [centimes(500), centimes(-200)], total: centimes(300) })).toEqual({ coherent: true, ecart: 0 });
    expect(() => controlerPied({ postes: [Number.NaN as never], total: centimes(0) })).toThrow();
    expect(() => controlerPied({ postes: [1.5 as never], total: centimes(0) })).toThrow();
    expect(() => controlerPied({ postes: [centimes(0)], total: Number.NaN as never })).toThrow();
    expect(() => controlerPied({ postes: [centimes(0)], total: 1.5 as never })).toThrow();
    // total hors entiers sûrs, mais écart à 1 centime : seul le contrôle du total le refuse
    expect(() => controlerPied({ postes: [centimes(Number.MAX_SAFE_INTEGER)], total: (Number.MAX_SAFE_INTEGER + 1) as never })).toThrow();
  });

  it('nombres-multilingues', () => {
    // même montant écrit à la française, à l'anglaise et en chiffres nus : concordance
    const r = comparerEtats(lecture({ t: ['1.234,56', FR] }), lecture({ t: ['1,234.56', US] }));
    expect(r).toEqual([{ champ: 't', statut: 'retenue', valeur: 123456 }]);
    // la convention décide du sens : « 1.234 » à la française vaut 1234 euros, à l'anglaise c'est illisible (3 décimales)
    const sens = comparerEtats(lecture({ t: ['1.234', FR] }), lecture({ t: ['1.234', US] }));
    expect(sens).toEqual([{ champ: 't', statut: 'a_arbitrer', valeurA: 123400 }]);
    // « 1,234 » à l'anglaise vaut 1234 ; quatre décimales : illisible plutôt qu'arrondi
    expect(comparerEtats(lecture({ t: ['1,234', US] }), lecture({ t: ['1,234', US] }))).toEqual([{ champ: 't', statut: 'retenue', valeur: 123400 }]);
    expect(comparerEtats(lecture({ t: ['1,2345', FR] }), lecture({ t: ['1,2345', FR] }))).toEqual([{ champ: 't', statut: 'a_arbitrer' }]);
  });

  it('page-en-echec-relue-seule', () => {
    const pages = [
      { page: 1, statut: 'ok' as const },
      { page: 2, statut: 'echec' as const },
      { page: 3, statut: 'ok' as const },
      { page: 5, statut: 'echec' as const },
      { page: 2, statut: 'echec' as const },
    ];
    expect(pagesARelire(pages)).toEqual([2, 5]);
    expect(pagesARelire([{ page: 1, statut: 'ok' }])).toEqual([]);
    expect(pagesARelire([])).toEqual([]);
    expect(pagesARelire([{ page: 9, statut: 'echec' }, { page: 4, statut: 'echec' }])).toEqual([4, 9]);
    expect(pagesARelire([{ page: 10, statut: 'echec' }, { page: 2, statut: 'echec' }])).toEqual([2, 10]);
  });
});
