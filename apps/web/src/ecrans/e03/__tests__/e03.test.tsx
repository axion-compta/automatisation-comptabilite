// @vitest-environment jsdom
// Fiche L04-T42 : écran E03 « Déposer des pièces » (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e03 } from '../../../../../../packages/textes/src/ecrans/e03.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  vi.unstubAllGlobals();
  act(() => racine?.unmount());
  document.body.innerHTML = '';
});

const pdf = (n: string): File => new File(['%PDF-1.4 fictif ' + n], n + '.pdf', { type: 'application/pdf' });
const exe = (): File => new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'outil.exe');

/** jsdom et le fetch de Node ne partagent pas FormData : le corps multipart est reconstruit à la main. */
function reconstruireMultipart(): void {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', async (u: string, o: RequestInit) => {
    const limite = 'limite-fictive';
    const morceaux: Uint8Array[] = [];
    const texte = new TextEncoder();
    for (const [nom, v] of (o.body as FormData).entries()) {
      const fichier = typeof v === 'string' ? null : v;
      morceaux.push(texte.encode(`--${limite}\r\nContent-Disposition: form-data; name="${nom}"${fichier ? `; filename="${fichier.name}"` : ''}\r\n\r\n`));
      morceaux.push(fichier ? new Uint8Array(await fichier.arrayBuffer()) : texte.encode(String(v)));
      morceaux.push(texte.encode('\r\n'));
    }
    morceaux.push(texte.encode(`--${limite}--\r\n`));
    const corps = new Blob(morceaux as BlobPart[]);
    return vrai(u, { ...o, headers: { ...(o.headers as Record<string, string>), 'content-type': `multipart/form-data; boundary=${limite}` }, body: Buffer.from(await corps.arrayBuffer()) });
  });
}
async function monter(): Promise<void> {
  reconstruireMultipart();
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<Ecran />));
}
async function deposer(...f: File[]): Promise<void> {
  const entree = document.querySelector('input[type=file]') as HTMLInputElement;
  Object.defineProperty(entree, 'files', { value: f, configurable: true });
  await act(async () => {
    entree.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300));
  });
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
