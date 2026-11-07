import { describe, expect, it } from 'vitest';
import { exigerNiveau, type Revendications } from '../connexion.js';
import { ErreurSecurite } from '../types.js';

const NOW = 5000000;
const REG = { reauthMaxMs: 600000, attenteApresRecuperationMs: 900000 };
const secondes = (ms: number) => Math.trunc(ms * 0.001);
const mfa = (authTime?: number): Revendications => (authTime === undefined ? { acr: 'mfa' } : { acr: 'mfa', authTime });
const refus = (raison: string) => ({ ok: false, raison });
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurSecurite ? e.code : 'autre'; }
  return 'aucune';
};
const vieux = secondes(NOW - REG.reauthMaxMs - 2000);
const recent = secondes(NOW - 2000);

describe('securite/connexion', () => {
  it('sans-mfa-aucune-operation', () => {
    expect(exigerNiveau(undefined, 'ordinaire', NOW, REG)).toEqual(refus('non_authentifie'));
    expect(exigerNiveau(null as never, 'exporter_fec', NOW, REG)).toEqual(refus('non_authentifie'));
    for (const acr of [undefined, '', 'MFA', 'mfa ', 'pwd']) {
      for (const op of ['ordinaire', 'exporter_fec'] as const) {
        expect(exigerNiveau((acr === undefined ? { authTime: recent } : { acr, authTime: recent }), op, NOW, REG)).toEqual(refus('mfa_requis'));
      }
    }
  });

  it('ordinaire-avec-mfa-permis-meme-vieux', () => {
    expect(exigerNiveau(mfa(vieux), 'ordinaire', NOW, REG)).toEqual({ ok: true });
    expect(exigerNiveau(mfa(), 'ordinaire', NOW, REG, NOW)).toEqual({ ok: true });
  });

  it('sensible-au-dela-du-reglage-refuse', () => {
    expect(exigerNiveau(mfa(vieux), 'changer_role', NOW, REG)).toEqual(refus('reauthentification_requise'));
    expect(exigerNiveau(mfa(), 'changer_role', NOW, REG)).toEqual(refus('reauthentification_requise'));
    expect(exigerNiveau(mfa(NaN), 'changer_role', NOW, REG)).toEqual(refus('reauthentification_requise'));
  });

  it('sensible-en-deca-permis', () => {
    expect(exigerNiveau(mfa(recent), 'rouvrir_periode', NOW, REG)).toEqual({ ok: true });
  });

  it('frontiere-exacte-permise', () => {
    const t = secondes(NOW - REG.reauthMaxMs);
    expect(t * 1000).toBe(NOW - REG.reauthMaxMs);
    expect(exigerNiveau(mfa(t), 'cloturer', NOW, REG)).toEqual({ ok: true });
    expect(exigerNiveau(mfa(t - 1), 'cloturer', NOW, REG)).toEqual(refus('reauthentification_requise'));
    const r = exigerNiveau(mfa(recent), 'cloturer', NOW, REG, NOW - REG.attenteApresRecuperationMs);
    expect(r).toEqual({ ok: true });
    expect(exigerNiveau(mfa(recent), 'cloturer', NOW, REG, NOW - REG.attenteApresRecuperationMs + 1)).toEqual(refus('recuperation_recente'));
  });

  it('auth-time-futur-refuse', () => {
    expect(exigerNiveau(mfa(secondes(NOW) + 1), 'changer_cle', NOW, REG)).toEqual(refus('reauthentification_requise'));
    expect(exigerNiveau(mfa(secondes(NOW)), 'changer_cle', NOW, REG)).toEqual({ ok: true });
  });

  it('recuperation-recente-bloque-les-sensibles', () => {
    expect(exigerNiveau(mfa(recent), 'changer_modele_ia', NOW, REG, NOW - 1)).toEqual(refus('recuperation_recente'));
    expect(exigerNiveau(mfa(recent), 'changer_modele_ia', NOW, REG, NOW)).toEqual(refus('recuperation_recente'));
    expect(exigerNiveau(mfa(vieux), 'changer_modele_ia', NOW, REG, NOW - 1)).toEqual(refus('reauthentification_requise'));
    expect(exigerNiveau(mfa(recent), 'ordinaire', NOW, REG, NOW - 1)).toEqual({ ok: true });
  });

  it('recuperation-ancienne-sans-effet', () => {
    expect(exigerNiveau(mfa(recent), 'exporter_dossier', NOW, REG, NOW - REG.attenteApresRecuperationMs - 1)).toEqual({ ok: true });
    expect(exigerNiveau(mfa(recent), 'exporter_dossier', NOW, REG, undefined)).toEqual({ ok: true });
  });

  it('reglages-invalides-refuses', () => {
    const mauvais = [NaN, Infinity, -1, 1.5, undefined, '5'] as unknown as number[];
    for (const v of mauvais) {
      expect(code(() => exigerNiveau(mfa(recent), 'ordinaire', NOW, { ...REG, reauthMaxMs: v }))).toBe('argument_invalide');
      expect(code(() => exigerNiveau(mfa(recent), 'ordinaire', NOW, { ...REG, attenteApresRecuperationMs: v }))).toBe('argument_invalide');
    }
    expect(code(() => exigerNiveau(mfa(recent), 'ordinaire', NOW, undefined as never))).toBe('argument_invalide');
    expect(code(() => exigerNiveau(mfa(recent), 'ordinaire', NaN, REG))).toBe('argument_invalide');
    expect(code(() => exigerNiveau(mfa(recent), 'cloturer', NOW, REG, NaN))).toBe('argument_invalide');
    expect(code(() => exigerNiveau(mfa(recent), 'cloturer', NOW, REG, Infinity))).toBe('argument_invalide');
    expect(code(() => exigerNiveau(mfa(recent), 'cloturer', NOW, { reauthMaxMs: 0, attenteApresRecuperationMs: 0 }))).toBe('aucune');
  });
});
