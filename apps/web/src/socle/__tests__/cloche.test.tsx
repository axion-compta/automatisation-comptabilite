// @vitest-environment jsdom
// Fiche L15-T52 : tiroir T08 (la cloche).
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { t08 } from '../../../../../packages/textes/src/ecrans/t08.js';
import { FournisseurDonnees, creerClient } from '../../donnees/lecture.js';
import { Cloche } from '../Cloche.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
let racine: Root | null = null;
let declencheur: HTMLButtonElement;
beforeEach(() => ((serveur = demarrerNoeud()), vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true })));
afterEach(() => (serveur.fermer(), act(() => racine?.unmount()), (document.body.innerHTML = ''), vi.useRealTimers(), vi.unstubAllGlobals()));
const attendre = (ms = 200) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const Hote = () => {
  const [ouvert, setOuvert] = useState(true);
  return <Cloche exercice="EX2026" ouvert={ouvert} surFermer={() => setOuvert(false)} />;
};
async function monter() {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  declencheur = document.body.appendChild(document.createElement('button'));
  declencheur.focus();
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Hote /></FournisseurDonnees>));
  await attendre();
}
const cartes = () => [...document.querySelectorAll('.axion-carte-alerte')] as HTMLElement[];
const bouton = (parent: ParentNode, texte: string) => [...parent.querySelectorAll('button')].find((b) => b.textContent === texte) as HTMLButtonElement;
const cliquer = async (el: Element | undefined) => (await act(async () => void (el as HTMLElement).click()), await attendre());
const info = () => cartes().find((c) => bouton(c, t08.alertes.reporter))!;
const trois = t08.alertes.jours.replace('{n}', '3');
const reporter = async () => (await cliquer(bouton(info(), t08.alertes.reporter)), await cliquer(bouton(info(), trois)));
const message = () => document.querySelector('[role="status"]')!.textContent ?? '';
const compter = (css: string) => document.querySelectorAll(css).length;
const poster = (panne?: string, cles?: string[]) => {
  const vrai = globalThis.fetch, etat = { relu: false };
  vi.stubGlobal('fetch', async (u: string, o: RequestInit = {}) => {
    if (o.method !== 'POST') return etat.relu && u.includes('/alertes') ? Response.json({ body: [], decalage: 0, total: 0 }) : vrai(u, o);
    etat.relu = panne === '409';
    cles?.push((o.headers as Record<string, string>)['idempotency-key'] ?? '');
    return vrai(u, panne ? { ...o, headers: { ...(o.headers as object), 'x-panne': panne } } : o);
  });
};

describe('Cloche', () => {
  it('liste-des-alertes-ouvertes', async () => {
    await monter();
    expect(compter('[role="dialog"][aria-modal="true"]')).toBe(1);
    expect(cartes()).toHaveLength(5);
    expect(cartes()[0]!.className).toContain('bloquant');
    expect(compter('.cloche li')).toBe(3);
  });
  it('reporter-met-a-jour-la-liste', async () => {
    await monter();
    await reporter();
    expect(cartes()).toHaveLength(4);
    expect(message()).toContain(t08.messages.reportee);
  });
  it('ignorer-avec-motif', async () => {
    await monter();
    await cliquer(bouton(info(), t08.alertes.ignorer));
    const champ = document.querySelector('.axion-carte-alerte input') as HTMLInputElement;
    expect(bouton(info(), t08.alertes.confirmer).disabled).toBe(true);
    await act(async () => (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(champ, 'trop vieux'), champ.dispatchEvent(new Event('input', { bubbles: true }))));
    await cliquer(bouton(info(), t08.alertes.confirmer));
    expect(cartes()).toHaveLength(4);
    expect(message()).toContain(t08.messages.ignoree);
  });
  it('annuler-dans-les-dix-secondes', async () => {
    await monter();
    await reporter();
    await attendre(9_000);
    await cliquer(bouton(document.body, t08.messages.annuler));
    expect(cartes()).toHaveLength(5);
    expect(message()).toContain(t08.messages.annulee);
  });
  it('annuler-disparait-apres-dix-secondes', async () => {
    await monter();
    await reporter();
    await attendre(10_500);
    expect(bouton(document.querySelector('[role="status"]')!, t08.messages.annuler)).toBeUndefined();
  });
  it('conflit-409-relit', async () => {
    await monter();
    poster('409');
    await reporter();
    expect([message(), cartes().length, document.body.textContent]).toEqual([t08.messages.conflit, 0, expect.stringContaining(t08.alertes.vide)]);
  });
  it('tout-lire', async () => {
    await monter();
    expect(compter('.cloche__non-lue')).toBe(2);
    await cliquer(bouton(document.body, t08.notifications.toutLire));
    expect([compter('.cloche__non-lue'), compter('.cloche__lue')]).toEqual([0, 3]);
  });
  it('echap-ferme-et-rend-le-focus', async () => {
    await monter();
    expect(document.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
    await act(async () => void document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(compter('[role="dialog"]')).toBe(0);
    expect(document.activeElement).toBe(declencheur);
  });
  it('meme-intention-meme-cle', async () => {
    await monter();
    const cles: string[] = [];
    poster(undefined, cles);
    await cliquer(bouton(info(), t08.alertes.reporter));
    const b = bouton(info(), trois);
    await act(async () => (b.click(), b.click()));
    await attendre();
    expect(new Set(cles).size).toBe(1);
    expect(cartes()).toHaveLength(4);
    expect(message()).toContain(t08.messages.reportee);
  });
});
