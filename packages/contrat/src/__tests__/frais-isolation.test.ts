import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../openapi.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';

const SUFFIXES = ['/frais', '/frais/{id}', '/frais/valider', '/frais/{id}/proposer', '/remboursements', '/vehicules', '/parametres/bareme_ik_voiture'];

describe('frais, véhicules, barème : isolation par société', () => {
  it('prefixe-dans-openapi', () => {
    const chemins = Object.keys((genererOpenapi() as { paths: Record<string, unknown> }).paths);
    expect(chemins.filter((c) => /^\/(frais|remboursements|vehicules|parametres\/bareme_ik_voiture)(\/|$)/.test(c))).toEqual([]);
    for (const attendu of SUFFIXES) expect(chemins).toContain(PREFIXE_ROUTES_SOCIETE + attendu);
  });
});
