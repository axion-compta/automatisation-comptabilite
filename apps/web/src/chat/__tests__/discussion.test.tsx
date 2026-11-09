// @vitest-environment jsdom
// Fiche L05-T52 : panneau Discussion sur faux serveur (propositions) et flux SSE simulé (messages).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { encoderEvenement } from '../../../../../packages/contrat/src/chat/flux.js';
import type { Evenement } from '../../../../../packages/contrat/src/chat/evenements.js';
import { e25 } from '../../../../../packages/textes/src/ecrans/e25.js';
import { COMMANDES } from '../../commandes/barre-oblique.js';
import { Discussion } from '../Discussion.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type Brut = Omit<Evenement, 'id'>;
const FIN = { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 } as Brut;
const prop = (id: string, niveau: 'B' | 'M'): Brut => ({ type: 'proposition', proposition_id: id, niveau, nombre_objets: 1 }) as Brut;
const nouv = (id: string, niveau: 'B' | 'M') => ({ id, outil: 'enregistrer_ecriture', niveau, cibles: [id], avant: { montantCentimes: 0 }, apres: { montantCentimes: 1200 } });
const PAR_TEXTE: Record<string, Brut[]> = {
  bonjour: [{ type: 'tour.debut' }, { type: 'etape', etape: 'lecture' }, { type: 'texte', texte: 'Réponse fictive' }, FIN] as Brut[],
  proposer: [{ type: 'tour.debut' }, { type: 'texte', texte: 'Voici' }, prop('prp_b', 'B'), prop('prp_m', 'M'), FIN] as Brut[],
  panne: [{ type: 'tour.debut' }, { type: 'erreur', code: 'ia_indisponible' }, FIN] as Brut[],
  choix: [{ type: 'tour.debut' }, { type: 'question', choix: [{ code: 'compte_a', libelle_code: 'Compte A' }, { code: 'compte_b', libelle_code: 'Compte B' }] }, FIN] as Brut[],
};
let [noeud, racine, vraiFetch]: [{ fermer: () => void } | null, Root | null, typeof fetch | null] = [null, null, null];
let appels: Array<{ methode: string; url: string; corps: string; entetes: Record<string, string> }> = [];
let mode: 'normal' | 'coupe' | 'pendu' = 'normal';
beforeAll(() => ([noeud, vraiFetch] = [demarrerNoeud({ propositions: { ajouts: [nouv('prp_b', 'B'), nouv('prp_m', 'M')] } }), globalThis.fetch]));
afterAll(() => noeud?.fermer());
afterEach(() => (act(() => racine?.unmount()), (document.body.innerHTML = ''), vi.unstubAllGlobals(), (appels = []), (mode = 'normal')));
const flux = (evts: Brut[], fin: number, ferme: boolean) => {
  const enc = new TextEncoder();
  const morceaux = evts.map((e, i) => encoderEvenement(i + 1, e as Evenement)).slice(0, fin);
  return new Response(new ReadableStream<Uint8Array>({ start(c) { morceaux.forEach((m) => c.enqueue(enc.encode(m))); if (ferme) c.close(); } }), { headers: { 'content-type': 'text/event-stream' } });
};
// Le faux serveur enveloppe les réponses dans { body } (forme oRPC) ; api.ts lit la forme nue : on déballe ici.
const deballer = (url: string) => async (r: Response) => (r.ok && /\/(appliquer|annuler|pourquoi)$/.test(url) ? Response.json(((await r.json()) as { body: unknown }).body) : r);
function reseau() {
  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    const entetes = (init.headers ?? {}) as Record<string, string>;
    appels.push({ methode: init.method ?? 'GET', url: String(url), corps: String(init.body ?? ''), entetes });
    if (!String(url).endsWith('/chat/messages')) return vraiFetch!(url, init).then(deballer(String(url)));
    const texte = JSON.parse(String(init.body)).texte as string;
    const evts = PAR_TEXTE[texte.split(' ')[0]!.toLowerCase()] ?? PAR_TEXTE['bonjour']!;
    const reprise = entetes['last-event-id'] !== undefined;
    if (mode === 'coupe') return Promise.resolve(reprise ? flux(evts, evts.length, true) : flux(evts, 2, true));
    return Promise.resolve(flux(evts, mode === 'pendu' ? 3 : evts.length, mode !== 'pendu'));
  });
}
const pause = (ms = 20) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const attendre = async (condition: () => boolean) => (await vi.waitFor(() => expect(condition()).toBe(true), { interval: 20 }), pause(0));
async function monter(props: { dureeAnnulationMs?: number } = {}) {
  reseau();
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => racine?.render(<Discussion onOuvrirVue={() => undefined} {...props} />));
}
const texte = (t: string) => document.body.textContent?.includes(t) === true;
const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t) as HTMLButtonElement;
const champ = () => document.querySelector('textarea') as HTMLTextAreaElement;
const posts = (fin: string) => appels.filter((a) => a.methode === 'POST' && a.url.endsWith(fin));
const ecrire = (valeur: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(champ(), valeur);
  champ().dispatchEvent(new Event('input', { bubbles: true }));
});
const clic = (b: HTMLElement) => act(async () => b.click());
const touche = async (el: HTMLElement, key: string, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  return (await act(async () => void el.dispatchEvent(e)), e);
};
const dire = async (valeur: string) => (await ecrire(valeur), await clic(bouton(e25.envoyer)));
const appliques = () => posts('/appliquer').length;
describe('Discussion E25', () => {
  it('envoi-et-reponse', async () => {
    await monter();
    await dire('Bonjour fictif');
    await attendre(() => texte('Réponse fictive'));
    expect(texte('Bonjour fictif')).toBe(true);
    const envoi = posts('/chat/messages');
    expect(envoi).toHaveLength(1);
    expect(envoi[0]!.entetes['idempotency-key']).toBe(JSON.parse(envoi[0]!.corps).message_id);
    expect(champ().value).toBe('');
  });
  it('entree-envoie-maj-entree-ligne', async () => {
    await monter();
    await ecrire('Bonjour');
    expect((await touche(champ(), 'Enter', true)).defaultPrevented).toBe(false);
    expect(posts('/chat/messages')).toHaveLength(0);
    expect((await touche(champ(), 'Enter')).defaultPrevented).toBe(true);
    await attendre(() => posts('/chat/messages').length === 1);
  });
  it('stop-coupe-et-garde-les-propositions', async () => {
    mode = 'pendu';
    await monter();
    await dire('Proposer');
    await attendre(() => bouton(e25.stop) !== undefined && texte(e25.carte.appliquer));
    await clic(bouton(e25.stop));
    await attendre(() => bouton(e25.stop) === undefined);
    expect(posts('/arreter')).toHaveLength(1);
    expect(texte(e25.carte.appliquer)).toBe(true);
  });
  it('reprise-apres-coupure-sans-doublon', async () => {
    mode = 'coupe';
    await monter();
    await dire('Bonjour');
    await attendre(() => texte('Réponse fictive'));
    const envois = posts('/chat/messages');
    expect(envois).toHaveLength(2);
    expect(envois[1]!.entetes['last-event-id']).toBe('2');
    expect(document.body.textContent!.split('Réponse fictive')).toHaveLength(2);
    expect(document.querySelectorAll('.axion-etapes li')).toHaveLength(1);
  });
  it('appliquer-puis-toast', async () => {
    await monter({ dureeAnnulationMs: 60000 });
    await dire('Proposer');
    await attendre(() => texte(e25.carte.appliquer));
    await clic(bouton(e25.carte.appliquer));
    await attendre(() => bouton(e25.toast.annuler) !== undefined);
    expect(appliques()).toBe(1);
    expect(posts('/appliquer')[0]!.url).toContain('prp_b');
    await clic(bouton(e25.toast.annuler));
    await attendre(() => posts('/annuler').length === 1);
    expect(bouton(e25.toast.annuler)).toBeUndefined();
  });
  it('entree-n-applique-pas-une-carte-m', async () => {
    await monter();
    await dire('Proposer');
    await attendre(() => document.querySelectorAll('.axion-carte-action').length === 2);
    const carteM = document.querySelectorAll('.axion-carte-action')[1]!;
    const appliquer = [...carteM.querySelectorAll('button')].find((b) => b.textContent === e25.carte.appliquer)!;
    expect((await touche(appliquer, 'Enter')).defaultPrevented).toBe(true);
    expect(appliques()).toBe(0);
    await clic(appliquer);
    expect(appliques()).toBe(0);
    await clic([...carteM.querySelectorAll('button')].find((b) => b.textContent === e25.carte.confirmer)!);
    await attendre(() => appliques() === 1);
  });
  it('regenerer-ne-reapplique-pas', async () => {
    await monter();
    await dire('Proposer');
    await attendre(() => texte(e25.carte.appliquer));
    await clic(bouton(e25.carte.appliquer));
    await attendre(() => appliques() === 1);
    await clic(bouton(e25.regenerer));
    await attendre(() => posts('/chat/messages').length === 2);
    await pause(60);
    expect(appliques()).toBe(1);
    expect(JSON.parse(posts('/chat/messages')[1]!.corps).texte).toBe('Proposer');
  });
  it('mode-sans-modele-propose-les-commandes', async () => {
    await monter();
    await dire('Panne');
    await attendre(() => texte(e25.modeSansModele));
    for (const c of COMMANDES) expect(bouton(c.nom)).toBeDefined();
    await clic(bouton(COMMANDES[0]!.nom));
    expect(champ().value.startsWith('/' + COMMANDES[0]!.nom)).toBe(true);
  });
  it('question-choix-cliquables', async () => {
    await monter();
    await dire('Choix');
    await attendre(() => bouton('Compte B') !== undefined);
    await clic(bouton('Compte B'));
    await attendre(() => posts('/chat/messages').length === 2);
    expect(JSON.parse(posts('/chat/messages')[1]!.corps).texte).toBe('compte_b');
  });
  it('axe-sans-violation', async () => {
    await monter();
    await dire('Proposer');
    await attendre(() => texte(e25.carte.appliquer));
    await clic(bouton(e25.pourquoi.bouton));
    await attendre(() => document.querySelector('.axion-pourquoi') !== null);
    const nom = (el: Element) => (el.textContent ?? '').trim() || el.getAttribute('aria-label') || (el as HTMLInputElement).labels?.[0]?.textContent || '';
    for (const el of document.querySelectorAll('button, textarea')) expect(nom(el), el.outerHTML).not.toBe('');
    expect(champ().labels?.[0]?.textContent).toBe(e25.saisie.libelle);
    expect(document.querySelectorAll('[role="log"], [aria-live]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])')).toHaveLength(0);
  });
});
