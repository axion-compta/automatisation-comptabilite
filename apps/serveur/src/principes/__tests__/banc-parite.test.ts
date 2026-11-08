import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { CANAUX } from '../../../../../packages/noyau/src/principes/brouillon.js';
import { differences, memeEtatHorsCanal } from '../../../../../packages/noyau/src/principes/parite.js';
import { OUTILS } from '../../../../../packages/contrat/src/chat/outils.js';
import { creerService } from '../../../../../packages/contrat/src/service.js';
import type { Ecriture } from '../../../../../packages/contrat/src/schemas.js';
import type { CorrectionClassement } from '../../../../../packages/noyau/src/principes/memoire-correction.js';
import { creerApp } from '../../app.js';
import { creerBaseMemoire } from '../../persistance/principes.js';
import { ErreurBanc, OUTILS_COUVERTS, genererActions, jouerBanc, type ActionBanc, type LigneHistorique, type VoieBanc } from '../banc-parite.js';

interface Base { service: ReturnType<typeof creerService>; app: ReturnType<typeof creerApp> }
const apps: Base['app'][] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
function creerBase(): Base {
  const service = creerService();
  const app = creerApp(service);
  apps.push(app);
  return { service, app };
}
const lireEtat = (b: Base): unknown => b.service.lister();
const trouver = (b: Base, id: string | undefined): Ecriture | null => b.service.lister().find((e) => e.id === id) ?? null;
const ligne = (a: ActionBanc, avant: Ecriture | null, apres: Ecriture, canal: string): LigneHistorique => ({
  action: a.id, objet: apres.id, avant, apres, canal,
});
const chat: VoieBanc<Base> = {
  canal: 'chat',
  async jouer(a, b) {
    const avant = trouver(b, a.cible);
    const cle = `cle-fictive-${a.id}`;
    const apres = a.type === 'creer'
      ? b.service.creer(cle, { libelle: a.libelle, montantCentimes: a.montantCentimes })
      : b.service.modifier(cle, a.cible ?? '', { libelle: a.libelle, montantCentimes: a.montantCentimes, version: avant?.version ?? 0 });
    return ligne(a, avant, apres, 'chat');
  },
};
const clic: VoieBanc<Base> = {
  canal: 'clic',
  async jouer(a, b) {
    const avant = trouver(b, a.cible);
    const headers = { 'idempotency-key': `cle-fictive-${a.id}` };
    const r = a.type === 'creer'
      ? await b.app.inject({ method: 'POST', url: '/ecritures', headers, payload: { libelle: a.libelle, montantCentimes: a.montantCentimes } })
      : await b.app.inject({ method: 'PUT', url: `/ecritures/${a.cible ?? ''}`, headers, payload: { libelle: a.libelle, montantCentimes: a.montantCentimes, version: avant?.version ?? 0 } });
    expect(r.statusCode).toBe(200);
    return ligne(a, avant, r.json<{ body: Ecriture }>().body, 'clic');
  },
};
const entree = (voies: readonly VoieBanc<Base>[], actions = genererActions(20)) => ({ actions, voies, creerBase, lireEtat });
async function codeErreur(p: unknown): Promise<string | undefined> {
  try { await p; } catch (e) { return e instanceof ErreurBanc ? e.code : 'autre'; }
  return undefined;
}
const auDe = (fn: () => unknown): string | undefined => {
  try { fn(); } catch (e) { return e instanceof ErreurBanc ? e.code : 'autre'; }
  return undefined;
};

