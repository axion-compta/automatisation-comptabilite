import { describe, expect, it } from 'vitest';
import { CATALOGUE_GESTES, ErreurGeste, verifierGeste, type CodeGeste } from '../gestes.js';

// Délai inventé pour les tests : jamais lu depuis src.
const DELAI = 300_000;
const MAINTENANT = 10_000_000;
const CODES = CATALOGUE_GESTES.map((g) => g.code);
const ctx = { maintenant: MAINTENANT, delaiReauthMs: DELAI };
const frais = MAINTENANT - 1000;
const TOUTES = ['compta-valider', 'compta-cloturer', 'compta-parametrer', 'compta-saisir'];
const personne = (permissions: readonly string[], derniereReauth?: number) => ({
  type: 'personne' as const,
  permissions,
  ...(derniereReauth === undefined ? {} : { derniereReauth }),
});
const permissionDe = (code: string) => CATALOGUE_GESTES.find((g) => g.code === code)?.permission ?? '';

describe('catalogue des gestes', () => {
  it('douze-gestes-exactement', () => {
    expect(CATALOGUE_GESTES).toHaveLength(12);
    expect(new Set(CODES).size).toBe(12);
    expect(CODES).toStrictEqual(['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11', 'G12']);
    expect(new Set(CATALOGUE_GESTES.map((g) => g.action)).size).toBe(12);
    expect(CATALOGUE_GESTES.map((g) => g.action)).toStrictEqual([
      'valider_ecriture',
      'cloturer',
      'deposer_declaration',
      'payer_declaration',
      'choisir_regime',
      'activer_assimiler',
      'accepter_compte_courant_debiteur',
      'proposer_dividende',
      'creer_compte_ou_fusionner_tiers',
      'envoyer_email',
      'supprimer_donnees',
      'appliquer_parametre_legal',
    ]);
    for (const g of CATALOGUE_GESTES) expect(TOUTES).toContain(g.permission);
  });
});

