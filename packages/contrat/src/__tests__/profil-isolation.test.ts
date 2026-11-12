import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../openapi.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';

describe('profil : isolation par société', () => {
  it('chemins-prefixes-dans-l-openapi', () => {
    const chemins = Object.keys((genererOpenapi() as { paths: Record<string, unknown> }).paths);
    const sansPrefixe = chemins.filter((c) => /^\/profil(\/champs|\/changements)?(\/|$)/.test(c) && !c.startsWith('/profil/regimes'));
    expect(sansPrefixe).toEqual([]);
    for (const attendu of ['/profil', '/profil/champs/{cle}', '/profil/champs/{cle}/confirmer', '/profil/changements/apercu', '/profil/changements']) {
      expect(chemins).toContain(PREFIXE_ROUTES_SOCIETE + attendu);
    }
  });
});
