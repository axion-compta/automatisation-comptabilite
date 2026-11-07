import { createHmac, timingSafeEqual } from 'node:crypto';

export class ErreurIban extends Error {
  constructor(readonly code: 'iban_invalide' | 'secret_trop_court') {
    super(code);
    this.name = 'ErreurIban';
  }
}

export function normaliserIban(texte: string): string {
  const s = texte.replace(/[ \t-]/g, '').toUpperCase();
  if (!/^[A-Z0-9]*$/.test(s)) throw new ErreurIban('iban_invalide');
  return s;
}

export function cleIbanValide(iban: string): boolean {
  let s: string;
  try {
    s = normaliserIban(iban);
  } catch {
    return false;
  }
  if (s.length < 15 || s.length > 34 || !/^[A-Z]{2}[0-9]{2}/.test(s)) return false;
  const chiffres = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (let i = 0; i < chiffres.length; i += 9) reste = Number(String(reste) + chiffres.slice(i, i + 9)) % 97;
  return reste === 1;
}

export function masquerIban(iban: string): string {
  const s = normaliserIban(iban);
  if (s.length < 8) throw new ErreurIban('iban_invalide');
  return `${s.slice(0, 4)} •••• ${s.slice(-4)}`;
}

export function hacherIban(iban: string, secret: Uint8Array): string {
  if (secret.length < 32) throw new ErreurIban('secret_trop_court');
  return createHmac('sha256', secret).update(normaliserIban(iban)).digest('hex');
}

export function memeIban(hacheA: string, hacheB: string): boolean {
  const a = Buffer.from(hacheA, 'utf8');
  const b = Buffer.from(hacheB, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
