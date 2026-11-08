import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SanteConnecteur } from '../../../../../packages/noyau/src/sources/connecteurs.js';
import { lireEtatClient, passerSanteQuotidienne, type AlerteSante, type PortEssai, type PortSante } from '../sante-connecteurs.js';

const SEUILS = { echecsAvantDegrade: 2, echecsAvantPanne: null };
const DELAI = 50;
const J1 = '2026-03-01';
const J2 = '2026-03-02';
const J3 = '2026-03-03';

function monde(reponse: (connecteur: string, rang: number) => boolean | 'leve' | 'bloque' = () => true) {
  const base = new Map<string, SanteConnecteur[]>();
  const alertes: AlerteSante[] = [];
  const essais: string[] = [];
  let ecritures = 0;
  let enCours = 0;
  let maxSimultane = 0;
  const essai: PortEssai = {
    async essayer(connecteur, signal) {
      essais.push(connecteur);
      const r = reponse(connecteur, essais.filter((e) => e === connecteur).length);
      if (r === 'leve') throw new Error('hors ligne');
      if (r === 'bloque') return new Promise<boolean>((_, rejeter) => signal.addEventListener('abort', () => rejeter(new Error('interrompu'))));
      return r;
    },
  };
  const stock: PortSante = {
    async lire(clientId) {
      enCours += 1;
      maxSimultane = Math.max(maxSimultane, enCours);
      await Promise.resolve();
      enCours -= 1;
      return base.get(clientId) ?? [];
    },
    async ecrire(clientId, santes) {
      ecritures += 1;
      base.set(clientId, [...santes]);
    },
  };
  const alerter = (a: AlerteSante): void => void alertes.push(a);
  return { stock, essai, alerter, alertes, essais, base, ecritures: () => ecritures, maxSimultane: () => maxSimultane };
}

const lancer = (m: ReturnType<typeof monde>, jour: string, clients = ['client-a'], connecteurs = ['banque-fictive'], delaiMs = DELAI) =>
  passerSanteQuotidienne({ clients, connecteurs, jour, seuils: SEUILS, delaiMs, essai: m.essai, stock: m.stock, alerter: m.alerter });

afterEach(() => vi.useRealTimers());

