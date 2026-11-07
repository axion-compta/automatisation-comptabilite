import { describe, expect, it } from 'vitest';
import type { Alias } from '../alias.js';
import { reconnaitre, type Connues, type LigneALire } from '../contrepartie.js';

const reglage = { seuilSimilaritePb: 8500 };
const h = (n: string) => 'hache-' + n.repeat(3);
const alias = (id: string, contrepartieId: string, motif: string, type: Alias['type'] = 'exact', etat: Alias['etat'] = 'actif'): Alias => ({
  id, contrepartieId, motif, type, source: 'personne', acceptes: 5, rejets: 0, rejetsConsecutifs: 0, etat,
});
const connues = (alias: Alias[], extra: Partial<Connues> = {}): Connues => ({
  contreparties: [{ id: 'c1', ibanHaches: [h('1')] }, { id: 'c2', ibanHaches: [h('2')] }],
  alias,
  reglesJamais: [],
  ...extra,
});
const lire = (libelleNormalise: string, extra: Partial<LigneALire> = {}, c: Connues = connues([])) => reconnaitre({ libelleNormalise, ...extra }, c, reglage);

describe('reconnaissance de la contrepartie', () => {
  it('iban-prioritaire-sur-alias', () => {
    const c = connues([alias('a', 'c2', 'ATELIER DU PAIN')]);
    expect(lire('ATELIER DU PAIN', { ibanHache: h('1') }, c)).toMatchObject({ contrepartieId: 'c1', par: 'iban', certitude: 'connue' });
    expect(lire('ATELIER DU PAIN', { ibanHache: h('9') }, c)).toMatchObject({ contrepartieId: 'c2', par: 'alias_exact' });
  });

  it('alias-exact', () => {
    const c = connues([alias('a', 'c1', 'ATELIER DU PAIN'), alias('b', 'c2', 'GARAGE BERTIN', 'exact', 'propose'), alias('d', 'c2', 'GARAGE FONTAINE', 'exact', 'desactive')]);
    expect(lire('ATELIER DU PAIN', {}, c)).toMatchObject({ contrepartieId: 'c1', par: 'alias_exact', certitude: 'connue' });
    for (const l of ['ATELIER DU PAIN 2', 'GARAGE BERTIN', 'GARAGE FONTAINE']) expect(lire(l, {}, c).certitude).not.toBe('connue');
    const jamais = connues([alias('a', 'c1', 'ATELIER DU PAIN')], { reglesJamais: [{ motif: 'ATELIER DU PAIN', contrepartieId: 'c1' }] });
    expect(lire('ATELIER DU PAIN', {}, jamais)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    expect(lire('', {}, c)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    expect(lire('ATELIER DU PAIN')).toMatchObject({ par: 'aucune' });
  });

  it('prefixe-le-plus-long', () => {
    const c = connues([alias('a', 'c1', 'CB BOULANGERIE', 'prefixe'), alias('b', 'c2', 'CB BOULANGERIE RIVOIRE', 'prefixe')]);
    expect(lire('CB BOULANGERIE RIVOIRE 12/03', {}, c)).toMatchObject({ contrepartieId: 'c2', par: 'alias_prefixe', certitude: 'connue' });
    expect(lire('CB BOULANGERIE AUTRE', {}, c)).toMatchObject({ contrepartieId: 'c1', par: 'alias_prefixe' });
    expect(lire('PRLV BOULANGERIE', {}, c).par).not.toBe('alias_prefixe');
  });

  it('similarite-seulement-proposee', () => {
    const c = connues([alias('a', 'c1', 'ATELIER DU PAIN DUPONT')]);
    const r = lire('ATELIER DU PAIN DUPON', {}, c);
    expect(r).toMatchObject({ contrepartieId: 'c1', par: 'similarite', certitude: 'proposee' });
    expect(lire('GARAGE BERTIN', {}, c)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    expect(reconnaitre({ libelleNormalise: 'ATELIER DU PAIN DUPON' }, c, { seuilSimilaritePb: 10000 }).par).toBe('aucune');
    expect(reconnaitre({ libelleNormalise: 'ATELIER DU PAIN DUPON' }, c, { seuilSimilaritePb: 0 }).certitude).toBe('proposee');
  });

  it('ex-aequo-aucune', () => {
    const exact = connues([alias('a', 'c1', 'BOUTIQUE CENTRE'), alias('b', 'c2', 'BOUTIQUE CENTRE')]);
    expect(lire('BOUTIQUE CENTRE', {}, exact)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    const prefixe = connues([alias('a', 'c1', 'BOUTIQUE', 'prefixe'), alias('b', 'c2', 'BOUTIQUE', 'prefixe')]);
    expect(lire('BOUTIQUE CENTRE', {}, prefixe).certitude).toBe('aucune');
    const memeIban = connues([], { contreparties: [{ id: 'c1', ibanHaches: [h('1')] }, { id: 'c2', ibanHaches: [h('1')] }] });
    expect(lire('X', { ibanHache: h('1') }, memeIban)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    const un = connues([alias('a', 'c1', 'BOUTIQUE', 'prefixe'), alias('b', 'c1', 'BOUTIQUE', 'prefixe')]);
    expect(lire('BOUTIQUE CENTRE', {}, un)).toMatchObject({ contrepartieId: 'c1', certitude: 'connue' });
  });

  it('franchise-departagee-par-iban', () => {
    const c = connues([alias('a', 'c1', 'ENSEIGNE FRANCHISE'), alias('b', 'c2', 'ENSEIGNE FRANCHISE')]);
    expect(lire('ENSEIGNE FRANCHISE', { ibanHache: h('2') }, c)).toMatchObject({ contrepartieId: 'c2', par: 'iban' });
    expect(lire('ENSEIGNE FRANCHISE', { ibanHache: h('1') }, c)).toMatchObject({ contrepartieId: 'c1', par: 'iban' });
  });

  it('categorie-banque-sans-effet', () => {
    const c = connues([alias('a', 'c1', 'ATELIER DU PAIN')]);
    for (const l of ['ATELIER DU PAIN', 'INCONNU TOTAL']) {
      const sans = lire(l, {}, c);
      expect(lire(l, { categorieBanque: 'Alimentation' }, c)).toEqual(sans);
      expect(lire(l, { categorieBanque: 'Transport', ibanHache: h('9') }, c)).toEqual(lire(l, { ibanHache: h('9') }, c));
    }
  });

  it('t04-3-trois-alias-une-contrepartie', () => {
    const c = connues([alias('a', 'c1', 'ATELIER DU PAIN'), alias('b', 'c1', 'ATELIER PAIN PARIS'), alias('d', 'c1', 'BOULANGERIE ATELIER', 'prefixe')]);
    const ids = ['ATELIER DU PAIN', 'ATELIER PAIN PARIS', 'BOULANGERIE ATELIER 05/03'].map((l) => lire(l, {}, c).contrepartieId);
    expect(ids).toEqual(['c1', 'c1', 'c1']);
    expect(c.contreparties.filter((x) => x.id === 'c1')).toHaveLength(1);
    expect(c.alias).toHaveLength(3);
    const inverse = { ...c, alias: [...c.alias].reverse(), contreparties: [...c.contreparties].reverse() };
    for (const l of ['ATELIER DU PAIN', 'ATELIER PAIN PARIS 2', 'BOULANGERIE ATELIER 05/03']) expect(lire(l, {}, inverse)).toEqual(lire(l, {}, c));
  });

  it('listes-vides-et-seuil-invalide', () => {
    const vide = { contreparties: [], alias: [], reglesJamais: [] };
    expect(lire('ATELIER', { ibanHache: h('1') }, vide)).toMatchObject({ par: 'aucune', certitude: 'aucune' });
    for (const s of [NaN, Infinity, -1, 10001, 85.5]) {
      expect(() => reconnaitre({ libelleNormalise: 'X' }, vide, { seuilSimilaritePb: s })).toThrow('seuil_invalide');
    }
  });
});
