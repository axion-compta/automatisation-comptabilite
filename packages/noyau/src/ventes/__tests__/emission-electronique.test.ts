import { describe, expect, it } from 'vitest';
import { aEmettreParPlateforme } from '../emission-electronique.js';
import type { EntreeEmission } from '../emission-electronique.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const DATE = '2031-03-01';
const base: EntreeEmission = {
  dateFacture: DATE,
  paysClient: 'FR',
  natureClient: 'professionnel',
  origine: 'depot',
  parametre: { valeur: DATE, statut: 'valide' },
};
const avec = (o: Partial<EntreeEmission>): ReturnType<typeof aEmettreParPlateforme> => aEmettreParPlateforme({ ...base, ...o });

describe('emission electronique', () => {
  it('veille-aucun-signal', () => {
    expect(avec({ dateFacture: '2031-02-28' })).toEqual({ signal: false, aVerifier: false, parametreAbsent: false });
  });

  it('jour-meme-signal', () => {
    expect(avec({})).toEqual({ signal: true, aVerifier: false, parametreAbsent: false });
    expect(avec({ dateFacture: '2031-03-02', origine: 'import_fichier' }).signal).toBe(true);
    expect(avec({ origine: 'email' }).signal).toBe(true);
  });

  it('particulier-aucun-signal', () => {
    expect(avec({ natureClient: 'particulier' }).signal).toBe(false);
    expect(avec({ natureClient: 'a_confirmer' }).signal).toBe(false);
  });

  it('plateforme-agreee-aucun-signal', () => {
    expect(avec({ origine: 'plateforme_agreee' }).signal).toBe(false);
  });

  it('client-hors-france-aucun-signal', () => {
    expect(avec({ paysClient: 'BE' }).signal).toBe(false);
    expect(avec({ paysClient: 'fr' }).signal).toBe(false);
  });

  it('parametre-a-verifier-signal-marque', () => {
    for (const statut of ['a_verifier', 'brouillon']) {
      expect(avec({ parametre: { valeur: DATE, statut } })).toEqual({ signal: true, aVerifier: true, parametreAbsent: false });
    }
  });

  it('parametre-absent', () => {
    expect(avec({ parametre: undefined })).toEqual({ signal: false, aVerifier: false, parametreAbsent: true });
  });

  it('dates-invalides-refusees', () => {
    expect(code(() => avec({ dateFacture: '' }))).toBe('date_invalide');
    expect(code(() => avec({ parametre: { valeur: '2031-02-30', statut: 'valide' } }))).toBe('date_invalide');
    expect(code(() => avec({ parametre: { valeur: '', statut: 'valide' } }))).toBe('date_invalide');
    expect(code(() => avec({ dateFacture: 'x', parametre: undefined }))).toBe('date_invalide');
  });
});