describe('banc de parité', () => {
  it('vingt-actions-meme-empreinte', async () => {
    const actions = genererActions(20);
    expect(actions).toHaveLength(20);
    const r = await jouerBanc(entree([clic, chat], actions));
    expect(r.identiques).toBe(true);
    expect(r.differences).toEqual([]);
    expect(r.empreintes['clic']).toMatch(/^[0-9a-f]{64}$/);
    expect(r.empreintes['clic']).toBe(r.empreintes['chat']);
    expect(r.historiques['clic']).toHaveLength(actions.length);
    expect(r.historiques['chat']).toHaveLength(actions.length);
    r.historiques['clic']?.forEach((l, i) => {
      expect(l.canal).toBe('clic');
      expect(r.historiques['chat']?.[i]?.canal).toBe('chat');
      expect(memeEtatHorsCanal(l, r.historiques['chat']?.[i])).toBe(true);
    });
    expect(r.historiques['clic']?.some((l) => l.avant !== null)).toBe(true);
  });

  it('voie-divergente-detectee', async () => {
    const forgee: VoieBanc<Base> = {
      canal: 'chat',
      async jouer(a, b) {
        if (a.id !== genererActions(20)[19]?.id) return chat.jouer(a, b);
        const l = await chat.jouer({ ...a, montantCentimes: a.montantCentimes + 1 }, b);
        return { ...l, apres: { ...l.apres as Ecriture, montantCentimes: a.montantCentimes } };
      },
    };
    const r = await jouerBanc(entree([clic, forgee]));
    expect(r.identiques).toBe(false);
    expect(r.empreintes['clic']).not.toBe(r.empreintes['chat']);
    expect(r.differences.length).toBeGreaterThan(0);
    expect(r.differences.some((d) => d.includes('montantCentimes'))).toBe(true);
    expect(r.differences.some((d) => d.startsWith('historique'))).toBe(false);
  });

  it('historique-divergent-detecte', async () => {
    const bavarde: VoieBanc<Base> = {
      canal: 'chat',
      async jouer(a, b) {
        const l = await chat.jouer(a, b);
        return a.id === genererActions(20)[0]?.id ? { ...l, objet: 'autre' } : l;
      },
    };
    const r = await jouerBanc(entree([clic, bavarde]));
    expect(r.empreintes['clic']).toBe(r.empreintes['chat']);
    expect(r.identiques).toBe(false);
    expect(r.differences.some((d) => d.includes('objet'))).toBe(true);
  });

  it('bases-independantes', async () => {
    const vues: Base[] = [];
    const tailles: number[] = [];
    const espion = (v: VoieBanc<Base>): VoieBanc<Base> => ({
      canal: v.canal,
      async jouer(a, b) {
        if (a.id === genererActions(1)[0]?.id) {
          vues.push(b);
          tailles.push(b.service.lister().length);
        }
        return v.jouer(a, b);
      },
    });
    const r = await jouerBanc(entree([espion(clic), espion(chat)]));
    expect(tailles).toEqual([0, 0]);
    expect(vues[0]).not.toBe(vues[1]);
    expect(vues[0]?.service.lister()).toHaveLength(r.historiques['clic']?.filter((l) => l.avant === null).length ?? -1);
  });

  it('correction-par-quatre-voies', async () => {
    const canaux = CANAUX.slice(0, 4);
    const corr = (canal: string, nouveauCompte = '616'): CorrectionClassement => ({
      societeId: 'societe-a', fournisseurId: 'f-fictif', libelle: 'Papeterie fictive', ancienCompte: '606', nouveauCompte, canal, ecritureId: 'E1', date: '2026-01-02',
    });
    const jouer = async (canal: string, nouveauCompte?: string) => {
      const base = creerBaseMemoire();
      await base.corrections.ajouter(corr(canal, nouveauCompte));
      return base.corrections.lister('societe-a');
    };
    const listes = await Promise.all(canaux.map((c) => jouer(c)));
    expect(new Set(canaux).size).toBe(4);
    listes.forEach((l, i) => {
      expect(l).toHaveLength(1);
      expect(l[0]?.canal).toBe(canaux[i]);
      expect(memeEtatHorsCanal(l, listes[0])).toBe(true);
      expect(differences(l, listes[0])).toEqual([]);
    });
    const faussee = await jouer(canaux[1] ?? 'chat', '999');
    expect(memeEtatHorsCanal(faussee, listes[0])).toBe(false);
    expect(differences(faussee, listes[0])).toEqual(['[0].nouveauCompte']);
  });

  it('chaque-outil-b-couvert', () => {
    const b = OUTILS.filter((o) => o.niveau === 'B').map((o) => o.nom).sort();
    expect(b.length).toBeGreaterThan(0);
    expect(b).toContain('proposer_validation');
    expect(Object.keys(OUTILS_COUVERTS).sort()).toEqual(b);
    for (const nom of b) expect((OUTILS_COUVERTS[nom] ?? '').trim()).not.toBe('');
  });

  it('aucun-appel-de-modele', () => {
    for (const f of ['../banc-parite.ts', './banc-parite.test.ts']) {
      const texte = readFileSync(new URL(f, import.meta.url), 'utf8');
      const imports = [...texte.matchAll(/^import[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] ?? '');
      expect(imports.length).toBeGreaterThan(0);
      for (const i of imports) {
        expect(i).not.toMatch(/(^|\/)ia(\/|$)/);
        expect(i.toLowerCase()).not.toContain('passerelle');
      }
    }
  });

  it('entrees-invalides', async () => {
    for (const n of [0, Number.NaN, 2.5, Number.POSITIVE_INFINITY, -1]) {
      expect(auDe(() => genererActions(n))).toBe('entree_invalide');
    }
    expect(genererActions(1)).toHaveLength(1);
    expect(genererActions(7)).toEqual(genererActions(7));
    expect(await codeErreur(jouerBanc(entree([])))).toBe('entree_invalide');
    expect(await codeErreur(jouerBanc(entree([clic, clic])))).toBe('entree_invalide');
  });
});
