import { describe, expect, it } from 'vitest';
import { calculerSante, pire, type EntreeSante, type SeuilsSante } from '../sante.js';

const S: SeuilsSante = {
  banque: { orange: 500, rouge: 2000 },
  cas: { orange: 3, rouge: 10 },
  fraicheur: { orange: 7, rouge: 30 },
  tva: { orange: 1, rouge: 4 },
  controles: { orange: 2, rouge: 6 },
};
const E: EntreeSante = {
  lignesBanque: { total: 40, justifiees: 40 }, casOuverts: 0, joursDepuisReleve: 1, joursDepuisPiece: 2,
  tvaB: 0, tvaM: 0, controlesB: 0, controlesM: 0,
};
const sante = (plus: Partial<EntreeSante> = {}, s: SeuilsSante = S) => calculerSante({ ...E, ...plus }, s);
const couleurs = (r: ReturnType<typeof sante>) => r.sousIndicateurs.map((x) => x.couleur);
const code = (f: () => unknown) => { try { f(); } catch (e) { return (e as { code?: string }).code; } return undefined; };

describe('santé', () => {
  it('CT-42', () => {
    const r = sante({ casOuverts: 3 });
    expect(couleurs(r)).toEqual(['vert', 'orange', 'vert', 'vert', 'vert']);
    expect(r.globale).toBe('orange');
    expect(sante().globale).toBe('vert');
    expect(pire(['vert', 'rouge', 'orange'])).toBe('rouge');
    expect(pire(['orange', 'vert'])).toBe('orange');
    expect(pire([])).toBe('vert');
  });

  it('un-b-ouvert-rouge', () => {
    for (const plus of [{ tvaB: 1 }, { controlesB: 1 }]) {
      const r = sante(plus);
      expect(r.globale).toBe('rouge');
      expect(couleurs(r).filter((c) => c === 'rouge')).toHaveLength(1);
    }
    expect(sante({ tvaM: 1 }).sousIndicateurs[3]).toEqual({ code: 'tva', couleur: 'orange', valeur: 1 });
    expect(sante({ tvaB: 1, tvaM: 1 }).sousIndicateurs[3]?.valeur).toBe(2);
    expect(sante({ controlesB: 1, controlesM: 2 }).sousIndicateurs[4]?.valeur).toBe(3);
  });

  it('fraicheur-inconnue-rouge', () => {
    for (const plus of [{ joursDepuisReleve: null }, { joursDepuisPiece: null }, { joursDepuisReleve: null, joursDepuisPiece: null }]) {
      expect(sante(plus).sousIndicateurs[2]).toEqual({ code: 'fraicheur', couleur: 'rouge', valeur: null });
    }
    expect(sante({ joursDepuisReleve: 8, joursDepuisPiece: 1 }).sousIndicateurs[2]).toEqual({ code: 'fraicheur', couleur: 'orange', valeur: 8 });
    expect(sante({ joursDepuisReleve: 1, joursDepuisPiece: 8 }).sousIndicateurs[2]?.valeur).toBe(8);
  });

  it('banque-sans-ligne', () => {
    expect(sante({ lignesBanque: { total: 0, justifiees: 0 } }).sousIndicateurs[0]).toEqual({ code: 'banque', couleur: 'vert', valeur: null });
    expect(sante({ lignesBanque: { total: 3, justifiees: 2 } }).sousIndicateurs[0]?.valeur).toBe(6666);
    expect(sante({ lignesBanque: { total: 40, justifiees: 40 } }).sousIndicateurs[0]?.valeur).toBe(10000);
  });

  it('seuils-exacts', () => {
    const val = (plus: Partial<EntreeSante>, i: number) => sante(plus).sousIndicateurs[i]?.couleur;
    expect(val({ casOuverts: 2 }, 1)).toBe('vert');
    expect(val({ casOuverts: 3 }, 1)).toBe('orange');
    expect(val({ casOuverts: 9 }, 1)).toBe('orange');
    expect(val({ casOuverts: 10 }, 1)).toBe('rouge');
    expect(val({ joursDepuisReleve: 6 }, 2)).toBe('vert');
    expect(val({ joursDepuisReleve: 7 }, 2)).toBe('orange');
    expect(val({ joursDepuisReleve: 30 }, 2)).toBe('rouge');
    expect(val({ tvaM: 3 }, 3)).toBe('orange');
    expect(val({ tvaM: 4 }, 3)).toBe('rouge');
    expect(val({ controlesM: 1 }, 4)).toBe('vert');
    expect(val({ controlesM: 2 }, 4)).toBe('orange');
    expect(val({ controlesM: 6 }, 4)).toBe('rouge');
    // banque : 5 % non justifié = seuil orange, 20 % = seuil rouge
    expect(val({ lignesBanque: { total: 100, justifiees: 96 } }, 0)).toBe('vert');
    expect(val({ lignesBanque: { total: 100, justifiees: 95 } }, 0)).toBe('orange');
    expect(val({ lignesBanque: { total: 100, justifiees: 81 } }, 0)).toBe('orange');
    expect(val({ lignesBanque: { total: 100, justifiees: 80 } }, 0)).toBe('rouge');
    expect(val({ lignesBanque: { total: 100, justifiees: 0 } }, 0)).toBe('rouge');
    // orange = rouge : le rouge l'emporte
    expect(sante({ casOuverts: 5 }, { ...S, cas: { orange: 5, rouge: 5 } }).sousIndicateurs[1]?.couleur).toBe('rouge');
  });

  it('ordre-fixe-des-cinq', () => {
    expect(sante().sousIndicateurs.map((x) => x.code)).toEqual(['banque', 'cas', 'fraicheur', 'tva', 'controles']);
    expect(sante({ casOuverts: 12, tvaM: 9 }).sousIndicateurs.map((x) => x.code)).toEqual(['banque', 'cas', 'fraicheur', 'tva', 'controles']);
  });

  it('seuils-invalides', () => {
    for (const k of Object.keys(S) as (keyof SeuilsSante)[]) {
      for (const bad of [{ orange: 5, rouge: 4 }, { orange: NaN, rouge: 4 }, { orange: 1, rouge: Infinity }, { orange: -1, rouge: 4 }, { orange: 1.5, rouge: 4 }]) {
        expect(code(() => sante({}, { ...S, [k]: bad }))).toBe('parametre_invalide');
      }
    }
  });

  it('entrees-invalides', () => {
    const mauvaises: Partial<EntreeSante>[] = [
      { casOuverts: -1 }, { casOuverts: 1.5 }, { casOuverts: NaN }, { tvaB: -1 }, { tvaM: 1.5 }, { controlesB: -1 }, { controlesM: Infinity },
      { joursDepuisReleve: -1 }, { joursDepuisPiece: 1.5 }, { joursDepuisReleve: NaN },
      { lignesBanque: { total: -1, justifiees: 0 } }, { lignesBanque: { total: 5, justifiees: 6 } },
      { lignesBanque: { total: 5, justifiees: -1 } }, { lignesBanque: { total: 5.5, justifiees: 1 } }, { lignesBanque: { total: 5, justifiees: 1.5 } },
    ];
    for (const m of mauvaises) expect(code(() => sante(m))).toBe('entree_invalide');
  });
});
