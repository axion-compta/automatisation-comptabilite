import { describe, expect, it } from 'vitest';
import { ErreurChat } from '../types.js';
import { classerVolume, verifierLimites, type Demande, type Evenement, type Limites, type Seuils } from '../volumes.js';

const S: Seuils = { annonce: 3, recapitulatif: 6, maxProposition: 20, renvoiEcran: 40 };
const L: Limites = { fenetrePropositionsMs: 60_000, maxPropositions: 10, fenetreObjetsMs: 3_600_000, maxObjets: 200 };
const NOW = 10_000_000;
const D: Demande = { personne: 'anna', societe: 'soc_a', objets: 1 };
const ev = (horodatageMs: number, o: Partial<Evenement> = {}): Evenement => ({ horodatageMs, personne: 'anna', societe: 'soc_a', objets: 1, ...o });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChat ? e.code : 'autre';
  }
  return undefined;
};
const dix = (o: Partial<Evenement> = {}) => Array.from({ length: 10 }, (_, i) => ev(NOW - 1000 - i, o));

describe('volumes du chat', () => {
  it('classes-de-volume', () => {
    expect(classerVolume(0, S)).toBe('simple');
    expect(classerVolume(4, S)).toBe('annonce');
    expect(classerVolume(10, S)).toBe('recapitulatif');
    expect(classerVolume(30, S)).toBe('renvoi_ecran');
  });
  it('bornes-exactes', () => {
    expect(classerVolume(S.annonce - 1, S)).toBe('simple');
    expect(classerVolume(S.annonce, S)).toBe('annonce');
    expect(classerVolume(S.recapitulatif - 1, S)).toBe('annonce');
    expect(classerVolume(S.recapitulatif, S)).toBe('recapitulatif');
    expect(classerVolume(S.maxProposition, S)).toBe('recapitulatif');
    expect(classerVolume(S.maxProposition + 1, S)).toBe('renvoi_ecran');
    const egaux = { ...S, renvoiEcran: S.maxProposition };
    expect(classerVolume(egaux.renvoiEcran, egaux)).toBe('renvoi_ecran');
  });
  it('au-dessus-du-plafond-renvoi', () => {
    expect(classerVolume(S.maxProposition + 1, { ...S, renvoiEcran: S.renvoiEcran * 2 })).toBe('renvoi_ecran');
    expect(classerVolume(S.renvoiEcran + 100, S)).toBe('renvoi_ecran');
  });
  it('seuils-invalides', () => {
    const mauvais = [
      { ...S, annonce: S.recapitulatif }, { ...S, recapitulatif: S.maxProposition + 1 },
      { ...S, maxProposition: S.renvoiEcran + 1 }, { ...S, annonce: Number.NaN },
      { ...S, renvoiEcran: Number.POSITIVE_INFINITY }, { ...S, annonce: 2.5 }, { ...S, annonce: -1 },
    ];
    for (const s of mauvais) expect(code(() => classerVolume(1, s))).toBe('parametre_invalide');
    for (const n of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(code(() => classerVolume(n, S))).toBe('parametre_invalide');
  });
  it('onzieme-proposition-refusee', () => {
    expect(verifierLimites(dix().slice(0, 9), D, NOW, L)).toEqual({ permis: true });
    expect(verifierLimites(dix(), D, NOW, L)).toEqual({ permis: false, code: 'trop_de_demandes' });
  });
  it('decoupage-ne-passe-pas', () => {
    const histo: Evenement[] = [];
    let refusee = 0;
    for (let i = 1; i <= 9; i++) {
      const demande = { ...D, objets: 24 };
      const v = verifierLimites(histo, demande, NOW, L);
      if (!v.permis) {
        refusee = i;
        expect(v.code).toBe('volume_trop_grand');
        break;
      }
      histo.push(ev(NOW - 120_000 + i, { objets: 24 }));
    }
    expect(refusee).toBe(9);
  });
  it('fenetre-glisse', () => {
    const exact = dix().map((e) => ({ ...e, horodatageMs: NOW - L.fenetrePropositionsMs }));
    expect(verifierLimites(exact, D, NOW, L)).toEqual({ permis: true });
    const dedans = dix().map((e) => ({ ...e, horodatageMs: NOW - L.fenetrePropositionsMs + 1 }));
    expect(verifierLimites(dedans, D, NOW, L)).toEqual({ permis: false, code: 'trop_de_demandes' });
    const gros = [ev(NOW - L.fenetreObjetsMs, { objets: L.maxObjets })];
    expect(verifierLimites(gros, D, NOW, L)).toEqual({ permis: true });
    expect(verifierLimites([ev(NOW - L.fenetreObjetsMs + 1, { objets: L.maxObjets })], D, NOW, L)).toEqual({ permis: false, code: 'volume_trop_grand' });
    expect(verifierLimites([ev(NOW, { objets: L.maxObjets - 1 })], D, NOW, L)).toEqual({ permis: true });
    expect(verifierLimites([ev(NOW + 1, { objets: L.maxObjets })], D, NOW, L)).toEqual({ permis: true });
  });
  it('autre-personne-non-comptee', () => {
    expect(verifierLimites(dix({ personne: 'bruno' }), D, NOW, L)).toEqual({ permis: true });
  });
  it('autre-societe-non-comptee', () => {
    expect(verifierLimites(dix({ societe: 'soc_b' }), D, NOW, L)).toEqual({ permis: true });
  });
  it('historique-vide', () => {
    expect(verifierLimites([], D, NOW, L)).toEqual({ permis: true });
    expect(verifierLimites([], { ...D, objets: L.maxObjets }, NOW, L)).toEqual({ permis: true });
    expect(verifierLimites([], { ...D, objets: L.maxObjets + 1 }, NOW, L)).toEqual({ permis: false, code: 'volume_trop_grand' });
    expect(code(() => verifierLimites([], D, Number.NaN, L))).toBe('parametre_invalide');
    expect(code(() => verifierLimites([], D, NOW, { ...L, fenetreObjetsMs: 0 }))).toBe('parametre_invalide');
    expect(code(() => verifierLimites([], { ...D, objets: 1.5 }, NOW, L))).toBe('parametre_invalide');
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, -1, 2.5]) {
      expect(code(() => verifierLimites([ev(NOW - 1, { objets: 500 }), ev(NOW - 2, { objets: mauvais })], { ...D, objets: 24 }, NOW, L))).toBe('parametre_invalide');
      expect(code(() => verifierLimites([ev(mauvais)], D, NOW, L))).toBe('parametre_invalide');
    }
  });
});
