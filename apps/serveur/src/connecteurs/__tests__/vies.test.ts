import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErreurVies, verifierVies, verifierViesTracee, type PortVies } from '../vies.js';

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

describe('connecteur VIES : trace de la requête', () => {
  const BRUT = '{"valid":true,"requestIdentifier":"FICTIF"}';
  const sha = (t: string) => createHash('sha256').update(t).digest('hex');
  const horloge = () => new Date('2027-03-04T10:11:12.000Z');
  const tracer = (port: PortVies, o: { ouvert?: boolean; numero?: string } = {}) =>
    verifierViesTracee({ port, numero: o.numero ?? BON, delaiMs: DELAI, ouvert: o.ouvert ?? true, maintenant: horloge, idRequete: () => 'req-0001' });

  it('reponse-tracee-id-horodatage-empreinte', async () => {
    const port: PortVies = { verifier: () => Promise.resolve({ valide: true, reponseBrute: BRUT }) };
    const t = await tracer(port);
    expect(t).toEqual({ etat: 'valide', idRequete: 'req-0001', horodatage: '2027-03-04T10:11:12.000Z', empreinteReponse: sha(BRUT) });
    expect(JSON.stringify(t)).not.toContain('FICTIF');
    const autre = await tracer({ verifier: () => Promise.resolve({ valide: true, reponseBrute: BRUT + ' ' }) });
    expect(autre.empreinteReponse).not.toBe(t.empreinteReponse);
    const invalide = await tracer({ verifier: () => Promise.resolve({ valide: false, reponseBrute: '{"valid":false}' }) });
    expect(invalide.etat).toBe('invalide');
    expect(invalide.empreinteReponse).toBe(sha('{"valid":false}'));
    // Sans réponse brute fournie, l'empreinte porte sur la forme canonique du verdict.
    expect((await tracer(faux({ valide: true }).port)).empreinteReponse).toBe(sha('{"valide":true}'));
    // La projection historique reste inchangée.
    expect(await verifierVies({ port, numero: BON, delaiMs: DELAI, ouvert: true })).toEqual({ issue: 'valide' });
  });

  it('panne-a-confirmer', async () => {
    const t = await tracer(faux('serveur').port);
    expect(t).toEqual({ etat: 'a_confirmer', idRequete: 'req-0001', horodatage: '2027-03-04T10:11:12.000Z', empreinteReponse: null });
    const mal: PortVies = { verifier: () => Promise.resolve({ valide: 'oui' } as unknown as { valide: boolean }) };
    expect((await tracer(mal)).etat).toBe('a_confirmer');
  });

  it('delai-depasse-a-confirmer', async () => {
    const t = await tracer(faux('pendu').port);
    expect(t.etat).toBe('a_confirmer');
    expect(t.empreinteReponse).toBeNull();
    expect(t.idRequete).toBe('req-0001');
  });

  it('jamais-valide-par-defaut', async () => {
    const f = faux({ valide: true });
    for (const o of [{ ouvert: false }, { numero: CLE_FAUSSE }, { numero: 'DE123456789' }, { numero: REMPLISSAGE }]) {
      const t = await tracer(f.port, o);
      expect(t.etat, JSON.stringify(o)).not.toBe('valide');
      expect(t.empreinteReponse).toBeNull();
    }
    expect((await tracer(f.port, { ouvert: false })).etat).toBe('a_confirmer');
    expect((await tracer(f.port, { numero: CLE_FAUSSE })).etat).toBe('invalide');
    expect(f.appels).toEqual([]);
  });
});
