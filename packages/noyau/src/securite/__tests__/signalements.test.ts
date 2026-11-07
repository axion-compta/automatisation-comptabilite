import { describe, expect, it } from 'vitest';
import { rapportOutilErreurs, signalementsAPurger } from '../signalements.js';
import { ErreurSecurite } from '../types.js';

const JOUR = 86_400_000;
const FENETRE = 10 * JOUR;
const MAINTENANT = 1_800_000_000_000;
const age = (id: string, ms: number) => ({ id, creeLe: MAINTENANT - ms });
const UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('securite/signalements - purge', () => {
  it('duree-plus-un-jour-purge', () => {
    const r = signalementsAPurger([age('a', FENETRE + JOUR)], MAINTENANT, FENETRE);
    expect(r).toEqual({ aPurger: ['a'], illisibles: [] });
  });

  it('duree-moins-un-jour-present', () => {
    expect(signalementsAPurger([age('a', FENETRE - JOUR)], MAINTENANT, FENETRE).aPurger).toEqual([]);
  });

  it('frontiere-exacte-presente', () => {
    expect(signalementsAPurger([age('a', FENETRE)], MAINTENANT, FENETRE).aPurger).toEqual([]);
    expect(signalementsAPurger([age('a', FENETRE + 1)], MAINTENANT, FENETRE).aPurger).toEqual(['a']);
  });

  it('duree-absente-refusee', () => {
    const f = () => signalementsAPurger([age('a', FENETRE * 2)], MAINTENANT, undefined);
    expect(f).toThrow(ErreurSecurite);
    expect(f).toThrow('paramètre de conservation absent');
    try { f(); } catch (e) { expect((e as ErreurSecurite).code).toBe('argument_invalide'); }
  });

  it('duree-invalide-refusee', () => {
    for (const v of [Number.NaN, Infinity, -Infinity, -1, 1.5, '5' as unknown as number, null as unknown as number]) {
      expect(() => signalementsAPurger([], MAINTENANT, v)).toThrow(ErreurSecurite);
    }
    expect(() => signalementsAPurger([], 'pas une date', FENETRE)).toThrow(ErreurSecurite);
    expect(signalementsAPurger([], MAINTENANT, 0)).toEqual({ aPurger: [], illisibles: [] });
  });

  it('date-illisible-a-part', () => {
    const entree = [
      { id: 'x', creeLe: 'n importe quoi' },
      { id: 'y', creeLe: Number.NaN },
      { id: 'z', creeLe: new Date('invalide') },
      { id: 'w', creeLe: null as unknown as string },
      age('v', FENETRE * 2),
      age('v', FENETRE * 2),
      age('futur', -JOUR),
    ];
    const copie = JSON.stringify(entree);
    const r = signalementsAPurger(entree, new Date(MAINTENANT), FENETRE);
    expect(r.illisibles).toEqual(['x', 'y', 'z', 'w']);
    expect(r.aPurger).toEqual(['v', 'v']);
    expect(JSON.stringify(entree)).toBe(copie);
  });
});

describe('securite/signalements - rapport', () => {
  it('rapport-trois-champs-seulement', () => {
    const source = {
      correlation_id: UUID, route: '/factures/{id}', code: 'ERREUR_X', montant: 'montant 1234', tiers: 'Société A',
      iban: 'FR00 0000 0000 0000 0000 0000 000', corps: { nom: 'Alice Exemple', mail: 'a@exemple.fr' },
    };
    const r = rapportOutilErreurs(source);
    expect(Object.keys(r).sort()).toEqual(['code', 'correlation_id', 'route']);
    expect(r).toEqual({ correlation_id: UUID, route: '/factures/{id}', code: 'ERREUR_X' });
    const s = JSON.stringify(r);
    for (const m of ['1234', 'Société', 'FR00', 'Alice', 'exemple.fr']) expect(s).not.toContain(m);
    expect(rapportOutilErreurs(null)).toEqual({ correlation_id: 'inconnu', route: '', code: '' });
    expect(rapportOutilErreurs('texte')).toEqual({ correlation_id: 'inconnu', route: '', code: '' });
    expect(rapportOutilErreurs({ route: 5, code: [1], correlation_id: {} })).toEqual({ correlation_id: 'inconnu', route: '', code: '' });
  });

  it('correlation-mal-formee-inconnu', () => {
    for (const c of ['', 'abc', `${UUID}x`, `x${UUID}`, UUID.replace('-', '_'), 'Alice Exemple', UUID.replace('1', 'g')]) {
      expect(rapportOutilErreurs({ correlation_id: c }).correlation_id).toBe('inconnu');
    }
    expect(rapportOutilErreurs({ correlation_id: UUID.toUpperCase() }).correlation_id).toBe(UUID.toUpperCase());
  });

  it('route-nettoyee', () => {
    expect(rapportOutilErreurs({ route: '/a b/{c}?x=é;<>' }).route).toBe('/ab/{c}x');
    expect(rapportOutilErreurs({ route: '/v_Z/9.a-b' }).route).toBe('/v_Z/9.a-b');
    expect(rapportOutilErreurs({ code: 'ERR-12 é_ok' }).code).toBe('ERR_ok');
    expect(rapportOutilErreurs({ code: 'AZaz_' }).code).toBe('AZaz_');
  });
});
