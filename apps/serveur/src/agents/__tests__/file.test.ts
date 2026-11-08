import { describe, expect, it } from 'vitest';
import { ETAPES_PIECE } from '../../../../../packages/noyau/src/chat/types.js';
import type { Resultat } from '../../../../../packages/noyau/src/agents/superviseur.js';
import { FileTaches, type AgentAsync, type StockageFile, type Tache } from '../file.js';

// Faux serveur de la file de la console : tout est en mémoire, rien de réel.
class FauxStockage implements StockageFile {
  resultats = new Map<string, Resultat>();
  taches = new Map<string, Tache>();
  async lireResultat(cle: string) {
    return this.resultats.get(cle);
  }
  async ecrireResultat(cle: string, r: Resultat) {
    this.resultats.set(cle, r);
  }
  async lireTache(id: string) {
    const t = this.taches.get(id);
    return t === undefined ? undefined : { ...t };
  }
  async ecrireTache(t: Tache) {
    this.taches.set(t.id, { ...t });
  }
}

const OK: Resultat = { issue: 'ok' };
const BORNES = { maxEtapes: 20, maxReprises: 2 };
const compteur = () => {
  const appels: Record<string, number> = {};
  const agents: Record<string, AgentAsync> = Object.fromEntries(
    ETAPES_PIECE.map((e) => [
      e,
      async () => {
        appels[e] = (appels[e] ?? 0) + 1;
        return OK;
      },
    ]),
  );
  return { appels, agents };
};

describe('file persistante des tâches', () => {
  it('reprise-apres-redemarrage', async () => {
    const s = new FauxStockage();
    let coupure = true;
    const { agents } = compteur();
    agents['classee'] = async () => {
      if (coupure) throw new Error('arret du processus');
      return OK;
    };
    const avant = new FileTaches(s);
    const t1 = await avant.lancer('p1', agents, { maxEtapes: 20, maxReprises: 1 }).fin;
    expect(t1.statut).toBe('terminee');
    expect(t1.etat).toBe('en_attente');
    // Nouvelle instance sur le même stockage : la tâche en cours repart de son état.
    const id = avant.identifiant('p1', 'v1');
    await s.ecrireTache({ ...t1, statut: 'en_cours', etat: 'classee', reprises: 0 });
    coupure = false;
    const t2 = await new FileTaches(s).reprendre(id, agents, BORNES);
    expect(t2.etat).toBe('proposition_prete');
    expect(t2.statut).toBe('terminee');
    expect(await new FileTaches(s).suivre(id)).toEqual(t2);
  });

  it('etape-jamais-rejouee', async () => {
    const s = new FauxStockage();
    const { agents, appels } = compteur();
    await new FileTaches(s).lancer('p2', agents, BORNES).fin;
    const id = new FileTaches(s).identifiant('p2', 'v1');
    await s.ecrireTache({ ...(await s.lireTache(id))!, statut: 'en_cours', etat: 'recue', etapes: 0 });
    const t = await new FileTaches(s).reprendre(id, agents, BORNES);
    expect(t.etat).toBe('proposition_prete');
    for (const e of ETAPES_PIECE.slice(0, -1)) expect(appels[e]).toBe(1);
    const autreVersion = await new FileTaches(s).lancer('p2', agents, { ...BORNES, version: 'v2' }).fin;
    expect(autreVersion.etat).toBe('proposition_prete');
    expect(appels['recue']).toBe(2);
  });

  it('tour-long-suivi-par-id', async () => {
    const s = new FauxStockage();
    const { agents } = compteur();
    let libere = (): void => undefined;
    const porte = new Promise<void>((r) => (libere = r));
    agents['lue_a'] = async () => {
      await porte;
      return OK;
    };
    const file = new FileTaches(s);
    const { id, fin } = file.lancer('p3', agents, BORNES);
    expect(id).toBe('p3:tache:v1');
    await Promise.resolve();
    const enCours = await file.suivre(id);
    expect(enCours?.statut).toBe('en_cours');
    expect(enCours?.pieceId).toBe('p3');
    expect(await file.suivre('inconnu:tache:v1')).toBeUndefined();
    libere();
    expect((await fin).statut).toBe('terminee');
    expect((await file.suivre(id))?.etat).toBe('proposition_prete');
  });

  it('borne-de-reprises', async () => {
    const s = new FauxStockage();
    let essais = 0;
    const { agents } = compteur();
    agents['lue_b'] = async () => {
      essais += 1;
      throw new Error('echec');
    };
    const t = await new FileTaches(s).lancer('p4', agents, { maxEtapes: 20, maxReprises: 2 }).fin;
    expect(t.etat).toBe('en_attente');
    expect(t.reprises).toBe(3);
    expect(essais).toBe(3);
    const court = await new FileTaches(s).lancer('p5', compteur().agents, { maxEtapes: 2, maxReprises: 2 }).fin;
    expect(court.etat).toBe('en_attente');
    const sans = await new FileTaches(s).lancer('p6', {}, BORNES).fin;
    expect(sans.etat).toBe('en_attente');
    for (const v of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => new FileTaches(s).lancer('p7', {}, { maxEtapes: v, maxReprises: 1 })).toThrow(RangeError);
    expect(() => new FileTaches(s).lancer('p7', {}, { maxEtapes: 1, maxReprises: Number.NaN })).toThrow(RangeError);
    expect(() => new FileTaches(s).lancer('p:7', {}, BORNES)).toThrow(RangeError);
    await expect(new FileTaches(s).reprendre('absente:tache:v1', {}, BORNES)).rejects.toThrow(RangeError);
  });
});
