import { describe, expect, it } from 'vitest';
import { ErreurVies, verifierVies, type PortVies } from '../vies.js';

const BON = 'FR11123456782';
const CLE_FAUSSE = 'FR12123456782';
const REMPLISSAGE = 'FRAB123456782';
const DELAI = 50;

type Enregistree = { valide: boolean } | 'serveur' | 'pendu';
function faux(rep: Enregistree) {
  const appels: { pays: string; numero: string }[] = [];
  const port: PortVies = {
    verifier(pays, numero) {
      appels.push({ pays, numero });
      if (rep === 'pendu') return new Promise(() => undefined);
      if (rep === 'serveur') return Promise.reject(new ErreurVies());
      return Promise.resolve(rep);
    },
  };
  return { port, appels };
}
const lancer = (f: ReturnType<typeof faux>, o: { ouvert?: boolean; numero?: string } = {}) =>
  verifierVies({ port: f.port, numero: o.numero ?? BON, delaiMs: DELAI, ...(o.ouvert === undefined ? {} : { ouvert: o.ouvert }) });

describe('connecteur VIES', () => {
  it('interrupteur-ferme : fermé par défaut, aucun appel', async () => {
    const f = faux({ valide: true });
    expect(await lancer(f)).toEqual({ issue: 'interrupteur-ferme' });
    expect(await lancer(f, { ouvert: false })).toEqual({ issue: 'interrupteur-ferme' });
    expect(f.appels).toEqual([]);
  });

  it('valide : réponse enregistrée valide', async () => {
    const f = faux({ valide: true });
    expect(await lancer(f, { ouvert: true })).toEqual({ issue: 'valide' });
    expect(f.appels).toEqual([{ pays: 'FR', numero: '11123456782' }]);
  });

  it('invalide : réponse enregistrée invalide', async () => {
    expect(await lancer(faux({ valide: false }), { ouvert: true })).toEqual({ issue: 'invalide' });
  });

  it('indisponible-impossible : erreur du service = IMPOSSIBLE, jamais valide', async () => {
    const r = await lancer(faux('serveur'), { ouvert: true });
    expect(r).toEqual({ issue: 'indisponible-impossible' });
  });

  it('indisponible-impossible : service qui ne répond pas dans le délai', async () => {
    expect(await lancer(faux('pendu'), { ouvert: true })).toEqual({ issue: 'indisponible-impossible' });
  });

  it('indisponible-impossible : réponse mal formée', async () => {
    const port: PortVies = { verifier: () => Promise.resolve({ valide: 'oui' } as unknown as { valide: boolean }) };
    expect(await verifierVies({ port, numero: BON, ouvert: true, delaiMs: DELAI })).toEqual({ issue: 'indisponible-impossible' });
  });

  it('clé fausse, remplissage, format ou autre pays : pas d appel', async () => {
    for (const numero of [CLE_FAUSSE, REMPLISSAGE, 'FR1', '', 'DE123456789']) {
      const f = faux({ valide: true });
      const r = await lancer(f, { ouvert: true, numero });
      expect(r.issue).toBe(numero === 'DE123456789' ? 'hors-perimetre' : 'cle-invalide');
      expect(f.appels).toEqual([]);
    }
  });

  it('espaces et minuscules acceptés', async () => {
    expect(await lancer(faux({ valide: true }), { ouvert: true, numero: ' fr 11 123456782 ' })).toEqual({ issue: 'valide' });
  });
});
