import { describe, expect, it } from 'vitest';
import { modelePrerempli } from '../../rgpd/registre.js';
import { verifierTraitement } from '../pole-rgpd.js';

const registre = modelePrerempli('2026-11-01');
const connue = registre[0]!.finalite;

describe('pôle RGPD', () => {
  it('traitement-hors-registre-refuse', () => {
    const r = verifierTraitement('Revendre les données à un tiers', registre);
    expect(r.accepte).toBe(false);
    expect(verifierTraitement('Revendre', []).accepte).toBe(false);
    // chaîne vide ou blanche : jamais acceptée, même si le registre contient une finalité vide
    expect(verifierTraitement('   ', registre).accepte).toBe(false);
    expect(verifierTraitement('', [{ ...registre[0]!, finalite: '' }]).accepte).toBe(false);
    // préfixe strict et sous-chaîne d'une finalité inscrite : refusés et escaladés vers le dpo
    expect(connue.length).toBeGreaterThan(8);
    for (const partielle of [connue.slice(0, Math.floor(connue.length / 2)), connue.slice(0, -1), connue.slice(1), connue.slice(2, -2)]) {
      expect(verifierTraitement(partielle, registre)).toEqual({ accepte: false, escalade: { role: 'dpo', motif: 'traitement_hors_registre', finalite: partielle } });
    }
  });

  it('escalade-dpo', () => {
    const r = verifierTraitement('Revendre les données à un tiers', registre);
    expect(r).toEqual({ accepte: false, escalade: { role: 'dpo', motif: 'traitement_hors_registre', finalite: 'Revendre les données à un tiers' } });
  });

  it('traitement-au-registre-accepte', () => {
    expect(verifierTraitement(connue, registre)).toEqual({ accepte: true });
    // espaces de bord et casse ignorés
    expect(verifierTraitement(`  ${connue.toUpperCase()} `, registre)).toEqual({ accepte: true });
    // une ligne sans rapport ne suffit pas : seule la finalité exacte compte
    expect(verifierTraitement(`${connue} et plus`, registre).accepte).toBe(false);
  });
});
