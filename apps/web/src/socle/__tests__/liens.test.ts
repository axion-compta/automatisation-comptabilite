import { afterEach, describe, expect, it, vi } from 'vitest';
import { lienPortail } from '../liens.js';

const HOTE = 'https://portail.exemple.invalid';
afterEach(() => vi.unstubAllEnvs());

describe('liens du portail', () => {
  it('lien-portail-absent-sans-variable', () => {
    for (const v of [undefined, '']) {
      vi.stubEnv('VITE_URL_PORTAIL', v as string);
      expect(lienPortail('abonnement')).toBeNull();
      expect(lienPortail('fin_contrat')).toBeNull();
    }
  });
  it('lien-portail-https-seulement', () => {
    for (const v of ['http://portail.exemple.invalid', 'javascript:alert(1)', 'pas une adresse', 'ftp://portail.exemple.invalid']) {
      vi.stubEnv('VITE_URL_PORTAIL', v);
      expect(lienPortail('abonnement')).toBeNull();
    }
  });
  it('construit les deux adresses en https', () => {
    vi.stubEnv('VITE_URL_PORTAIL', HOTE + '/');
    expect(lienPortail('abonnement')).toBe(HOTE + '/abonnement');
    expect(lienPortail('fin_contrat')).toBe(HOTE + '/demandes/fin-de-contrat');
  });
});
