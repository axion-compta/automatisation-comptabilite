import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import { comptesProposes, formeCouverte, regleDeForme } from '../forme.js';
import type { Comportement, LigneRegleForme } from '../forme.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const l = (forme: string, comportement: Comportement, valeur: string, source = 'source-test'): LigneRegleForme => ({ forme, comportement, valeur, source });
const MATRICE: LigneRegleForme[] = [
  l('SAS', 'compte_courant_associe', '9992'),
  l('SAS', 'compte_capital', '9993'),
  l('SAS', 'dividendes', 'oui'),
  l('SAS', 'impot_par_defaut', 'IS'),
  l('EI', 'compte_exploitant', '9991'),
  l('EI', 'impot_par_defaut', 'IR'),
  l('SARL', 'compte_courant_associe', '9992'),
  l('SARL', 'compte_capital', '9992'),
];

describe('matrice forme × comportement', () => {
  it('sas-sans-compte-exploitant-p06', () => {
    expect(regleDeForme(MATRICE, 'SAS', 'compte_exploitant')).toBeNull();
    expect(comptesProposes(MATRICE, 'SAS')).toEqual(['9992', '9993']);
    expect(regleDeForme(MATRICE, 'SAS', 'compte_courant_associe')).toBe('9992');
    expect(regleDeForme(MATRICE, 'SAS', 'compte_capital')).toBe('9993');
    expect(regleDeForme(MATRICE, 'SAS', 'impot_par_defaut')).toBe('IS');
    expect(formeCouverte(MATRICE, 'SAS')).toEqual({ couverte: true });
  });
  it('ei-compte-exploitant-p06', () => {
    expect(regleDeForme(MATRICE, 'EI', 'compte_exploitant')).toBe('9991');
    expect(regleDeForme(MATRICE, 'EI', 'compte_courant_associe')).toBeNull();
    expect(regleDeForme(MATRICE, 'EI', 'compte_capital')).toBeNull();
    expect(comptesProposes(MATRICE, 'EI')).toEqual(['9991']);
    expect(regleDeForme(MATRICE, 'EI', 'impot_par_defaut')).toBe('IR');
  });
  it('forme-sans-ligne-bloquee', () => {
    expect(formeCouverte(MATRICE, 'SCI')).toEqual({ couverte: false, motif: 'forme_sans_regle' });
    expect(formeCouverte([], 'SAS')).toEqual({ couverte: false, motif: 'forme_sans_regle' });
    expect(comptesProposes(MATRICE, 'SCI')).toEqual([]);
    expect(regleDeForme(MATRICE, 'SCI', 'dividendes')).toBeNull();
  });
  it('association-refusee-mvp', () => {
    expect(formeCouverte(MATRICE, 'association')).toEqual({ couverte: false, motif: 'forme_refusee_mvp' });
    expect(formeCouverte([l('association', 'dividendes', 'non')], 'association')).toEqual({ couverte: false, motif: 'forme_refusee_mvp' });
  });
  it('forme-inconnue', () => {
    for (const f of ['SA', 'sarl', '']) expect(formeCouverte(MATRICE, f)).toEqual({ couverte: false, motif: 'forme_inconnue' });
    expect(formeCouverte([l('SA', 'dividendes', 'oui')], 'SA').motif).toBe('forme_inconnue');
  });
  it('regle-ambigue-refusee', () => {
    const m = [...MATRICE, l('SAS', 'compte_capital', '9991')];
    expect(code(() => regleDeForme(m, 'SAS', 'compte_capital'))).toBe('regle_forme_ambigue');
    expect(code(() => regleDeForme(m, 'SAS', 'dividendes'))).toBeUndefined();
    expect(code(() => regleDeForme([...MATRICE, l('SAS', 'compte_capital', '9993')], 'SAS', 'compte_capital'))).toBe('regle_forme_ambigue');
  });
  it('source-absente-refusee', () => {
    for (const s of ['', '   ']) {
      const m = [...MATRICE, l('SAS', 'dividendes', 'oui', s)];
      expect(code(() => comptesProposes(m, 'SAS'))).toBe('source_absente');
      expect(code(() => regleDeForme(m, 'SAS', 'dividendes'))).toBe('source_absente');
      expect(code(() => formeCouverte(m, 'SAS'))).toBe('source_absente');
    }
    expect(code(() => comptesProposes([...MATRICE, l('EURL', 'dividendes', 'oui', '')], 'SAS'))).toBeUndefined();
  });
  it('comptes-tries-sans-doublon', () => {
    const m = [l('SARL', 'compte_capital', '9993'), l('SARL', 'compte_courant_associe', '9991'), l('SARL', 'compte_exploitant', '9993'), l('SARL', 'dividendes', '9990'), l('SARL', 'impot_par_defaut', '9989')];
    expect(comptesProposes(m, 'SARL')).toEqual(['9991', '9993']);
    expect(comptesProposes(MATRICE, 'SARL')).toEqual(['9992']);
  });
});
