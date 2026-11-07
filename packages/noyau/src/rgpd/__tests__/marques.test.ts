import { describe, expect, it } from 'vitest';
import { LISIBILITE, USAGES, filtrer, leverLimitation, lisible, poserMarque, type ObjetMarque } from '../marques.js';
import { ErreurRgpd, MARQUES, type Marque } from '../types.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}
const usagesLisibles = (m: Marque[]) => USAGES.filter((u) => lisible(m, u));
const LE = '2026-06-15T10:00:00Z';

describe('marques', () => {
  it('toutes-les-paires-decrites', () => {
    for (const m of MARQUES) for (const u of USAGES) expect(typeof LISIBILITE[m][u]).toBe('boolean');
    expect(Object.keys(LISIBILITE).sort()).toEqual([...MARQUES].sort());
    expect(Object.isFrozen(LISIBILITE)).toBe(true);
    expect(Object.isFrozen(LISIBILITE.limitee)).toBe(true);
  });
  it('sans-marque-tout-lisible', () => {
    expect(usagesLisibles([])).toEqual([...USAGES]);
    expect(filtrer([{ id: 'a' }, { id: 'b', marques: [] }], 'ia')).toHaveLength(2);
    expect(filtrer([], 'ia')).toEqual([]);
  });
  it('a-effacer-masque-et-exclu-de-l-ia', () => {
    expect(usagesLisibles(['a_effacer'])).toEqual(['conservation_legale']);
    expect(lisible(['a_effacer'], 'ia')).toBe(false);
    expect(lisible(['a_effacer'], 'affichage')).toBe(false);
  });
  it('limitee-seulement-conservation-et-fin-de-contrat', () => {
    expect(usagesLisibles(['limitee'])).toEqual(['conservation_legale', 'export_fin_contrat']);
    expect(lisible(['limitee'], 'export_client')).toBe(false);
  });
  it('oubliee-jamais-lue-t-exp-8', () => {
    expect(usagesLisibles(['oubliee'])).toEqual([]);
    const pref = { id: 'pref1', source: 'preference' };
    const { objet, evenement } = poserMarque(pref, 'oubliee', { le: LE, par: 'u1' });
    for (const u of USAGES) expect(filtrer([objet], u)).toEqual([]);
    expect(evenement).toEqual({ type: 'personne.preference_oubliee', horodatage: LE, demandeId: null, donnees: { marque: 'oubliee', par: 'u1' } });
  });
  it('la-plus-restrictive-gagne', () => {
    expect(usagesLisibles(['a_effacer', 'limitee'])).toEqual(['conservation_legale']);
    expect(usagesLisibles(['limitee', 'oubliee'])).toEqual([]);
    expect(code(() => lisible(['inconnue' as Marque], 'ia'))).toBe('marque_inconnue');
    expect(code(() => lisible([], 'inconnu' as never))).toBe('valeur_interdite');
    const p = poserMarque({ id: 'x', marques: ['limitee'] }, 'a_effacer', { le: LE, par: 'u1' });
    expect(p.objet.marques).toEqual(['a_effacer', 'limitee']);
    expect(poserMarque(p.objet, 'limitee', { le: LE, par: 'u1' }).objet.marques).toEqual(['a_effacer', 'limitee']);
    expect(poserMarque({ id: 'x' }, 'limitee', { le: LE, par: 'u1' }).evenement.type).toBe('personne.limitation');
    expect(poserMarque({ id: 'x' }, 'a_effacer', { le: LE, par: 'u1' }).evenement.type).toBe('personne.marque_a_effacer');
    expect(code(() => poserMarque({ id: 'x' }, 'zzz' as Marque, { le: LE, par: 'u1' }))).toBe('marque_inconnue');
    expect(code(() => poserMarque({ id: 'x' }, 'limitee', { le: 'pas une date', par: 'u1' }))).toBe('horodatage_invalide');
  });
  it('oubliee-hors-preference-refusee', () => {
    expect(code(() => poserMarque({ id: 'x', source: 'tiers' }, 'oubliee', { le: LE, par: 'u1' }))).toBe('valeur_interdite');
    expect(code(() => poserMarque({ id: 'x' }, 'oubliee', { le: LE, par: 'u1' }))).toBe('valeur_interdite');
  });
  it('lever-limitation-exige-un-motif', () => {
    const o: ObjetMarque = { id: 'x', marques: ['a_effacer', 'limitee'] };
    for (const motif of ['', '   ', 'x'.repeat(501)]) expect(code(() => leverLimitation(o, { motif }))).toBe('motif_manquant');
    expect(leverLimitation(o, { motif: 'Décision écrite inventée' }).marques).toEqual(['a_effacer']);
    expect(leverLimitation({ id: 'y' } as ObjetMarque, { motif: 'ok' }).marques).toEqual([]);
    expect(o.marques).toEqual(['a_effacer', 'limitee']);
  });
  it('filtrer-ne-modifie-pas-l-entree', () => {
    const liste = [{ id: 'a' }, { id: 'b', marques: ['a_effacer'] as Marque[] }, { id: 'c', marques: ['limitee'] as Marque[] }];
    const copie = JSON.stringify(liste);
    const r = filtrer(liste, 'affichage');
    expect(r.map((o) => o.id)).toEqual(['a']);
    expect(r).not.toBe(liste);
    expect(JSON.stringify(liste)).toBe(copie);
    expect(filtrer(liste, 'conservation_legale').map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
});
