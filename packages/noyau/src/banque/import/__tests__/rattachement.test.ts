import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { rattacher } from '../rattachement.js';

const egal = (a: string, b: string): boolean => a === b;
type Compte = Parameters<typeof rattacher>[1][number];
const compte = (id: string, extra: Partial<Compte> = {}): Compte => ({ id, ferme: false, ...extra });
const releve = (cloture: number, fin = '2026-09-30') => ({ soldeCloture: centimes(cloture), periodeFin: fin });
const entree = { soldeOuverture: centimes(125000), periodeDebut: '2026-10-01' };

describe('rattachement d’un relevé à un compte', () => {
  it('par-iban', () => {
    const comptes = [compte('A', { ibanHache: 'h-a' }), compte('B', { ibanHache: 'h-b' })];
    expect(rattacher({ ibanHache: 'h-b' }, comptes, undefined, egal)).toEqual({ type: 'compte', compteId: 'B', par: 'iban' });
    expect(rattacher({ ibanHache: 'h-b' }, comptes, 'B', egal)).toEqual({ type: 'compte', compteId: 'B', par: 'iban' });
    expect(rattacher({ ibanHache: 'h-b', ...entree }, [compte('A', { dernierReleve: releve(125000) }), ...comptes.slice(1)], undefined, egal)).toMatchObject({ compteId: 'B' });
    expect(rattacher({ ibanHache: 'h-b' }, [...comptes].reverse(), undefined, egal)).toMatchObject({ compteId: 'B' });
  });

  it('par-solde-unique', () => {
    const comptes = [compte('A', { dernierReleve: releve(125000) }), compte('B', { dernierReleve: releve(999) })];
    expect(rattacher(entree, comptes, undefined, egal)).toEqual({ type: 'compte', compteId: 'A', par: 'solde' });
    expect(rattacher(entree, [...comptes].reverse(), undefined, egal)).toMatchObject({ compteId: 'A' });
    expect(rattacher({ ibanHache: 'inconnu', ...entree }, comptes, undefined, egal)).toMatchObject({ compteId: 'A', par: 'solde' });
    // la fin du relevé connu doit précéder le début du nouveau
    for (const fin of ['2026-10-01', '2026-10-15']) {
      expect(rattacher(entree, [compte('A', { dernierReleve: releve(125000, fin) })], undefined, egal)).toEqual({ type: 'question', comptes: ['A'] });
    }
    expect(rattacher(entree, [compte('A', { dernierReleve: releve(125000, '2026-09-30') })], undefined, egal)).toMatchObject({ par: 'solde' });
  });

  it('deux-soldes-egaux-question', () => {
    const comptes = [compte('C', { dernierReleve: releve(125000) }), compte('A', { dernierReleve: releve(125000) }), compte('B')];
    expect(rattacher(entree, comptes, undefined, egal)).toEqual({ type: 'question', comptes: ['A', 'C'] });
    expect(rattacher(entree, [...comptes].reverse(), undefined, egal)).toEqual({ type: 'question', comptes: ['A', 'C'] });
  });

  it('aucun-indice-question-tous-comptes', () => {
    const comptes = [compte('B'), compte('A', { dernierReleve: releve(1) }), compte('Z', { ferme: true })];
    expect(rattacher(entree, comptes, undefined, egal)).toEqual({ type: 'question', comptes: ['A', 'B'] });
    expect(rattacher({}, comptes, undefined, egal)).toEqual({ type: 'question', comptes: ['A', 'B'] });
    expect(rattacher(entree, [], undefined, egal)).toEqual({ type: 'question', comptes: [] });
    // solde absent, NaN, non entier : jamais égal, règle du solde ignorée
    const exact = [compte('A', { dernierReleve: releve(125000) }), compte('B')];
    for (const soldeOuverture of [NaN, 1250.5, Infinity, undefined] as const) {
      const r = rattacher({ soldeOuverture: soldeOuverture as never, periodeDebut: '2026-10-01' }, exact, undefined, egal);
      expect(r).toEqual({ type: 'question', comptes: ['A', 'B'] });
    }
    expect(rattacher({ soldeOuverture: centimes(125000) }, exact, undefined, egal).type).toBe('question');
    expect(rattacher({ ...entree, periodeDebut: 'pas-une-date' }, exact, undefined, egal).type).toBe('question');
  });

  it('compte-ferme-exclu', () => {
    const comptes = [compte('A', { ibanHache: 'h-a', ferme: true }), compte('B', { dernierReleve: releve(125000), ferme: true })];
    expect(rattacher({ ibanHache: 'h-a', ...entree }, comptes, undefined, egal)).toEqual({ type: 'question', comptes: [] });
    expect(rattacher({ ibanHache: 'h-a' }, [...comptes, compte('C')], undefined, egal)).toEqual({ type: 'question', comptes: ['C'] });
    expect(() => rattacher({}, comptes, 'A', egal)).toThrow('compte_ferme');
  });

  it('mauvais-compte-bloque', () => {
    const comptes = [compte('A', { ibanHache: 'h-a' }), compte('B', { ibanHache: 'h-b' })];
    expect(rattacher({ ibanHache: 'h-a' }, comptes, 'B', egal)).toEqual({ type: 'mauvais_compte', choisi: 'B', lu: 'A' });
    expect(() => rattacher({ ibanHache: 'h-a' }, comptes, 'inconnu', egal)).toThrow('compte_inconnu');
    expect(() => rattacher({}, comptes, '', egal)).toThrow('compte_inconnu');
  });

  it('choix-sans-iban-accepte', () => {
    const comptes = [compte('A'), compte('B', { dernierReleve: releve(125000) })];
    expect(rattacher({}, comptes, 'A', egal)).toEqual({ type: 'compte', compteId: 'A', par: 'choix' });
    expect(rattacher(entree, comptes, 'A', egal)).toEqual({ type: 'compte', compteId: 'A', par: 'choix' });
    expect(rattacher({ ibanHache: 'illisible' }, comptes, 'A', egal)).toEqual({ type: 'compte', compteId: 'A', par: 'choix' });
  });
});
