// Fiche L05-T60 : tests nommés audio-jamais-ecrit, segment-trop-long-refuse, normalisation-appliquee, oui avant récapitulatif.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SEGMENT_MAX_MS, SegmentTropLong, accepterOui, creerFauxTranscription, normaliser, transcrire } from '../transcription.js';

const segment = (dureeMs = 3000) => ({ octets: Uint8Array.from([1, 2, 3, 4]), dureeMs });

describe('transcription', () => {
  it('audio-jamais-ecrit : octets effacés, aucun journal, aucun accès disque dans le module', async () => {
    const journal = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const s = segment();
    expect(await transcrire(creerFauxTranscription(['Bonjour']), s)).toBe('Bonjour');
    expect([...s.octets]).toEqual([0, 0, 0, 0]);
    expect(journal).not.toHaveBeenCalled();
    journal.mockRestore();
    const source = readFileSync(new URL('../transcription.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/node:fs|writeFile|createWriteStream|console\./);
  });

  it('audio-jamais-ecrit : octets aussi effacés si le port échoue', async () => {
    const s = segment();
    const port = { transcrire: async () => Promise.reject(new Error('panne')) };
    await expect(transcrire(port, s)).rejects.toThrow('panne');
    expect([...s.octets]).toEqual([0, 0, 0, 0]);
  });

  it('segment-trop-long-refuse : le port n’est pas appelé, l’audio est effacé', async () => {
    const faux = creerFauxTranscription(['x']);
    const s = segment(SEGMENT_MAX_MS + 1);
    await expect(transcrire(faux, s)).rejects.toBeInstanceOf(SegmentTropLong);
    expect(faux.appels()).toBe(0);
    expect([...s.octets]).toEqual([0, 0, 0, 0]);
    await expect(transcrire(faux, segment(0))).rejects.toBeInstanceOf(SegmentTropLong);
    await expect(transcrire(faux, segment(SEGMENT_MAX_MS))).resolves.toBe('x');
  });

  it('normalisation-appliquee : espaces réduits, virgule décimale', async () => {
    expect(normaliser('  payé   12.50   euros ')).toBe('payé 12,50 euros');
    expect(await transcrire(creerFauxTranscription(['facture  3.5  TTC']), segment())).toBe('facture 3,5 TTC');
  });

  it('oui-avant-recapitulatif-ignore : A2-05', () => {
    expect(accepterOui('oui', false)).toBe(false);
    expect(accepterOui(' Oui. ', true)).toBe(true);
    expect(accepterOui('oui mais pas ce montant', true)).toBe(false);
  });
});
