// @vitest-environment jsdom
// Fiche L25-T12 : Refuser range la carte dans « Plus tard » ; elle reste dans la discussion, rien n'est supprimé.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encoderEvenement } from '../../../../../packages/contrat/src/chat/flux.js';
import type { Evenement } from '../../../../../packages/contrat/src/chat/evenements.js';
import { e25 } from '../../../../../packages/textes/src/ecrans/e25.js';
import { Discussion } from '../Discussion.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type Brut = Omit<Evenement, 'id'>;
const EVENEMENTS = [
  { type: 'tour.debut' },
  { type: 'proposition', proposition_id: 'prp_b', niveau: 'B', nombre_objets: 1 },
  { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 },
] as Brut[];
let racine: Root | null = null;
const appels: string[] = [];
afterEach(() => (act(() => racine?.unmount()), (document.body.innerHTML = ''), vi.unstubAllGlobals(), (appels.length = 0)));
const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t) as HTMLButtonElement | undefined;
const clic = (b: HTMLButtonElement | undefined) => act(async () => b!.click());
const cartes = () => document.querySelectorAll('.axion-carte-action');

async function monterAvecCarte() {
  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    appels.push(`${init.method ?? 'GET'} ${String(url)}`);
    const enc = new TextEncoder();
    const corps = EVENEMENTS.map((e, i) => encoderEvenement(i + 1, e as Evenement)).map((m) => enc.encode(m));
    return Promise.resolve(new Response(new ReadableStream<Uint8Array>({ start(c) { corps.forEach((m) => c.enqueue(m)); c.close(); } }), { headers: { 'content-type': 'text/event-stream' } }));
  });
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => racine?.render(<Discussion onOuvrirVue={() => undefined} />));
  const champ = document.querySelector('textarea') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(champ, 'Proposer');
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await clic(bouton(e25.envoyer));
  await vi.waitFor(() => expect(cartes()).toHaveLength(1), { interval: 20 });
}

describe('carte rangée dans Plus tard', () => {
  it('refuser-range-dans-plus-tard', async () => {
    await monterAvecCarte();
    const avant = appels.length;
    await clic(bouton(e25.carte.refuser));
    expect(cartes()).toHaveLength(1);
    expect(cartes()[0]!.querySelector('[data-etat="plus_tard"]')).not.toBeNull();
    expect(cartes()[0]!.textContent).toContain(e25.carte.plusTard);
    expect(bouton(e25.carte.valider)).toBeUndefined();
    expect(appels.slice(avant).filter((a) => a.startsWith('POST') || a.startsWith('DELETE'))).toHaveLength(0);
    await clic(bouton(e25.carte.rouvrir));
    expect(cartes()).toHaveLength(1);
    expect(bouton(e25.carte.valider)).toBeDefined();
    expect(cartes()[0]!.textContent).not.toContain(e25.carte.plusTard);
  });
});
