import { describe, expect, it } from 'vitest';
import { contenuBanniere, etatDuModule, verifierEtatVoulu } from '../etats.js';
import { ErreurAbonnement, type EtatVoulu } from '../types.js';

const AUJ = '2031-05-10';
const base = (o: Partial<EtatVoulu> = {}): EtatVoulu => ({ etat: 'actif', version: 1, arretEnvois: false, ...o });
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
};

describe('abonnement/etats', () => {
  it('six-etats-table-spec', () => {
    const cas: Array<[Partial<EtatVoulu>, string]> = [
      [{ periodeEssaiFin: '2031-06-01' }, 'ESSAI'],
      [{}, 'ACTIF'],
      [{ impayeSignale: true }, 'DELAI_DE_GRACE'],
      [{ etat: 'pause' }, 'LECTURE_SEULE'],
      [{ etat: 'arrete' }, 'SUSPENDU'],
      [{ etat: 'arrete', dateFin: '2031-05-09' }, 'RESILIE'],
    ];
    for (const [o, attendu] of cas) expect(etatDuModule(base(o), AUJ)).toBe(attendu);
    expect(etatDuModule(base({ etat: 'actif', periodeEssaiFin: '2031-05-09' }), AUJ)).toBe('ACTIF');
    expect(etatDuModule(base({ impayeSignale: false }), AUJ)).toBe('ACTIF');
  });

  it('sans-champs-demandes-trois-etats-seulement', () => {
    const vus = new Set([base(), base({ etat: 'pause' }), base({ etat: 'arrete' })].map((v) => etatDuModule(v, AUJ)));
    expect([...vus].sort()).toEqual(['ACTIF', 'LECTURE_SEULE', 'SUSPENDU']);
  });

  it('impaye-prioritaire-sur-essai', () => {
    expect(etatDuModule(base({ impayeSignale: true, periodeEssaiFin: '2031-06-01' }), AUJ)).toBe('DELAI_DE_GRACE');
  });

  it('essai-dernier-jour-encore-essai', () => {
    expect(etatDuModule(base({ periodeEssaiFin: AUJ }), AUJ)).toBe('ESSAI');
  });

  it('date-fin-du-jour-encore-suspendu', () => {
    expect(etatDuModule(base({ etat: 'arrete', dateFin: AUJ }), AUJ)).toBe('SUSPENDU');
    expect(etatDuModule(base({ etat: 'arrete', dateFin: '2031-05-11' }), AUJ)).toBe('SUSPENDU');
  });

  it('etat-voulu-invalide-refuse', () => {
    const mauvais: unknown[] = [
      base({ version: 0 }), base({ version: -1 }), base({ version: 1.5 }), base({ version: Number.NaN }),
      base({ version: Infinity }), { ...base(), etat: 'inconnu' }, base({ droitsUsage: ['a', ''] }),
      { ...base(), arretEnvois: 'oui' }, { ...base(), droitsUsage: 'a' }, { ...base(), impayeSignale: 'oui' },
      { ...base(), version: '1' }, null, 'actif', { ...base(), droitsUsage: [3] },
    ];
    for (const v of mauvais) expect(code(() => verifierEtatVoulu(v as EtatVoulu))).toBe('etat_voulu_invalide');
    expect(code(() => etatDuModule(base({ version: 0 }), AUJ))).toBe('etat_voulu_invalide');
    expect(code(() => verifierEtatVoulu(base({ droitsUsage: [], impayeSignale: false })))).toBeUndefined();
    expect(code(() => verifierEtatVoulu(base({ droitsUsage: ['lecture'] })))).toBeUndefined();
  });

  it('date-impossible-refusee', () => {
    for (const o of [{ periodeEssaiFin: '2031-02-30' }, { dateFin: '2031-13-01' }, { dateFin: '' }]) {
      expect(code(() => verifierEtatVoulu(base(o)))).toBe('date_invalide');
    }
    expect(code(() => etatDuModule(base(), '2031-02-30'))).toBe('date_invalide');
    expect(code(() => etatDuModule(base(), ''))).toBe('date_invalide');
  });

  it('banniere-actif-nulle', () => {
    expect(contenuBanniere('ACTIF', base(), true)).toBeNull();
    expect(contenuBanniere('ACTIF', base(), false)).toBeNull();
  });

  it('banniere-sans-montant-et-lien-selon-branchement', () => {
    const voulus: Array<[EtatVoulu, string, string | null]> = [
      [base({ periodeEssaiFin: '2031-06-01' }), 'ESSAI', '2031-06-01'],
      [base({ impayeSignale: true }), 'DELAI_DE_GRACE', null],
      [base({ etat: 'pause' }), 'LECTURE_SEULE', null],
      [base({ etat: 'arrete', dateFin: '2031-07-01' }), 'SUSPENDU', '2031-07-01'],
      [base({ etat: 'arrete' }), 'SUSPENDU', null],
      [base({ etat: 'arrete', dateFin: '2031-05-01', periodeEssaiFin: '2031-06-01' }), 'RESILIE', null],
    ];
    for (const [v, etat, prochaine] of voulus) {
      const b = contenuBanniere(etat as never, v, true);
      expect(b).toMatchObject({ etat, prochaineEtapeLe: prochaine, lien: 'portail_abonnement' });
      expect(contenuBanniere(etat as never, v, false)?.lien).toBe('contacter_axion');
      expect(Object.keys(b ?? {}).sort()).toEqual(['cause', 'consequence', 'etat', 'lien', 'prochaineEtapeLe']);
      for (const k of Object.keys(b ?? {})) expect(k).not.toMatch(/montant|prix|cout/);
      expect(b?.cause).toMatch(/^[a-z_]+$/);
      expect(b?.consequence).toMatch(/^[a-z_]+$/);
    }
    expect(contenuBanniere('DELAI_DE_GRACE', base({ impayeSignale: true }), true)).toMatchObject({ cause: 'impaye_signale', consequence: 'agents_arretes' });
  });
});
