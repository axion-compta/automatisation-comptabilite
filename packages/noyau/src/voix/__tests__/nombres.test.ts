import { describe, expect, it } from 'vitest';
import { motsVersEntier, montantDit } from '../nombres.js';

const mots = (cas: [string, number | null][]) => cas.forEach(([m, v]) => expect(motsVersEntier(m), m).toBe(v));
const montants = (cas: [string, number | null][]) => cas.forEach(([m, v]) => expect(montantDit(m), m).toBe(v));

describe('nombres dits', () => {
  it('exemple-de-la-spec', () => {
    montants([['mille deux cent trente-quatre euros cinquante', 123450], ['Mille deux cent trente-quatre euros et cinquante centimes', 123450]]);
    mots([['mille deux cent trente-quatre', 1234]]);
  });
  it('zero', () => {
    mots([['zéro', 0], ['Zero', 0], ['zero zero', null]]);
    montants([['zéro euro', 0], ['zéro euros', 0], ['0 euro', 0], ['un euro', 100]]);
  });
  it('soixante-et-onze-et-quatre-vingt-onze', () => {
    mots([['soixante et onze', 71], ['soixante-onze', null], ['soixante-et-un', 61], ['vingt et un', 21], ['vingt-un', null],
      ['soixante-dix', 70], ['soixante-dix-sept', 77], ['soixante-dix-neuf', 79], ['soixante-douze', 72], ['soixante-seize', 76],
      ['quatre-vingt-onze', 91], ['quatre-vingt-seize', 96], ['quatre-vingt-dix', 90], ['quatre-vingt-dix-neuf', 99],
      ['quatre-vingt-un', 81], ['quatre-vingt-et-un', null], ['quatre-vingt-dix-six', null], ['trente-et-onze', null],
      ['dix-sept', 17], ['dix-neuf', 19], ['dix', 10], ['seize', 16], ['quarante-deux', 42], ['cinquante-et-un', 51]]);
  });
  it('quatre-vingts-et-deux-cents', () => {
    mots([['quatre-vingts', 80], ['quatre-vingt', 80], ['quatre-vingts-deux', null], ['deux cents', 200], ['deux cent cinq', 205],
      ['deux cents cinq', null], ['cent', 100], ['cents', null], ['un cent', null], ['trois cent quatre-vingt-dix-neuf', 399],
      ['neuf cents', 900], ['vingts', null], ['trente vingt', null]]);
  });
  it('mille-invariable', () => {
    mots([['mille', 1000], ['deux mille', 2000], ['deux mille cinq', 2005], ['vingt et un mille', 21000], ['un mille', null],
      ['mille mille', null], ['deux mille mille', null], ['mille un', 1001], ['cent mille', 100000], ['deux cents mille', 200000],
      ['mille deux cent trente-quatre', 1234]]);
  });
  it('millions', () => {
    mots([['un million', 1000000], ['deux millions cinq cent mille', 2500000], ['million', null], ['un million un million', null],
      ['mille un million', null], ['deux millions trois mille quatre', 2003004],
      ['neuf cent quatre-vingt-dix-neuf millions neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf', 999999999],
      ['un million deux millions', null]]);
  });
  it('virgule', () => {
    montants([['douze virgule cinquante', 1250], ['12 virgule 50', 1250], ['douze virgule cinquante euros', 1250],
      ['douze virgule zéro cinq', 1205], ['douze virgule 05', 1205], ['douze virgule cinq', null], ['douze virgule 5', null],
      ['douze virgule cent', null], ['virgule cinquante', null], ['douze virgule', null]]);
  });
  it('centimes-seuls', () => {
    montants([['cinquante centimes', 50], ['un centime', 1], ['zéro centime', 0], ['cent centimes', null], ['centimes', null],
      ['cinquante', null], ['cinq euros et cinq centimes', 505], ['cinq euros cinq', null], ['cinq euros et cinq', null],
      ['cinq euros et', null], ['cinq euros centimes', null]]);
  });
  it('chiffres-et-mots-melanges', () => {
    montants([['1 234 euros 50', 123450], ['1234 euros 50', 123450], ['1 234 euros cinquante', 123450], ['mille euros 05', 100005],
      ['12 euros', 1200], ['12 € 50', 1250], ['12 € et 50 centimes', 1250], ['1 23 euros', null], ['1 2345 euros', null],
      ['9007199254740991 euros', null], ['90071992547409 euros', 9007199254740900], ['2 mille euros', null], ['douze euros 5', null]]);
  });
  it('formes-incorrectes-null', () => {
    mots([['cent cent', null], ['vingt-dix', null], ['septante', null], ['nonante', null], ['huitante', null], ['', null], ['   ', null],
      ['euros', null], ['et', null], ['abc', null], ['cinq cinq', null], ['deux trois', null], ['dix dix', null]]);
    montants([['euros', null], ['', null], ['cent cent euros', null], ['septante euros', null], ['euros cinquante', null],
      ['quatre euros nonante', null], ['n’importe quoi', null]]);
  });
  it('centimes-au-dessus-de-99-null', () => {
    montants([['un euro cent centimes', null], ['un euro 100', null], ['un euro et cent', null], ['un euro 99', 199],
      ['un euro quatre-vingt-dix-neuf centimes', 199], ['un euro 150', null], ['un euro mille centimes', null]]);
  });
});