describe('santé quotidienne des connecteurs', () => {
  it('d1-trois-jours-simules', async () => {
    const m = monde((_, rang) => rang === 3);
    await lancer(m, J1);
    expect((await lireEtatClient(m.stock, 'client-a'))[0]).toMatchObject({ etat: 'ok', bandeau: null });
    await lancer(m, J2);
    expect((await lireEtatClient(m.stock, 'client-a'))[0]).toMatchObject({ etat: 'degrade', bandeau: 'connecteur_degrade', dernierOk: null });
    await lancer(m, J3);
    expect((await lireEtatClient(m.stock, 'client-a'))[0]).toMatchObject({ etat: 'ok', bandeau: null, dernierOk: J3 });
    expect(m.essais).toHaveLength(3);
  });

  it('un-echec-reste-ok', async () => {
    const m = monde(() => false);
    await lancer(m, J1);
    expect(await lireEtatClient(m.stock, 'client-a')).toEqual([{ connecteur: 'banque-fictive', etat: 'ok', dernierOk: null, bandeau: null }]);
    expect(m.alertes).toEqual([]);
  });

  it('essai-qui-leve-compte-comme-echec', async () => {
    const m = monde(() => 'leve');
    for (const j of [J1, J2]) await lancer(m, j);
    expect((await lireEtatClient(m.stock, 'client-a'))[0]?.etat).toBe('degrade');
  });

  it('delai-depasse-compte-comme-echec', async () => {
    vi.useFakeTimers();
    const m = monde(() => 'bloque');
    for (const j of [J1, J2]) {
      const p = lancer(m, j);
      await vi.advanceTimersByTimeAsync(DELAI);
      await p;
    }
    expect((await lireEtatClient(m.stock, 'client-a'))[0]).toMatchObject({ etat: 'degrade', dernierOk: null });
  });

  it('relance-le-meme-jour-idempotente', async () => {
    const m = monde(() => false);
    await lancer(m, J1);
    const avant = structuredClone(m.base.get('client-a'));
    const r = await lancer(m, J1);
    expect(m.base.get('client-a')).toEqual(avant);
    expect(r.clients[0]?.connecteurs[0]?.etat).toBe('deja_fait');
    expect(m.essais).toHaveLength(1);
    expect(m.ecritures()).toBe(1);
  });

  it('alerte-une-seule-fois-au-passage-en-degrade', async () => {
    const m = monde(() => false);
    for (const j of [J1, J2, J3]) await lancer(m, j);
    expect(m.alertes).toEqual([{ code: 'connecteur_degrade', clientId: 'client-a', connecteur: 'banque-fictive' }]);
  });

  it('un-client-n-en-voit-pas-un-autre', async () => {
    const etat: Record<string, boolean> = { 'client-a': false, 'client-b': true };
    let courant = '';
    const m = monde();
    const essai: PortEssai = { essayer: async (c, s) => m.essai.essayer(c, s).then(() => etat[courant] ?? true) };
    const stock: PortSante = {
      lire: async (id) => { courant = id; return m.stock.lire(id); },
      ecrire: (id, s) => m.stock.ecrire(id, s),
    };
    const base = { clients: ['client-a', 'client-b'], connecteurs: ['banque-fictive'], seuils: SEUILS, delaiMs: DELAI, essai, stock, alerter: m.alerter };
    await passerSanteQuotidienne({ ...base, jour: J1 });
    await passerSanteQuotidienne({ ...base, jour: J2 });
    expect((await lireEtatClient(m.stock, 'client-a'))[0]?.etat).toBe('degrade');
    expect((await lireEtatClient(m.stock, 'client-b'))[0]?.etat).toBe('ok');
    expect(m.alertes.map((a) => a.clientId)).toEqual(['client-a']);
    expect(m.maxSimultane()).toBe(1);
  });

  it('etat-lu-trie-par-nom', async () => {
    const m = monde((c) => c !== 'banque-fictive');
    expect(await lireEtatClient(m.stock, 'client-a')).toEqual([]);
    await lancer(m, J1, ['client-a'], ['zeta-fictif', 'banque-fictive', 'alpha-fictif']);
    const etat = await lireEtatClient(m.stock, 'client-a');
    expect(etat.map((e) => e.connecteur)).toEqual(['alpha-fictif', 'banque-fictive', 'zeta-fictif']);
    expect(etat.every((e) => e.dernierOk === (e.connecteur === 'banque-fictive' ? null : J1))).toBe(true);
  });

  it.each([
    ['NaN', { echecsAvantDegrade: NaN, echecsAvantPanne: null }, 'seuil_invalide'],
    ['zéro', { echecsAvantDegrade: 0, echecsAvantPanne: null }, 'seuil_invalide'],
    ['non entier', { echecsAvantDegrade: 1.5, echecsAvantPanne: null }, 'seuil_invalide'],
    ['panne <= dégradé', { echecsAvantDegrade: 2, echecsAvantPanne: 2 }, 'seuils_incoherents'],
  ])('seuils-invalides-propages (%s)', async (_nom, seuils, code) => {
    const m = monde();
    await expect(passerSanteQuotidienne({ clients: ['client-a'], connecteurs: ['banque-fictive'], jour: J1, seuils, delaiMs: DELAI, essai: m.essai, stock: m.stock, alerter: m.alerter }))
      .rejects.toMatchObject({ code });
    expect(m.ecritures()).toBe(0);
  });

  it('jour-mal-forme-propage', async () => {
    await expect(lancer(monde(), '2026-13-40')).rejects.toMatchObject({ code: 'jour_invalide' });
  });
});
