import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { actionChangement, validerOffre } from '../offre.js';
import { creerServiceOffreMemoire } from '../offre-memoire.js';
import { ErreurAbonnement } from '../types.js';

const BASE = {
  palier: 'compta-2', quotaCompris: 300, quotaUtilise: 12, uniteQuota: 'unite-test', libreService: true,
  modeIa: 'axion', modesArrivee: ['depot', 'courriel'],
};
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
};
const avec = (o: Record<string, unknown>): Record<string, unknown> => ({ ...BASE, ...o });

describe('validerOffre', () => {
  it('accepte une offre valide et recopie les modes', () => {
    const r = validerOffre(BASE);
    expect(r).toEqual(BASE);
    expect(r.modesArrivee).not.toBe(BASE.modesArrivee);
  });
  it.each(['pri' + 'x', 'mont' + 'ant', 'tar' + 'if', 'mar' + 'ge', 'autre'])('refuse la clé inconnue %s', (k) => {
    expect(code(() => validerOffre(avec({ [k]: 1 })))).toBe('champ_inconnu');
  });
  it.each([undefined, null, 'x', 3, []])('refuse une entrée non objet %j', (v) => {
    expect(code(() => validerOffre(v))).toBe('parametre_invalide');
  });
  it.each(['true', 1, 0, null, undefined])('refuse libreService non booléen %j', (v) => {
    expect(code(() => validerOffre(avec({ libreService: v })))).toBe('parametre_invalide');
  });
  it('accepte libreService false', () => {
    expect(validerOffre(avec({ libreService: false })).libreService).toBe(false);
  });
  it.each(['Axion', 'direct', '', 1, undefined])('refuse modeIa %j', (v) => {
    expect(code(() => validerOffre(avec({ modeIa: v })))).toBe('parametre_invalide');
  });
  it('accepte client_direct', () => {
    expect(validerOffre(avec({ modeIa: 'client_direct' })).modeIa).toBe('client_direct');
  });
  it.each([-1, 1.5, NaN, Infinity, '3', undefined])('refuse un quota invalide %j', (v) => {
    expect(code(() => validerOffre(avec({ quotaCompris: v })))).toBe('entier_invalide');
    expect(code(() => validerOffre(avec({ quotaUtilise: v })))).toBe('entier_invalide');
  });
  it('accepte 0 et un quota utilisé supérieur au compris', () => {
    expect(validerOffre(avec({ quotaCompris: 0, quotaUtilise: 5 })).quotaUtilise).toBe(5);
  });
  it.each(['', '  ', 1, undefined])('refuse palier ou unité invalide %j', (v) => {
    expect(code(() => validerOffre(avec({ palier: v })))).toBe('parametre_invalide');
    expect(code(() => validerOffre(avec({ uniteQuota: v })))).toBe('parametre_invalide');
  });
  it.each([[[]], [['a', 'a']], [['']], ['depot'], [undefined], [[1]]])('refuse des modes d arrivée %j', (v) => {
    expect(code(() => validerOffre(avec({ modesArrivee: v })))).toBe('parametre_invalide');
  });
});

describe('actionChangement', () => {
  it('rend lien_portail si le client peut changer seul', () => {
    expect(actionChangement(validerOffre(BASE))).toBe('lien_portail');
  });
  it('rend demande_palier sinon', () => {
    expect(actionChangement(validerOffre(avec({ libreService: false })))).toBe('demande_palier');
  });
  it('est fermé par défaut sans offre lue', () => {
    expect(actionChangement(null)).toBe('demande_palier');
    expect(actionChangement(undefined)).toBe('demande_palier');
  });
});

describe('faux service d offre en mémoire', () => {
  it('rend null sans offre (refus fermé)', async () => {
    const s = creerServiceOffreMemoire();
    const o = await s.lire('inconnu');
    expect(o).toBeNull();
    expect(actionChangement(o)).toBe('demande_palier');
  });
  it('rend l offre validée', async () => {
    const s = creerServiceOffreMemoire({ c1: BASE });
    expect(await s.lire('c1')).toEqual(BASE);
  });
  it('refuse une offre invalide, comme validerOffre', () => {
    const s = creerServiceOffreMemoire();
    expect(code(() => s.definir('c1', avec({ libreService: 'true' })))).toBe('parametre_invalide');
    expect(code(() => s.definir('c1', avec({ ['pri' + 'x']: 1 })))).toBe('champ_inconnu');
    expect(code(() => creerServiceOffreMemoire({ c1: avec({ modeIa: 'x' }) }))).toBe('parametre_invalide');
  });
  it('permet de remplacer une offre', async () => {
    const s = creerServiceOffreMemoire({ c1: BASE });
    s.definir('c1', avec({ libreService: false }));
    expect((await s.lire('c1'))?.libreService).toBe(false);
  });
});

describe('source sans prix ni paiement', () => {
  const mots = ['pri' + 'x', 'tar' + 'if', 'mar' + 'ge', 'str' + 'ipe', '€', 'pièces'];
  it.each(['../offre.ts', '../offre-memoire.ts'])('%s ne contient aucun mot interdit', (f) => {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8').toLowerCase();
    for (const m of mots) expect(src).not.toContain(m);
  });
});
