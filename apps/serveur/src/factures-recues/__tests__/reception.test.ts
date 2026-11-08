import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { creerFauxAlertes } from '../../../../../packages/noyau/src/exploitation/port-alerte.js';
import { type Arrivee, tvaComptee } from '../../../../../packages/noyau/src/factures-recues/cycle.js';
import {
  type AdaptateurPlateforme, type AlerteReception, type PortCoffre, type PortEtatReception, type ValeurReception,
  envoyerStatutValide, rangerArrivees, rattraper, verifierWebhook,
} from '../reception.js';

const SOCIETE = '123456782';
const EMETTEUR = '987654324';
const MIN = 60_000;
const FENETRE = 5 * MIN;
const ATTENTE = 10 * MIN;
const APPEL = 2 * MIN;
const NOM_SECRET = 'secret-webhook';
const SECRET = 'q'.repeat(8) + 'z'.repeat(8);
const MAINTENANT = Date.UTC(2026, 2, 10, 12);
type Brute = Omit<Arrivee, 'source'>;

const brute = (n: number, o: Partial<Brute> = {}): Brute => ({ idExterne: `EXT-${String(n)}`, sirenEmetteur: EMETTEUR,
  sirenDestinataire: SOCIETE, numero: `F-2026-${String(n)}`, date: '2026-03-10', ttc: centimes(12000), tva: centimes(2000), ...o });
const coffre = (v: string | undefined): PortCoffre => ({ lireSecret: async () => v });
const signer = (corps: Uint8Array, h: number, s = SECRET): string =>
  createHmac('sha256', s).update(`${String(h)}.`).update(corps).digest('hex');

function faux(pages: Record<string, { arrivees: Brute[]; curseurSuivant: string | null }>, panne?: () => Promise<never>) {
  const accuses: string[] = [];
  const statuts: { id: string; envoi: unknown }[] = [];
  const appels: (string | null)[] = [];
  const a: AdaptateurPlateforme = {
    nom: 'plateforme-fictive', authentifier: async () => undefined, telecharger: async () => new Uint8Array(), sante: async () => true,
    lister: async (c) => { appels.push(c); return panne ? panne() : pages[c ?? ''] ?? { arrivees: [], curseurSuivant: c }; },
    accuser: async (id) => { accuses.push(id); },
    envoyerStatut: async (id, envoi) => { statuts.push({ id, envoi }); },
  };
  return { a, accuses, statuts, appels };
}
function etatMemoire(init: Partial<ValeurReception> = {}) {
  let v: ValeurReception = { etat: { factures: [] }, curseurs: {}, derniereReceptionMs: {}, ...init };
  const port: PortEtatReception = { lire: async () => structuredClone(v), ecrire: async (_s, n) => { v = structuredClone(n); } };
  return { port, val: () => v };
}
const codeWebhook = async (corps: Uint8Array, signature: string, h: number, s: string | null = SECRET) =>
  verifierWebhook({ corps, signature, horodatageMs: h }, { coffre: coffre(s ?? undefined), nomSecret: NOM_SECRET, maintenantMs: MAINTENANT, toleranceMs: FENETRE });

afterEach(() => { vi.useRealTimers(); });