describe('verifierGeste', () => {
  it('service-agent-tache-refuses', () => {
    let refus = 0;
    for (const type of ['service', 'agent', 'tache'] as const) {
      for (const code of CODES) {
        // Même avec toutes les permissions et une réauthentification fraîche.
        const r = verifierGeste({ type, permissions: TOUTES, derniereReauth: frais }, code, { ...ctx, fusion: true });
        expect(r).toStrictEqual({ ok: false, statutHttp: 403, code: 'geste_humain_requis' });
        refus += 1;
      }
    }
    expect(refus).toBe(36);
  });

  it('role-comptable-refuse', () => {
    let refus = 0;
    for (const code of CODES) {
      const r = verifierGeste(personne(['compta-lire', 'compta-exporter', 'compta-commenter'], frais), code, ctx);
      expect(r).toStrictEqual({ ok: false, statutHttp: 403, code: 'permission_manquante' });
      refus += 1;
    }
    expect(refus).toBe(12);
  });

  it('permission accordée : accepté pour chaque geste avec réauthentification fraîche', () => {
    for (const g of CATALOGUE_GESTES) {
      expect(verifierGeste(personne([g.permission], frais), g.code, ctx)).toStrictEqual({ ok: true });
    }
  });

  it('la permission d’un autre geste ne suffit pas', () => {
    expect(verifierGeste(personne(['compta-saisir'], frais), 'G02', ctx)).toMatchObject({
      code: 'permission_manquante',
    });
    expect(verifierGeste(personne([], frais), 'G01', ctx)).toMatchObject({ code: 'permission_manquante' });
  });

  it('reauth-juste-avant-et-a-la-limite', () => {
    const p = (reauth: number) => personne(['compta-cloturer'], reauth);
    expect(verifierGeste(p(MAINTENANT - DELAI + 1), 'G02', ctx)).toStrictEqual({ ok: true });
    expect(verifierGeste(p(MAINTENANT - DELAI), 'G02', ctx)).toStrictEqual({
      ok: false,
      statutHttp: 403,
      code: 'reauth_requise',
    });
    expect(verifierGeste(p(MAINTENANT), 'G02', ctx)).toStrictEqual({ ok: true });
    expect(verifierGeste(personne(['compta-cloturer']), 'G02', ctx)).toMatchObject({ code: 'reauth_requise' });
  });

  it('g01-sans-reauth', () => {
    expect(CATALOGUE_GESTES.find((g) => g.code === 'G01')?.reauth).toBe('jamais');
    expect(verifierGeste(personne(['compta-valider']), 'G01', ctx)).toStrictEqual({ ok: true });
    expect(verifierGeste(personne(['compta-valider'], 0), 'G01', ctx)).toStrictEqual({ ok: true });
  });

  it('g09-fusion-exige-administration-et-reauth', () => {
    const g09 = CATALOGUE_GESTES.find((g) => g.code === 'G09');
    expect(g09?.reauth).toBe('fusion_seulement');
    // Création simple : permission de saisie, sans réauthentification.
    expect(verifierGeste(personne([permissionDe('G09')]), 'G09', ctx)).toStrictEqual({ ok: true });
    expect(verifierGeste(personne([permissionDe('G09')]), 'G09', { ...ctx, fusion: false })).toStrictEqual({
      ok: true,
    });
    // Fusion : compta-parametrer exigé, puis réauthentification.
    const fusion = { ...ctx, fusion: true };
    expect(verifierGeste(personne(['compta-saisir'], frais), 'G09', fusion)).toMatchObject({
      code: 'permission_manquante',
    });
    expect(verifierGeste(personne(['compta-parametrer']), 'G09', fusion)).toMatchObject({ code: 'reauth_requise' });
    expect(verifierGeste(personne(['compta-parametrer'], MAINTENANT - DELAI), 'G09', fusion)).toMatchObject({
      code: 'reauth_requise',
    });
    expect(verifierGeste(personne(['compta-parametrer'], frais), 'G09', fusion)).toStrictEqual({ ok: true });
    // Un agent reste refusé en premier, même en fusion.
    expect(verifierGeste({ type: 'agent', permissions: [], derniereReauth: frais }, 'G09', fusion)).toMatchObject({
      code: 'geste_humain_requis',
    });
  });

  it('reauth-dans-le-futur-refusee', () => {
    expect(verifierGeste(personne(['compta-cloturer'], MAINTENANT + 1), 'G02', ctx)).toMatchObject({
      code: 'reauth_requise',
    });
    expect(verifierGeste(personne(['compta-cloturer'], MAINTENANT + DELAI), 'G02', ctx)).toMatchObject({
      code: 'reauth_requise',
    });
  });

  it('code-inconnu-refuse', () => {
    for (const code of ['G13', 'G00', '', 'g01', 'G1']) {
      expect(() => verifierGeste(personne(TOUTES, frais), code as CodeGeste, ctx)).toThrow(ErreurGeste);
      try {
        verifierGeste(personne(TOUTES, frais), code as CodeGeste, ctx);
      } catch (e) {
        expect((e as ErreurGeste).code).toBe('geste_inconnu');
      }
    }
  });

  it('entrees-invalides', () => {
    const act = personne(TOUTES, frais);
    const echoue = (c: Parameters<typeof verifierGeste>[2]) => {
      expect(() => verifierGeste(act, 'G01', c)).toThrow(ErreurGeste);
      try {
        verifierGeste(act, 'G01', c);
      } catch (e) {
        expect((e as ErreurGeste).code).toBe('entree_invalide');
      }
    };
    for (const v of [NaN, Infinity, -Infinity, 1.5]) echoue({ maintenant: v, delaiReauthMs: DELAI });
    for (const v of [NaN, Infinity, -Infinity, -1, 1.5, 0]) echoue({ maintenant: MAINTENANT, delaiReauthMs: v });
    expect(() => verifierGeste({ ...act, type: 'robot' as 'agent' }, 'G01', ctx)).toThrow(ErreurGeste);
    expect(() => verifierGeste({ ...act, permissions: 'compta-valider' as never }, 'G01', ctx)).toThrow(ErreurGeste);
    expect(() => verifierGeste(personne(TOUTES, NaN), 'G01', ctx)).toThrow(ErreurGeste);
    expect(() => verifierGeste(personne(TOUTES, 1.5), 'G01', ctx)).toThrow(ErreurGeste);
  });
});
