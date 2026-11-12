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
