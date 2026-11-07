import { describe, expect, it } from 'vitest';
import { ErreurChat, POLES, type Pole } from '../../chat/types.js';
import { consolider, verifierPropriete, type Constat } from '../hierarchie.js';

const TABLE: Record<string, Pole> = {
  ecart_balance: 'comptabilite', tva_incoherente: 'fiscalite', clause_manquante: 'juridique', donnee_exposee: 'rgpd_securite',
};
const TYPES = Object.keys(TABLE);
const c = (id: string, gravite: Constat['gravite'], type = 'ecart_balance', plus: Partial<Constat> = {}): Constat => ({ id, type, gravite, ...plus });
const code = (f: () => unknown): unknown => { try { f(); } catch (e) { return e instanceof ErreurChat ? e.code : 'autre'; } return 'aucune'; };

describe('hiérarchie des pôles', () => {
  it('table-complete', () => {
    expect(verifierPropriete(TYPES, TABLE)).toEqual({ sansProprietaire: [], poleInconnu: [] });
    expect(new Set(Object.values(TABLE))).toEqual(new Set(POLES));
  });

  it('type-sans-proprietaire-rouge', () => {
    expect(verifierPropriete([...TYPES, 'orphelin', 'constructor'], TABLE).sansProprietaire).toEqual(['orphelin', 'constructor']);
    expect(code(() => consolider([c('a', 'info', 'orphelin')], TABLE))).toBe('parametre_invalide');
    expect(code(() => consolider([c('a', 'info', 'constructor')], TABLE))).toBe('parametre_invalide');
  });

  it('pole-inconnu-rouge', () => {
    const mauvaise = { ...TABLE, bizarre: 'cuisine' } as unknown as Record<string, Pole>;
    expect(verifierPropriete(TYPES, mauvaise).poleInconnu).toEqual(['bizarre']);
    expect(code(() => consolider([c('a', 'info', 'bizarre')], mauvaise))).toBe('parametre_invalide');
    expect(code(() => consolider([c('a', 'info', 'ecart_balance', { pole: 'fiscalite' })], TABLE))).toBe('parametre_invalide');
    expect(consolider([c('a', 'info', 'ecart_balance', { pole: 'comptabilite' })], TABLE).constats).toHaveLength(1);
    expect(code(() => consolider([{ ...c('a', 'info'), gravite: 'rose' as never }], TABLE))).toBe('parametre_invalide');
  });

  it('tri-par-gravite-puis-id', () => {
    const r = consolider([c('b', 'info'), c('c', 'mineur'), c('a', 'info'), c('z', 'critique'), c('m', 'majeur'), c('d', 'critique')], TABLE);
    expect(r.constats.map((x) => x.id)).toEqual(['d', 'z', 'm', 'c', 'a', 'b']);
  });

  it('quarante-bloquants-escalades', () => {
    const liste: Constat[] = [];
    for (let i = 0; i < 40; i += 1) liste.push(c(`b${String(i).padStart(2, '0')}`, 'critique', TYPES[i % TYPES.length]));
    liste.push(c('autre', 'majeur'), c('autre2', 'info'));
    const r = consolider(liste, TABLE);
    expect(r.escalades).toHaveLength(40);
    for (const e of r.escalades) {
      const origine = liste.find((x) => x.id === e.id) as Constat;
      expect(e.pole).toBe(TABLE[origine.type]);
      expect(e.vers).toBe('utilisateur');
    }
    for (const p of POLES) expect(r.escalades.filter((e) => e.pole === p)).toHaveLength(10);
    expect(r.escalades.some((e) => e.id.startsWith('autre'))).toBe(false);
  });

  it('refus-du-chef-a-verifier', () => {
    const r = consolider([c('b', 'mineur', 'tva_incoherente', { refusParChef: true }), c('a', 'critique', 'ecart_balance', { refusParChef: true }), c('c', 'info', 'ecart_balance', { refusParChef: false })], TABLE);
    expect(r.a_verifier).toEqual(['a', 'b']);
    expect(r.escalades.map((e) => e.id)).toEqual(['a']);
  });

  it('id-en-double-refuse', () => {
    expect(code(() => consolider([c('a', 'info'), c('a', 'critique')], TABLE))).toBe('parametre_invalide');
  });

  it('aucun-effet', () => {
    const entree = [c('a', 'critique'), c('b', 'info')];
    const avant = JSON.stringify(entree);
    const r = consolider(entree, TABLE);
    expect(r.effets).toEqual([]);
    expect(r.effets).toHaveLength(0);
    expect(JSON.stringify(entree)).toBe(avant);
  });

  it('liste-vide', () => {
    expect(consolider([], TABLE)).toEqual({ constats: [], escalades: [], a_verifier: [], effets: [] });
    expect(verifierPropriete([], {})).toEqual({ sansProprietaire: [], poleInconnu: [] });
  });

  it('ordre-d-entree-sans-effet', () => {
    const liste = [c('d', 'info'), c('a', 'critique', 'donnee_exposee', { refusParChef: true }), c('c', 'majeur'), c('b', 'critique', 'tva_incoherente'), c('e', 'mineur', 'clause_manquante', { refusParChef: true })];
    expect(consolider([...liste].reverse(), TABLE)).toEqual(consolider(liste, TABLE));
  });
});
