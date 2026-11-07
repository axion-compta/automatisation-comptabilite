import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type Evenement, compter, comparer, lireBudgets } from '../budget.js';

const ENTETE = 'parcours,etape,max_clics,max_saisies,source';
const clics = (n: number): Evenement[] => Array.from({ length: n }, () => ({ type: 'clic' }));
const budget3 = { parcours: 'P3', etape: 'x', maxClics: 3, maxSaisies: 0, source: 's' };

describe('comparer et compter', () => {
  it('g1-trois-gestes-vert', () => {
    expect(comparer(budget3, compter(clics(3)))).toEqual({ ok: true });
  });

  it('g1-quatre-gestes-message-exact', () => {
    expect(comparer(budget3, compter(clics(4)))).toEqual({ ok: false, message: 'P3 : 4 gestes, budget 3' });
  });

  it('g2-declarer-trois-clics-vert', () => {
    const texte = readFileSync(new URL('../../../../../docs/budget-gestes.csv', import.meta.url), 'utf8');
    const declarer = lireBudgets(texte).find((x) => x.parcours === 'P4' && x.etape === 'déclarer')!;
    expect(declarer.maxClics).toBe(3);
    expect(comparer(declarer, compter(clics(3)))).toEqual({ ok: true });
    expect(comparer(declarer, compter(clics(4)))).toEqual({ ok: false, message: 'P4 : 4 gestes, budget 3' });
  });

  it('saisie-de-plusieurs-touches-compte-un', () => {
    const ev: Evenement[] = [
      { type: 'saisie', champ: 'nom' },
      { type: 'saisie', champ: 'nom' },
      { type: 'saisie', champ: 'nom' },
    ];
    expect(compter(ev)).toEqual({ gestes: 0, saisies: 1 });
  });

  it('defilement-et-survol-ignores', () => {
    expect(compter([{ type: 'defilement' }, { type: 'survol' }, { type: 'clic' }])).toEqual({ gestes: 1, saisies: 0 });
  });

  it('toucher-compte-comme-clic', () => {
    expect(compter([{ type: 'toucher' }, { type: 'clic' }])).toEqual({ gestes: 2, saisies: 0 });
  });

  it('liste vide : 0 et 0', () => {
    expect(compter([])).toEqual({ gestes: 0, saisies: 0 });
  });

  it('deux champs différents à la suite : 2 saisies ; saisie, clic, saisie du même champ : 2', () => {
    expect(compter([{ type: 'saisie', champ: 'a' }, { type: 'saisie', champ: 'b' }]).saisies).toBe(2);
    expect(compter([{ type: 'saisie', champ: 'a' }, { type: 'clic' }, { type: 'saisie', champ: 'a' }]).saisies).toBe(2);
  });

  it('survol entre deux saisies du même champ : toujours 1 ; défilement idem', () => {
    const ev: Evenement[] = [{ type: 'saisie', champ: 'a' }, { type: 'survol' }, { type: 'defilement' }, { type: 'saisie', champ: 'a' }];
    expect(compter(ev).saisies).toBe(1);
  });

  it('message des saisies et des deux dépassements', () => {
    const b = { ...budget3, maxSaisies: 1 };
    const ev: Evenement[] = [{ type: 'saisie', champ: 'a' }, { type: 'saisie', champ: 'b' }];
    expect(comparer(b, compter(ev))).toEqual({ ok: false, message: 'P3 : 2 saisies, budget 1' });
    const deux = compter([...clics(4), ...ev]);
    const r = comparer(b, deux);
    expect(r).toEqual({ ok: false, message: 'P3 : 4 gestes, budget 3 ; P3 : 2 saisies, budget 1' });
  });
});

describe('lireBudgets', () => {
  it('budgets-du-depot-lisibles', () => {
    const texte = readFileSync(new URL('../../../../../docs/budget-gestes.csv', import.meta.url), 'utf8');
    const l = lireBudgets(texte);
    expect(l).toHaveLength(7);
    expect(l.map((x) => x.parcours)).toEqual(['P1', 'P2', 'P3', 'P4', 'P4', 'P5', 'P6']);
    expect(l.find((x) => x.parcours === 'P3')).toMatchObject({ maxClics: 3, maxSaisies: 0 });
    expect(l.every((x) => x.source.length > 0)).toBe(true);
  });

  it('parcours-inconnu-refuse', () => {
    for (const p of ['P0', 'P7', 'X1', '']) {
      expect(() => lireBudgets(`${ENTETE}\n${p},e,1,0,s\n`)).toThrow();
    }
  });

  it('CRLF et ligne vide finale acceptés', () => {
    const l = lireBudgets(`${ENTETE}\r\nP1,a,5,0,s\r\nP2,b,4,0,s\r\n\r\n`);
    expect(l).toHaveLength(2);
    expect(l[0]!.source).toBe('s');
  });

  it('fichier vide ou en-tête différent : refus', () => {
    expect(() => lireBudgets('')).toThrow();
    expect(() => lireBudgets('parcours,etape,max_clics,source\nP1,a,1,s\n')).toThrow();
  });

  it('doublon parcours et étape : refus', () => {
    expect(() => lireBudgets(`${ENTETE}\nP1,a,1,0,s\nP1,a,2,0,s\n`)).toThrow();
    expect(lireBudgets(`${ENTETE}\nP1,a,1,0,s\nP1,b,2,0,s\n`)).toHaveLength(2);
  });

  it('nombre non entier, négatif ou illisible : refus', () => {
    for (const v of ['3.0', '-1', '1.5', 'abc', '', 'NaN', 'Infinity']) {
      expect(() => lireBudgets(`${ENTETE}\nP1,a,${v},0,s\n`)).toThrow();
      expect(() => lireBudgets(`${ENTETE}\nP1,a,1,${v},s\n`)).toThrow();
    }
  });

  it('source vide ou colonnes en trop : refus', () => {
    expect(() => lireBudgets(`${ENTETE}\nP1,a,1,0,\n`)).toThrow();
    expect(() => lireBudgets(`${ENTETE}\nP1,a,1,0,s,z\n`)).toThrow();
    expect(() => lireBudgets(`${ENTETE}\nP1,a,1,0\n`)).toThrow();
  });
});
