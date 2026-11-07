import { describe, expect, it } from 'vitest';
import { recevoirEtatVoulu, type EtatAccesCourant } from '../transitions.js';
import { ErreurAbonnement, type EtatAcces, type EtatVoulu } from '../types.js';

const AUJ = '2031-05-10';
const H = '2031-05-10T08:00:00Z';
const ctx = (o: Record<string, unknown> = {}) =>
  ({ horodatage: H, aujourdhui: AUJ, source: 'console', auteur: 'agent-fictif', branche: true, ...o }) as Parameters<typeof recevoirEtatVoulu>[2];
const voulu = (version: number, o: Partial<EtatVoulu> = {}): EtatVoulu => ({ etat: 'actif', version, arretEnvois: false, ...o });
const cour = (etat: EtatAcces, version = 1): EtatAccesCourant => ({ etat, version, recuLe: '2031-05-01T00:00:00Z', source: 'console' });
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
};

describe('abonnement/transitions', () => {
  it('quatre-transitions-quatre-lignes', () => {
    const suite: Array<[EtatVoulu, EtatAcces]> = [
      [voulu(1, { periodeEssaiFin: '2031-06-01' }), 'ESSAI'], [voulu(2), 'ACTIF'],
      [voulu(3, { etat: 'pause' }), 'LECTURE_SEULE'], [voulu(4, { etat: 'arrete' }), 'SUSPENDU'],
    ];
    let c: EtatAccesCourant | null = null;
    const journal: unknown[] = [];
    for (const [v, attendu] of suite) {
      const r = recevoirEtatVoulu(c, v, ctx());
      expect(r.courant?.etat).toBe(attendu);
      journal.push(...r.evenements);
      c = r.courant;
    }
    expect(journal).toEqual([
      { type: 'acces.etat_change', horodatage: H, donnees: { ancien: null, nouveau: 'ESSAI', source: 'console', auteur: 'agent-fictif', version: 1 } },
      { type: 'acces.etat_change', horodatage: H, donnees: { ancien: 'ESSAI', nouveau: 'ACTIF', source: 'console', auteur: 'agent-fictif', version: 2 } },
      { type: 'acces.etat_change', horodatage: H, donnees: { ancien: 'ACTIF', nouveau: 'LECTURE_SEULE', source: 'console', auteur: 'agent-fictif', version: 3 } },
      { type: 'acces.etat_change', horodatage: H, donnees: { ancien: 'LECTURE_SEULE', nouveau: 'SUSPENDU', source: 'console', auteur: 'agent-fictif', version: 4 } },
    ]);
  });

  it('version-ancienne-ignoree', () => {
    const c = cour('ACTIF', 8);
    const r = recevoirEtatVoulu(c, voulu(7, { etat: 'pause' }), ctx());
    expect(r.courant).toBe(c);
    expect(r.reprise).toBe(false);
    expect(r.evenements).toEqual([{ type: 'acces.version_ignoree', horodatage: H, donnees: { recue: 7, connue: 8 } }]);
    for (const v of [Number.NaN, 7.5, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(code(() => recevoirEtatVoulu(c, voulu(v), ctx()))).toBe('etat_voulu_invalide');
    }
  });

  it('version-egale-ignoree', () => {
    const c = cour('ACTIF', 8);
    const r = recevoirEtatVoulu(c, voulu(8, { etat: 'arrete' }), ctx());
    expect(r.courant).toBe(c);
    expect(r.evenements).toHaveLength(1);
    expect(r.evenements[0]?.type).toBe('acces.version_ignoree');
  });

  it('reglage-local-ignore-apres-branchement', () => {
    const c = cour('ACTIF', 2);
    const r = recevoirEtatVoulu(c, voulu(3, { etat: 'pause' }), ctx({ source: 'reglage_local' }));
    expect(r.courant).toBe(c);
    expect(r.evenements).toEqual([{ type: 'acces.reglage_local_ignore', horodatage: H, donnees: { version: 3, auteur: 'agent-fictif' } }]);
    expect(code(() => recevoirEtatVoulu(c, voulu(3), ctx({ source: 'reglage_local', auteur: ' ' })))).toBe('auteur_manquant');
  });

  it('reglage-local-applique-avant-branchement', () => {
    const r = recevoirEtatVoulu(null, voulu(1, { etat: 'pause' }), ctx({ source: 'reglage_local', branche: false }));
    expect(r.courant).toEqual({ etat: 'LECTURE_SEULE', version: 1, recuLe: H, source: 'reglage_local' });
    expect(r.evenements).toHaveLength(1);
    expect(r.evenements[0]?.donnees).toMatchObject({ ancien: null, nouveau: 'LECTURE_SEULE', source: 'reglage_local' });
  });

  it('meme-etat-sans-evenement', () => {
    const r = recevoirEtatVoulu(cour('ACTIF', 1), voulu(2), ctx());
    expect(r.evenements).toEqual([]);
    expect(r.courant).toEqual({ etat: 'ACTIF', version: 2, recuLe: H, source: 'console' });
    expect(r.reprise).toBe(false);
  });

  it('reprise-seulement-depuis-pause-ou-suspendu', () => {
    const anciens: EtatAcces[] = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE'];
    const nouveaux: Array<[EtatAcces, Partial<EtatVoulu>]> = [
      ['ESSAI', { periodeEssaiFin: '2031-06-01' }], ['ACTIF', {}], ['DELAI_DE_GRACE', { impayeSignale: true }],
      ['LECTURE_SEULE', { etat: 'pause' }], ['SUSPENDU', { etat: 'arrete' }], ['RESILIE', { etat: 'arrete', dateFin: '2031-05-09' }],
    ];
    // lignes = anciens, colonnes = nouveaux, écrits à la main
    const attendu = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0],
      [1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];
    anciens.forEach((a, i) => nouveaux.forEach(([n, o], j) => {
      const r = recevoirEtatVoulu(cour(a), voulu(2, o), ctx());
      expect(r.courant?.etat).toBe(n);
      expect(r.reprise, `${a}->${n}`).toBe(attendu[i]?.[j] === 1);
    }));
  });

  it('entrees-non-modifiees', () => {
    const c = Object.freeze(cour('SUSPENDU', 1));
    const v = Object.freeze(voulu(2, { droitsUsage: Object.freeze(['lecture']) as unknown as string[] }));
    const x = Object.freeze(ctx());
    const avant = JSON.stringify([c, v, x]);
    expect(() => recevoirEtatVoulu(c, v, x)).not.toThrow();
    expect(() => recevoirEtatVoulu(Object.freeze(cour('ACTIF', 5)), Object.freeze(voulu(4)), x)).not.toThrow();
    expect(JSON.stringify([c, v, x])).toBe(avant);
  });
});
