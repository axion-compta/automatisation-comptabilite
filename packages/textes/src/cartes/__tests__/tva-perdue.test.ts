import { describe, expect, it } from 'vitest';
import { carteTvaPerdue, produireCarteTvaPerdue } from '../tva-perdue.js';

// Assemblés ici pour ne pas figurer en clair dans le dépôt.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));

describe('carte TVA perdue', () => {
  it('carte-tva-perdue-produite-si-perdue', () => {
    const carte = produireCarteTvaPerdue(400, '4,00 €', 'véhicule de tourisme');
    expect(carte).not.toBeNull();
    expect(carte?.titre).toBe('TVA perdue');
    expect(carte?.detail).toContain('4,00 €');
    expect(carte?.detail).toContain('véhicule de tourisme');
    expect(carte?.detail).not.toMatch(/[{}]/);
    // Frontière : 1 centime produit la carte ; 0, négatif et NaN non.
    expect(produireCarteTvaPerdue(1, '0,01 €', 'x')).not.toBeNull();
    expect(produireCarteTvaPerdue(0, '0,00 €', 'x')).toBeNull();
    expect(produireCarteTvaPerdue(-1, '0,01 €', 'x')).toBeNull();
    expect(produireCarteTvaPerdue(Number.NaN, '', 'x')).toBeNull();
  });

  it('gabarit-vouvoiement-sans-mot-interdit', () => {
    expect(carteTvaPerdue.detail).toContain('{montant}');
    expect(carteTvaPerdue.detail).toContain('{motif}');
    const texte = `${carteTvaPerdue.titre} ${carteTvaPerdue.detail}`;
    expect(texte).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
    for (const mot of INTERDITS) expect(texte.toLowerCase()).not.toContain(mot.toLowerCase());
    expect(texte).not.toMatch(/\d\s?€|prix/i);
  });
});
