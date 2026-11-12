import { describe, expect, it } from 'vitest';
import { DOMAINES_SANS_PREFIXE } from '../domaines-sans-prefixe.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';
import { contrat, contratChat } from '../routes.js';

type Noeud = { '~orpc'?: { route: { path?: string } } };
function chemins(n: unknown, sortie: string[] = []): string[] {
  const noeud = n as Noeud | null;
  if (noeud !== null && typeof noeud === 'object' && noeud['~orpc'] !== undefined) {
    sortie.push(noeud['~orpc'].route.path ?? '');
  } else if (noeud !== null && typeof noeud === 'object') {
    for (const v of Object.values(noeud)) chemins(v, sortie);
  }
  return sortie;
}
const tout: Record<string, unknown> = { ...contrat, ...contratChat };
const exemptes: readonly string[] = DOMAINES_SANS_PREFIXE;

describe('cliquet du préfixe des routes', () => {
  it('toutes-les-routes-prefixees', () => {
    const fautives: string[] = [];
    for (const [cle, domaine] of Object.entries(tout)) {
      if (exemptes.includes(cle)) continue;
      const lot = chemins(domaine);
      expect(lot.length).toBeGreaterThan(0);
      for (const c of lot) if (!c.startsWith(PREFIXE_ROUTES_SOCIETE + '/')) fautives.push(`${cle} ${c}`);
    }
    expect(fautives).toEqual([]);
  });

  it('aucun-double-prefixe', () => {
    for (const [cle, domaine] of Object.entries(tout)) {
      for (const c of chemins(domaine)) {
        expect(c.split('/societes/').length - 1, `${cle} ${c}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('liste-sans-doublon-ni-cle-inconnue', () => {
    expect(new Set(exemptes).size).toBe(exemptes.length);
    for (const cle of exemptes) expect(Object.keys(contrat), cle).toContain(cle);
  });
});
