import { describe, expect, it } from 'vitest';
import type { Associe } from '../../profil/associes.js';
import { ErreurBeneficiaires, detecterChangements, rappelMiseAJour } from '../beneficiaires-effectifs.js';

// Associés fictifs : identifiants seulement. Seuil fictif, fourni par l'appelant.
type Detenteur = Associe & { controle?: boolean };
const p = (id: string, partPdb: number, controle = false): Detenteur => ({ id, nature: 'physique', roles: ['associe'], partPdb, controle });
const AVANT = [p('pers-a', 6000), p('pers-b', 4000)];
const SEUIL = { seuilPdb: 2500, seuilConfirme: true };
const DATE = '2026-11-12';
const codeDe = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurBeneficiaires ? e.code : 'autre';
  }
  return undefined;
};

describe('bénéficiaires effectifs (noyau)', () => {
  it('changement-capital-rappel-cree', () => {
    const avant = [p('pers-a', 7500), p('pers-b', 2500)];
    const c = detecterChangements(avant, [p('pers-a', 5000), p('pers-b', 2500), p('pers-c', 2500)], SEUIL);
    expect(c.changements).toEqual([{ id: 'pers-c', type: 'hausse_au_dessus_du_seuil' }]);
    expect(rappelMiseAJour(c, DATE)).toEqual({
      type: 'beneficiaires_effectifs_a_mettre_a_jour',
      personnes: ['pers-c'],
      date: DATE,
      aVerifier: false,
      envoi: 'aucun',
    });
    const ctrl = detecterChangements(AVANT, [p('pers-a', 6000), p('pers-b', 4000, true)], SEUIL);
    expect(ctrl.changements).toEqual([{ id: 'pers-b', type: 'controle_acquis' }]);
    expect(rappelMiseAJour(ctrl, DATE)?.personnes).toEqual(['pers-b']);
  });

  it('aucun-franchissement-aucun-rappel', () => {
    const apres = [p('pers-a', 5500), p('pers-b', 4500)];
    const r = detecterChangements(AVANT, apres, SEUIL);
    expect(r.changements).toEqual([]);
    expect(rappelMiseAJour(r, DATE)).toBeNull();
    expect(rappelMiseAJour(detecterChangements(AVANT, AVANT, SEUIL), DATE)).toBeNull();
  });

  it('baisse-sous-seuil-detectee', () => {
    const r = detecterChangements([p('pers-a', 7500), p('pers-b', 2500)], [p('pers-a', 8000), p('pers-b', 2000)], SEUIL);
    expect(r.changements).toEqual([{ id: 'pers-b', type: 'baisse_sous_le_seuil' }]);
    expect(rappelMiseAJour(r, DATE)?.personnes).toEqual(['pers-b']);
    expect(detecterChangements(AVANT, [p('pers-a', 6000, true), p('pers-b', 4000)], SEUIL).changements.map((c) => c.type)).toEqual(['controle_acquis']);
    expect(detecterChangements([p('pers-a', 6000, true), p('pers-b', 4000)], AVANT, SEUIL).changements.map((c) => c.type)).toEqual(['controle_perdu']);
  });

  it('seuil-non-confirme-a-verifier', () => {
    const avant = [p('pers-a', 7500), p('pers-b', 2500)];
    const apres = [p('pers-a', 8000), p('pers-b', 2000)];
    const r = detecterChangements(avant, apres, { seuilPdb: 2500, seuilConfirme: false });
    expect(r.aVerifier).toBe(true);
    expect(rappelMiseAJour(r, DATE)?.aVerifier).toBe(true);
    expect(codeDe(() => detecterChangements(avant, apres, { seuilPdb: -1, seuilConfirme: true }))).toBe('entree_invalide');
    expect(codeDe(() => detecterChangements(avant, apres, { seuilPdb: 10001, seuilConfirme: true }))).toBe('entree_invalide');
    expect(codeDe(() => detecterChangements(avant, [p('pers-a', 8000)], SEUIL))).toBe('entree_invalide');
    expect(codeDe(() => rappelMiseAJour(detecterChangements(avant, apres, SEUIL), '12/11/2026'))).toBe('entree_invalide');
  });

  it('zero-envoi', () => {
    const r = rappelMiseAJour(detecterChangements([p('pers-a', 7500), p('pers-b', 2500)], [p('pers-a', 8000), p('pers-b', 2000)], SEUIL), DATE);
    expect(r?.envoi).toBe('aucun');
    expect(Object.keys(r ?? {}).sort()).toEqual(['aVerifier', 'date', 'envoi', 'personnes', 'type']);
    expect(JSON.stringify(r)).not.toMatch(/@|adresse|nom|texte|http/i);
  });
});