describe('webhook', () => {
  const corps = new TextEncoder().encode('{"id":"EXT-1"}');
  it('webhook-signature-valide-accepte', async () => {
    expect(await codeWebhook(corps, signer(corps, MAINTENANT), MAINTENANT)).toEqual({ ok: true });
  });
  it('webhook-signature-fausse-refuse', async () => {
    const bonne = signer(corps, MAINTENANT);
    const modifie = corps.map((o, i) => (i === 0 ? o ^ 1 : o));
    for (const [c, s] of [[modifie, bonne], [corps, bonne.slice(0, -2)], [corps, ''], [corps, `${bonne}00`], [corps, signer(corps, MAINTENANT, 'autre')]] as const) {
      expect(await codeWebhook(c, s, MAINTENANT)).toEqual({ ok: false, code: 'signature_invalide' });
    }
  });
  it('webhook-perime-refuse', async () => {
    for (const h of [MAINTENANT - ATTENTE, MAINTENANT + ATTENTE, Number.NaN, Infinity]) {
      expect(await codeWebhook(corps, signer(corps, h), h)).toEqual({ ok: false, code: 'webhook_perime' });
    }
    const reglages = [{ maintenantMs: Number.NaN, toleranceMs: FENETRE }, { maintenantMs: Infinity, toleranceMs: FENETRE },
      { maintenantMs: 1e13, toleranceMs: Number.NaN }, { maintenantMs: 1e13, toleranceMs: Infinity }, { maintenantMs: 1e13, toleranceMs: -1 }];
    for (const r of reglages) {
      const res = await verifierWebhook({ corps, signature: signer(corps, 0), horodatageMs: 0 }, { coffre: coffre(SECRET), nomSecret: NOM_SECRET, ...r });
      expect(res).toEqual({ ok: false, code: 'webhook_perime' });
    }
    expect(await codeWebhook(corps, signer(corps, MAINTENANT - FENETRE), MAINTENANT - FENETRE)).toEqual({ ok: true });
  });
  it('webhook-sans-secret-refuse', async () => {
    for (const s of [null, '']) {
      expect(await codeWebhook(corps, signer(corps, MAINTENANT, ''), MAINTENANT, s)).toEqual({ ok: false, code: 'secret_absent' });
    }
  });
});

function ctx(f: { a: AdaptateurPlateforme }, init: Partial<ValeurReception> = {}) {
  const m = etatMemoire(init);
  const { port: alerte, recues } = creerFauxAlertes<AlerteReception>();
  const p = { societeId: 's1', sirenSociete: SOCIETE, adaptateur: f.a, ports: { etat: m.port, coffre: coffre(SECRET) },
    maintenantMs: MAINTENANT, delaiAlerteMs: ATTENTE, delaiAppelMs: APPEL, alerte };
  return { m, recues, p, ports: { etat: m.port, alerte }, curseur: () => m.val().curseurs['plateforme-fictive'] };
}

