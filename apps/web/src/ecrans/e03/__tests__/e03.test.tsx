// @vitest-environment jsdom
// Fiche L04-T42 : écran E03 « Déposer des pièces » (service de dépôt du faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerDepotEnMemoire } from '../../../../../../packages/contrat/src/domaines/depot-service.js';
import { reglagesPiecesAuJour } from '../../../../../../packages/parametres/src/reglages-pieces.js';
import { e03 } from '../../../../../../packages/textes/src/ecrans/e03.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  vi.unstubAllGlobals();
  act(() => racine?.unmount());
  document.body.innerHTML = '';
});

const pdf = (n: string): File => new File(['%PDF-1.4 fictif ' + n], n + '.pdf', { type: 'application/pdf' });
const exe = (): File => new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'outil.exe');

/** Le fetch de Node et le FormData de jsdom ne s'entendent pas selon la version : le service de dépôt du faux serveur est appelé directement. */
function brancherService(): void {
  const service = creerDepotEnMemoire([], reglagesPiecesAuJour(new Date().toISOString().slice(0, 10)));
  vi.stubGlobal('fetch', async (_u: string, o: RequestInit) => {
    const form = o.body as FormData;
    const octets = await Promise.all(form.getAll('fichiers').map(async (f) => new Uint8Array(await (f as File).arrayBuffer())));
    const cle = new Headers(o.headers).get('idempotency-key') ?? '';
    return Response.json({ body: { resultats: await service.deposer(cle, octets, String(form.get('canal'))) } });
  });
}
async function monter(): Promise<void> {
  brancherService();
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<Ecran />));
}
async function deposer(...f: File[]): Promise<void> {
  const entree = document.querySelector('input[type=file]') as HTMLInputElement;
  Object.defineProperty(entree, 'files', { value: f, configurable: true });
  await act(async () => {
    entree.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const avant = lignes().length;
  for (let i = 0; i < 100 && !document.querySelector('[role=alert]') && (lignes().length === avant || document.querySelector('[aria-busy]')); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }
}
const lignes = (): string[] => Array.from(document.querySelectorAll('[role=status] li'), (l) => l.textContent ?? '');

describe('E03', () => {
  it('route-et-titre', async () => {
    expect(route).toMatchObject({ id: 'e03', chemin: '/documents/deposer', groupe: 'autre' });
    await monter();
    expect(document.querySelector('h1')?.textContent).toBe(e03.titre);
  });
  it('trois-fichiers-trois-recues', async () => {
    await monter();
    await deposer(pdf('a'), pdf('b'), pdf('c'));
    expect(lignes()).toHaveLength(3);
    expect(lignes().every((l) => l.startsWith(e03.resultats.recue))).toBe(true);
    expect(document.querySelector('[role=status] a')?.getAttribute('href')).toMatch(/^\/documents\/piece\?id=depot-/);
  });
  it('meme-fichier-deja-recue', async () => {
    await monter();
    await deposer(pdf('x'));
    await deposer(pdf('x'), pdf('y'));
    const l = lignes();
    expect(l[0]).toMatch(/^déjà reçue le \d{2}\/\d{2}\/\d{4}$/);
    expect(l[1]).toMatch(/^reçue/);
  });
  it('executable-refuse-en-mots', async () => {
    await monter();
    await deposer(exe());
    expect(lignes()).toEqual([e03.resultats.refusee.replace('{raison}', e03.refus.type_refuse)]);
  });
  it('resultats-annonces-aux-lecteurs-d-ecran', async () => {
    await monter();
    await deposer(pdf('z'));
    expect(document.querySelector('ul[role=status]')?.querySelectorAll('li')).toHaveLength(1);
  });
  it('mention-conservation-des-originaux', async () => {
    await monter();
    expect(document.body.textContent).toContain('Conservez vos justificatifs originaux : la photo sert à la saisie et au classement.');
  });
  it('aucun-mot-jeter', async () => {
    await monter();
    await deposer(pdf('q'), exe());
    expect(document.body.textContent?.toLowerCase()).not.toContain('jeter');
    expect(JSON.stringify(e03).toLowerCase()).not.toContain('jeter');
  });
  it('une-phrase-par-code-de-refus', () => {
    for (const c of ['type_refuse', 'macro_refusee', 'archive_refusee', 'image_refusee', 'trop_grand', 'infecte'] as const) expect(e03.refus[c].length).toBeGreaterThan(10);
  });
});
