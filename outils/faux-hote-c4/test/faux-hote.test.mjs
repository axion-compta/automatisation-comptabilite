import { describe, it, expect } from 'vitest';
import { defineAutomation } from '../contrat.mjs';
import module_ from '../module-vide.mjs';
import { creerBase, migrer, rejouer, verifierJeu } from '../faux-hote.mjs';

function manifeste(surcharge = {}) {
  const jeuEssai = module_.jeuEssai.map((c) => ({ ...c }));
  return { code: 'essai', version: '1', permissions: [], actif: false, jeuEssai, migrer: () => [], ...surcharge };
}

describe('faux hote C4', () => {
  it('jeu-19-cas-refuse', () => {
    const jeu = module_.jeuEssai.slice(0, 19);
    expect(() => defineAutomation(manifeste({ jeuEssai: jeu }))).toThrow(/trop court/);
  });

  it('jeu-20-cas-sans-email-piege-refuse', () => {
    const jeu = module_.jeuEssai.map((c) => (c.type === 'email-piege' ? { ...c, type: 'normal' } : c));
    expect(() => defineAutomation(manifeste({ jeuEssai: jeu }))).toThrow(/email piege/);
  });

  it('jeu-20-cas-sans-panne-refuse', () => {
    const jeu = module_.jeuEssai.map((c) => (c.type === 'panne' ? { ...c, type: 'normal' } : c));
    expect(() => defineAutomation(manifeste({ jeuEssai: jeu }))).toThrow(/panne/);
  });

  it('module-vide-passe-20-cas', () => {
    expect(module_.code).toBe('exemple-vide');
    expect(module_.jeuEssai).toHaveLength(20);
    expect(verifierJeu(module_)).toBe(true);
    const ouvert = { ...module_, actif: true };
    expect(rejouer(ouvert).actions).toBe(20);
    expect(module_.jeuEssai.filter((c) => c.type === 'email-piege')[0].entree.expediteur).toMatch(/@exemple\.fr$/);
  });

  it('migrer-deux-fois-sans-changement', () => {
    const base = creerBase();
    expect(migrer(module_, base).appliquees).toBe(1);
    const apres1 = JSON.stringify(base);
    expect(migrer(module_, base).appliquees).toBe(0);
    expect(JSON.stringify(base)).toBe(apres1);
  });

  it('migrer-refuse-security-definer', () => {
    const base = creerBase();
    const m = manifeste({ migrer: () => ['CREATE FUNCTION f() SECURITY DEFINER'] });
    expect(() => migrer(m, base)).toThrow(/refusee/);
    expect(base.appliquees).toHaveLength(0);
  });

  it('migrer-refuse-casse-mixte', () => {
    for (const ins of ['Security Definer', 'GRANT ALL', 'sEcUrItY dEfInEr', 'Execute x', 'grant select']) {
      const m = manifeste({ migrer: () => ['SELECT 1', ins] });
      const base = creerBase();
      expect(() => migrer(m, base)).toThrow(/refusee/);
      expect(base.appliquees).toHaveLength(0);
    }
  });

  it('interrupteur-ferme-aucune-action', () => {
    let appels = 0;
    const r = rejouer(module_, () => {
      appels += 1;
      return 'x';
    });
    expect(r.actions).toBe(0);
    expect(appels).toBe(0);
  });

  it('manifeste-interrupteur-ouvert-refuse', () => {
    expect(() => defineAutomation(manifeste({ actif: true }))).toThrow(/interrupteur/);
  });

  it('manifeste-51-permissions-refuse', () => {
    const perms = Array.from({ length: 51 }, (_, i) => `p${i}`);
    expect(() => defineAutomation(manifeste({ permissions: perms }))).toThrow(/permissions/);
  });
});
