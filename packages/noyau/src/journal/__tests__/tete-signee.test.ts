import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { doitSignerTete, documentTete, verificateurEd25519, verifierTeteSignee } from '../tete-signee.js';

const paire = () => generateKeyPairSync('ed25519');
const pem = (k: ReturnType<typeof paire>) => k.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const signer = (k: ReturnType<typeof paire>, d: string) => sign(null, Buffer.from(d), k.privateKey).toString('base64');
const doc = documentTete({ societeId: 'A', sequence: 42, empreinte: 'e1' }, '2026-01-05T10:00:00Z');
const erreur = { code: 'argument_invalide', name: 'ErreurJournal' };

describe('journal/tete-signee', () => {
  it('signature-valide-verifiee', () => {
    const k = paire();
    expect(doc).toBe('{"empreinte":"e1","horodatage":"2026-01-05T10:00:00Z","sequence":42,"societeId":"A"}');
    expect(verifierTeteSignee(doc, signer(k, doc), verificateurEd25519(pem(k)))).toBe(true);
    const v = (d: string) => d === doc;
    expect(verifierTeteSignee(doc, 'QUJD', v)).toBe(true);
  });

  it('document-modifie-d-un-caractere-refuse', () => {
    const k = paire();
    const s = signer(k, doc);
    const v = verificateurEd25519(pem(k));
    expect(verifierTeteSignee(doc.replace('"A"', '"B"'), s, v)).toBe(false);
    expect(verifierTeteSignee(doc.replace('42', '43'), s, v)).toBe(false);
    expect(verifierTeteSignee(`${doc} `, s, v)).toBe(false);
    expect(documentTete({ societeId: 'A', sequence: 43, empreinte: 'e1' }, '2026-01-05T10:00:00Z')).not.toBe(doc);
  });

  it('autre-cle-refusee', () => {
    const [k1, k2] = [paire(), paire()];
    expect(verifierTeteSignee(doc, signer(k1, doc), verificateurEd25519(pem(k2)))).toBe(false);
    expect(() => verificateurEd25519('pas une cle')).toThrow(expect.objectContaining(erreur));
    expect(() => verificateurEd25519('')).toThrow(expect.objectContaining(erreur));
  });

  it('signature-vide-ou-illisible-refusee', () => {
    const k = paire();
    const s = signer(k, doc);
    const v = verificateurEd25519(pem(k));
    const toujours = () => true;
    for (const mauvaise of ['', '!!!', 'abc', `${s}=`, s.slice(1), `${s}\n`, ' ']) {
      expect(verifierTeteSignee(doc, mauvaise, v)).toBe(false);
      expect(verifierTeteSignee(doc, mauvaise, toujours)).toBe(false);
    }
    expect(verifierTeteSignee(doc, undefined as unknown as string, toujours)).toBe(false);
    expect(verifierTeteSignee(doc, s, () => { throw new Error('x'); })).toBe(false);
    expect(verifierTeteSignee(doc, s, (() => 'oui') as unknown as () => boolean)).toBe(false);
  });

  it('jamais-signee-signer', () => {
    expect(doitSignerTete(null, 0, 10)).toBe(true);
    expect(doitSignerTete(null, 5, 10, 'nuit')).toBe(true);
  });

  it('intervalle-exact-signer', () => {
    expect(doitSignerTete(100, 160, 60)).toBe(true);
    expect(doitSignerTete(100, 159, 60)).toBe(false);
    expect(doitSignerTete(100, 900, 60)).toBe(true);
    expect(doitSignerTete(100, 100, 0)).toBe(true);
  });

  it('avant-intervalle-ne-pas-signer-sauf-evenement', () => {
    expect(doitSignerTete(100, 110, 60)).toBe(false);
    expect(doitSignerTete(100, 50, 60)).toBe(false);
    for (const e of ['cloture', 'export', 'nuit'] as const) expect(doitSignerTete(100, 110, 60, e)).toBe(true);
  });

  it('arguments-invalides-refuses', () => {
    const mauvais = [Number.NaN, Infinity, -Infinity, -1, 1.5, '3', undefined];
    for (const v of mauvais as number[]) {
      expect(() => doitSignerTete(v, 10, 5)).toThrow(expect.objectContaining(erreur));
      expect(() => doitSignerTete(1, v, 5)).toThrow(expect.objectContaining(erreur));
      expect(() => doitSignerTete(1, 10, v)).toThrow(expect.objectContaining(erreur));
      expect(() => documentTete({ societeId: 'A', sequence: v, empreinte: 'e' }, '2026-01-05')).toThrow(expect.objectContaining(erreur));
    }
    expect(() => doitSignerTete(1, 10, 5, 'hier' as 'nuit')).toThrow(expect.objectContaining(erreur));
    expect(() => doitSignerTete(null, 10, 5, 'hier' as 'nuit')).toThrow(expect.objectContaining(erreur));
    expect(() => doitSignerTete(null, Number.NaN, 5)).toThrow(expect.objectContaining(erreur));
    for (const h of ['', 'hier']) expect(() => documentTete({ societeId: 'A', sequence: 1, empreinte: 'e' }, h)).toThrow(expect.objectContaining(erreur));
    expect(() => documentTete({ societeId: '', sequence: 1, empreinte: 'e' }, '2026-01-05')).toThrow(expect.objectContaining(erreur));
    expect(() => documentTete({ societeId: 'A', sequence: 1, empreinte: '' }, '2026-01-05')).toThrow(expect.objectContaining(erreur));
  });
});
