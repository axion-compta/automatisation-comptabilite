import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { appliquer, creerProposition, expirer, refuser, type Proposition } from '../proposition.js';
import { ErreurChat, type Acteur, type Niveau } from '../types.js';

const T0 = '2030-01-01T00:00:00.000Z';
const DUREE = 60_000;
const EXPIRE = '2030-01-01T00:01:00.000Z';
const AVANT_EXPIRE = '2030-01-01T00:00:59.999Z';

const base = (o: Partial<Parameters<typeof creerProposition>[0]> = {}) =>
  creerProposition({
    id: 'prop_a', outil: 'proposer_validation', niveau: 'B', cibles: ['ec_1', 'ec_2'],
    avant: { etat: 'brouillon' }, apres: { etat: 'valide' }, creeLe: T0, dureeMs: DUREE, ...o,
  });
const ctx = (o: Partial<Parameters<typeof appliquer>[1]> = {}) => ({
  acteur: 'personne' as Acteur, cle: 'cle_a', maintenant: T0, niveauIOuvert: false, ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChat ? e.code : 'autre';
  }
  return undefined;
};

describe('proposition du chat', () => {
  it('creation-compte-les-objets', () => {
    const p = base({ montantTotal: 1250 as Centimes });
    expect(p.nombreObjets).toBe(2);
    expect(p.expireLe).toBe(EXPIRE);
    expect(p.etat).toBe('proposee');
    expect(p.montantTotal).toBe(1250);
    expect(base({ cibles: ['x'] }).nombreObjets).toBe(1);
    expect(code(() => base({ cibles: [] }))).toBe('parametre_invalide');
    expect(code(() => base({ creeLe: 'pas une date' }))).toBe('parametre_invalide');
  });
  it('cible-en-double-refusee', () => {
    expect(code(() => base({ cibles: ['a', 'b', 'a'] }))).toBe('parametre_invalide');
  });
  it('duree-invalide', () => {
    for (const d of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => base({ dureeMs: d }))).toBe('parametre_invalide');
    }
    expect(code(() => base({ dureeMs: 1 }))).toBeUndefined();
  });
  it('personne-applique', () => {
    const r = appliquer(base(), ctx());
    expect(r.effet).toBe('applique');
    expect(r.proposition.etat).toBe('appliquee');
  });
  it('compte-service-refuse', () => {
    expect(code(() => appliquer(base(), ctx({ acteur: 'compte_service' })))).toBe('acteur_non_humain');
  });
  it('modele-et-agent-refuses', () => {
    for (const a of ['modele', 'agent', 'systeme', 'inconnu'] as Acteur[]) {
      expect(code(() => appliquer(base(), ctx({ acteur: a })))).toBe('acteur_non_humain');
    }
  });
  it('niveau-i-ferme', () => {
    const p = base({ niveau: 'I' });
    expect(code(() => appliquer(p, ctx()))).toBe('niveau_ferme');
    expect(appliquer(p, ctx({ niveauIOuvert: true })).effet).toBe('applique');
    for (const n of ['L', 'B', 'M'] as Niveau[]) {
      expect(appliquer(base({ niveau: n }), ctx()).effet).toBe('applique');
    }
  });
  it('expire-a-la-milliseconde-pres', () => {
    expect(appliquer(base(), ctx({ maintenant: AVANT_EXPIRE })).effet).toBe('applique');
    expect(code(() => appliquer(base(), ctx({ maintenant: EXPIRE })))).toBe('proposition_expiree');
    expect(code(() => appliquer(base(), ctx({ maintenant: 'invalide' })))).toBe('parametre_invalide');
    expect(expirer(base(), AVANT_EXPIRE).etat).toBe('proposee');
    expect(expirer(base(), EXPIRE).etat).toBe('expiree');
  });
  it('meme-cle-meme-resultat', () => {
    const premier = appliquer(base(), ctx());
    const second = appliquer(premier.proposition, ctx({ maintenant: EXPIRE }));
    expect(second.effet).toBe('deja_applique');
    expect(second.proposition).toEqual(premier.proposition);
  });
  it('autre-cle-refusee', () => {
    const { proposition } = appliquer(base(), ctx());
    expect(code(() => appliquer(proposition, ctx({ cle: 'cle_b' })))).toBe('parametre_invalide');
    expect(code(() => appliquer(base(), ctx({ cle: '' })))).toBe('parametre_invalide');
    for (const etat of ['annulee', 'expiree', 'refusee'] as const) {
      const p: Proposition = { ...base(), etat };
      expect(code(() => appliquer(p, ctx()))).toBe('proposition_inconnue');
    }
    expect(code(() => refuser(proposition))).toBe('proposition_inconnue');
    expect(refuser(base()).etat).toBe('refusee');
  });
  it('aucune-ecriture-avant-le-geste', () => {
    const p = base();
    expect(p.etat).toBe('proposee');
    expect(p.cleApplication).toBeUndefined();
    const r = appliquer(p, ctx());
    expect(p.etat).toBe('proposee');
    expect(r.proposition).not.toBe(p);
    expect(r.proposition.cleApplication).toBe('cle_a');
  });
});
