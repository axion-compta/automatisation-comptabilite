import { describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerRouteur } from '../../../../apps/serveur/src/app.js';
import { creerServiceCalendrier, VALIDATIONS_REQUISES } from '../domaines/calendrier-service.js';
import { genererInterface } from '../../../donnees-fictives/src/interface.js';

type Rep = { body: Array<Record<string, unknown>> };
const r = creerRouteur().calendrier;
const cal = async (exercice: string, du: string, au: string) =>
  (await call(r.lireCalendrier, { params: { exercice }, query: { du, au } })) as unknown as Rep;
const voc = async (mode: 'simple' | 'comptable') => (await call(r.lireVocabulaire, { query: { mode } })) as unknown as Rep;
const rejet = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string }) => e.code);

describe('calendrier : service et routes', () => {
  it('calendrier-trie-inconnues-a-la-fin', async () => {
    const { body } = await cal('EX2026', '2026-01-01', '2027-12-31');
    expect(body.map((l) => l.id)).toEqual(['ech-4', 'ech-1', 'ech-3', 'ech-2']);
    expect(body.at(-1)!.dateLimite).toBeUndefined();
    const etroit = await cal('EX2026', '2026-10-01', '2026-10-31');
    expect(etroit.body.map((l) => l.id)).toEqual(['ech-1', 'ech-2']);
  });

  it('a-verifier-avec-source', async () => {
    const { body } = await cal('EX2026', '2026-01-01', '2027-12-31');
    const verifs = body.filter((l) => l.aVerifier === true);
    expect(verifs.length).toBeGreaterThan(0);
    for (const l of verifs) expect(String(l.sourceUrl)).toMatch(/^https:\/\/exemple\.invalid\//);
  });

  it('date-absente-inconnue', async () => {
    const { body } = await cal('EX2026', '2026-01-01', '2027-12-31');
    expect(body.find((l) => l.id === 'ech-2')!.statut).toBe('inconnue');
    const constats = creerServiceCalendrier().constatsDateIntrouvable(creerServiceCalendrier().lire('EX2026', '2026-01-01', '2027-12-31')!);
    expect(constats.map((c) => c.objetId)).toEqual(['ech-2']);
  });

  it('ordre-inverse-400', async () => {
    expect(await rejet(cal('EX2026', '2026-12-31', '2026-01-01'))).toBe('ORDRE_INVERSE');
  });

  it('date-invalide-400', async () => {
    expect(await rejet(cal('EX2026', '2026-02-30', '2026-12-31'))).toBe('BAD_REQUEST');
    expect(await rejet(cal('EX2026', '2026-01-01', '2026-13-01'))).toBe('BAD_REQUEST');
  });

  it('exercice-inconnu-404', async () => {
    expect(await rejet(cal('EX1999', '2026-01-01', '2026-12-31'))).toBe('EXERCICE_INCONNU');
  });

  it('vocabulaire-simple-avec-survol', async () => {
    const { body } = await voc('simple');
    const termes = genererInterface().profils.pleine.termes;
    const valide = termes.find((t) => t.validePar >= VALIDATIONS_REQUISES)!;
    expect(body.find((t) => t.code === valide.code)).toEqual({ code: valide.code, mot: valide.simple, survol: valide.comptable });
  });

  it('terme-non-valide-sans-survol', async () => {
    const termes = genererInterface().profils.pleine.termes;
    for (const mode of ['simple', 'comptable'] as const) {
      const { body } = await voc(mode);
      for (const t of termes.filter((x) => x.validePar < VALIDATIONS_REQUISES)) {
        const lu = body.find((x) => x.code === t.code)!;
        expect(lu.mot).toBe(t.simple);
        expect('survol' in lu).toBe(false);
      }
    }
  });

  it('mode-comptable-memes-codes', async () => {
    const [s, c] = [await voc('simple'), await voc('comptable')];
    expect(c.body.map((t) => t.code)).toEqual(s.body.map((t) => t.code));
    expect(c.body.map((t) => t.mot)).not.toEqual(s.body.map((t) => t.mot));
    expect(VALIDATIONS_REQUISES).toBe(3);
  });
});
