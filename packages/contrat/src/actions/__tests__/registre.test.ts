import { describe, expect, it } from 'vitest';
import { peutAgir, registre, roleAutorise } from '../index.js';

describe("registre d'actions", () => {
  it('le lecteur lit mais ne valide pas', () => {
    expect(peutAgir(registre, 'lecteur', 'lire')).toBe(true);
    expect(peutAgir(registre, 'lecteur', 'valider')).toBe(false);
  });
  it("une action exclue n'est permise à aucun rôle", () => {
    for (const role of registre.roles) expect(peutAgir(registre, role, 'exporter')).toBe(false);
  });
  it('rôle, action et outil inconnus sont refusés', () => {
    expect(peutAgir(registre, 'inconnu', 'lire')).toBe(false);
    expect(peutAgir(registre, 'administrateur', 'inconnue')).toBe(false);
    expect(roleAutorise(registre, 'administrateur', 'outil_inconnu')).toBe(false);
  });
  it('chaque action a un outil ou une exclusion, jamais les deux', () => {
    for (const a of registre.actions) expect(Boolean(a.outil) !== Boolean(a.exclusion)).toBe(true);
  });
});