describe('rangement et rattrapage', () => {
  it('pa2-doublon-entre-webhook-et-rattrapage-tva-une-fois', async () => {
    const f = faux({});
    const { m, recues, ports } = ctx(f);
    await rangerArrivees('s1', SOCIETE, f.a, [brute(1)], ports);
    await rangerArrivees('s1', SOCIETE, f.a, [brute(2, { numero: 'F-2026-1' })], ports);
    expect(m.val().etat.factures.map((x) => x.rattacheeA === null)).toEqual([true, false]);
    expect(tvaComptee(m.val().etat)).toBe(centimes(2000));
    expect(f.accuses).toEqual(['EXT-1', 'EXT-2']);
    await rangerArrivees('s1', SOCIETE, f.a, [brute(3, { sirenDestinataire: EMETTEUR })], ports);
    expect([m.val().etat.factures.length, f.accuses.length]).toEqual([2, 2]);
    expect(recues).toEqual([{ code: 'facture_autre_destinataire', plateforme: 'plateforme-fictive', idExterne: 'EXT-3' }]);
  });
  it('pa4-rejeu-idempotent', async () => {
    const f = faux({});
    const { m, ports } = ctx(f);
    for (let i = 0; i < 3; i++) await rangerArrivees('s1', SOCIETE, f.a, [brute(1)], ports);
    expect(m.val().etat.factures).toHaveLength(1);
    expect(tvaComptee(m.val().etat)).toBe(centimes(2000));
  });
  it('pa5-rattrapage-par-curseur', async () => {
    const f = faux({
      '': { arrivees: [brute(1)], curseurSuivant: 'p2' },
      p2: { arrivees: [brute(2, { ttc: centimes(6000), tva: centimes(1000) })], curseurSuivant: 'p3' },
    });
    const { m, recues, p, curseur } = ctx(f);
    await rattraper(p);
    expect(curseur()).toBe('p2');
    const echoue = { ...f.a, accuser: async (id: string) => { if (id === 'EXT-2') throw new Error('coupure'); } };
    await rattraper({ ...p, adaptateur: echoue });
    expect(curseur()).toBe('p2');
    expect(recues.at(-1)).toEqual({ code: 'plateforme_en_echec', plateforme: 'plateforme-fictive' });
    await rattraper(p);
    expect(curseur()).toBe('p3');
    expect(m.val().etat.factures).toHaveLength(2);
    expect(tvaComptee(m.val().etat)).toBe(centimes(3000));
  });
  it('arrivee-mal-formee-alerte-sans-bloquer-la-page', async () => {
    const f = faux({ '': { arrivees: [brute(1, { date: '2026-02-30' }), brute(2)], curseurSuivant: 'p2' } });
    const { m, recues, p, curseur } = ctx(f, { derniereReceptionMs: { 'plateforme-fictive': MAINTENANT - ATTENTE - 1 } });
    expect(await rattraper(p)).toEqual({ rangees: 1, echec: false });
    expect(m.val().etat.factures.map((x) => x.idExterne)).toEqual(['EXT-2']);
    expect(f.accuses).toEqual(['EXT-2']);
    expect(curseur()).toBe('p2');
    expect(recues).toEqual([{ code: 'arrivee_invalide', plateforme: 'plateforme-fictive', idExterne: 'EXT-1' }]);
  });
  it('plateforme-en-echec-alerte-sans-bascule', async () => {
    vi.useFakeTimers();
    const leve = faux({}, async () => { throw new Error('panne'); });
    const { recues, p, curseur } = ctx(leve, { curseurs: { 'plateforme-fictive': 'c0' } });
    expect(await rattraper(p)).toEqual({ rangees: 0, echec: true });
    const enCours = rattraper({ ...p, adaptateur: faux({}, () => new Promise<never>(() => undefined)).a });
    await vi.advanceTimersByTimeAsync(APPEL);
    expect((await enCours).echec).toBe(true);
    expect(recues.map((r) => r.code)).toEqual(['plateforme_en_echec', 'plateforme_en_echec']);
    expect(curseur()).toBe('c0');
    expect(leve.appels).toEqual(['c0']);
  });
  it('reception-en-retard-alerte', async () => {
    const { recues, p } = ctx(faux({}), { derniereReceptionMs: { 'plateforme-fictive': MAINTENANT - ATTENTE - 1 } });
    await rattraper(p);
    expect(recues).toEqual([{ code: 'reception_en_retard', plateforme: 'plateforme-fictive' }]);
    recues.length = 0;
    await rattraper({ ...p, delaiAlerteMs: ATTENTE + 2 });
    expect(recues).toEqual([]);
  });
});

describe('statut', () => {
  it('pa6-statut-sans-validation-jamais-envoye', async () => {
    const f = faux({});
    const { m, ports } = ctx(f);
    await rangerArrivees('s1', SOCIETE, f.a, [brute(1)], ports);
    const facture = m.val().etat.factures[0]!;
    const permis = ['approuvee'];
    for (const v of [undefined, { par: ' ', le: '2026-03-11' }, { par: 'Alice Test', le: '' }]) {
      expect(await envoyerStatutValide(facture, 'approuvee', permis, v, f.a)).toEqual({ ok: false, code: 'validation_client_requise' });
    }
    expect(await envoyerStatutValide(facture, 'inconnu', permis, { par: 'Alice Test', le: '2026-03-11' }, f.a)).toEqual({ ok: false, code: 'statut_inconnu' });
    expect(f.statuts).toEqual([]);
    expect(await envoyerStatutValide(facture, 'approuvee', permis, { par: 'Alice Test', le: '2026-03-11' }, f.a)).toEqual({ ok: true });
    expect(f.statuts).toEqual([{ id: 'EXT-1', envoi: { statut: 'approuvee', validePar: 'Alice Test', valideLe: '2026-03-11' } }]);
  });
});
