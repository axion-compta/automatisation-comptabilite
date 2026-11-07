import { describe, expect, it } from 'vitest';
import { ErreurIban, cleIbanValide, hacherIban, masquerIban, memeIban, normaliserIban } from '../iban.js';

// IBAN fictif construit à l'exécution : la clé est calculée, jamais écrite dans le fichier.
function construire(pays: string, compte: string): string {
  const num = (s: string) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const ch of num(compte + pays + '00')) reste = (reste * 10 + Number(ch)) % 97;
  return pays + String(98 - reste).padStart(2, '0') + compte;
}
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as ErreurIban).code;
  }
  return undefined;
};
const secret = new Uint8Array(32).fill(7);
const bon = construire('FR', '30004000010000123456789');

describe('iban', () => {
  it('normalisation-espaces-et-casse', () => {
    expect(normaliserIban(' fr76-1234 5678\t')).toBe('FR761234' + '5678');
    expect(normaliserIban('')).toBe('');
    expect(normaliserIban('FR76\u00A01234\u202F5678')).toBe('FR7612345678');
    for (const x of ['é1', 'AB:12', 'AB.12', 'AB_12']) expect(code(() => normaliserIban(x))).toBe('iban_invalide');
  });
  it('cle-juste-acceptee', () => {
    expect(cleIbanValide(bon)).toBe(true);
    expect(cleIbanValide(bon.toLowerCase())).toBe(true);
    expect(cleIbanValide(construire('DE', '12345678901234567890'))).toBe(true);
    const court = construire('NO', '1234567890');
    expect(court.length).toBe(14);
    expect(cleIbanValide(court)).toBe(false);
    const quinze = construire('NO', '12345678901');
    expect(quinze.length).toBe(15);
    expect(cleIbanValide(quinze)).toBe(true);
    const trenteQuatre = construire('XX', 'A'.repeat(30));
    expect(trenteQuatre.length).toBe(34);
    expect(cleIbanValide(trenteQuatre)).toBe(true);
    expect(cleIbanValide(construire('XX', 'A'.repeat(31)))).toBe(false);
  });
  it('cle-fausse-refusee', () => {
    const faux = bon.slice(0, 2) + String((Number(bon.slice(2, 4)) + 1) % 100).padStart(2, '0') + bon.slice(4);
    expect(cleIbanValide(faux)).toBe(false);
    for (const x of ['', 'FR', 'é'.repeat(20), '!'.repeat(20)]) expect(cleIbanValide(x)).toBe(false);
  });
  it('masque-quatre-et-quatre', () => {
    expect(masquerIban('FR7612345678900042')).toBe('FR76 •••• 0042');
    expect(masquerIban('ABCD1234')).toBe('ABCD •••• 1234');
    expect(code(() => masquerIban('ABCD123'))).toBe('iban_invalide');
    expect(code(() => masquerIban(''))).toBe('iban_invalide');
  });
  it('hache-stable-meme-secret', () => {
    const h = hacherIban(bon, secret);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hacherIban(bon, secret)).toBe(h);
    expect(hacherIban(bon.toLowerCase(), secret)).toBe(h);
    expect(memeIban(h, hacherIban(bon, secret))).toBe(true);
    expect(memeIban(h, hacherIban('ABCD1234', secret))).toBe(false);
    expect(memeIban(h, 'abc')).toBe(false);
  });
  it('hache-different-autre-secret', () => {
    const autre = new Uint8Array(32).fill(8);
    expect(hacherIban(bon, autre)).not.toBe(hacherIban(bon, secret));
  });
  it('secret-trop-court-refuse', () => {
    expect(code(() => hacherIban(bon, new Uint8Array(31)))).toBe('secret_trop_court');
    expect(code(() => hacherIban(bon, new Uint8Array(0)))).toBe('secret_trop_court');
    expect(code(() => hacherIban(bon, new Uint8Array(32)))).toBeUndefined();
  });
  it('message-d-erreur-sans-iban', () => {
    const entree = 'FR76-ÉÉ-' + bon;
    for (const f of [() => normaliserIban(entree), () => masquerIban('FR76')]) {
      try {
        f();
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurIban);
        expect((e as Error).message).not.toContain('FR76');
        expect((e as Error).message).not.toContain(bon.slice(4, 12));
        expect((e as Error).message).toBe((e as ErreurIban).code);
      }
    }
  });
});
