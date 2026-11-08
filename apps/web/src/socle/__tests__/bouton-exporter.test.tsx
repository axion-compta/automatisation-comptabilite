// @vitest-environment jsdom
// Fiche L15-T55 : bouton Exporter (CSV ou XLSX).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { e44 } from '../../../../../packages/textes/src/ecrans/e44.js';
import { BoutonExporter } from '../BoutonExporter.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
const blobs: Blob[] = [];
const noms: string[] = [];
const creer = vi.fn((b: Blob) => (blobs.push(b), 'blob:fictif-' + blobs.length));
const liberer = vi.fn();
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  blobs.length = 0;
  noms.length = 0;
  creer.mockClear();
  liberer.mockClear();
});
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 200))));
async function monter(filtres: Record<string, string | number> = {}) {
  URL.createObjectURL = creer;
  URL.revokeObjectURL = liberer;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    noms.push(this.download);
  });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<BoutonExporter liste="listerTiers" filtres={filtres} textes={e44.export} />));
}
const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t)!;
const cliquer = (el: Element) => act(async () => void (el as HTMLElement).click());
async function exporterEn(format: string) {
  await cliquer(bouton(e44.export.bouton));
  await cliquer(bouton(format));
  await attendre();
}
function lireOctets(b: Blob): Promise<Uint8Array> {
  return new Promise((ok) => {
    const f = new FileReader();
    f.onload = () => ok(new Uint8Array(f.result as ArrayBuffer));
    f.readAsArrayBuffer(b);
  });
}
const corpsErreur = (code: string, status: number) => new Response(JSON.stringify({ defined: true, code, status, message: code }), { status });
const reponseOk = (nom: string) =>
  new Response(JSON.stringify({ body: { nom, typeContenu: 'text/csv', octetsBase64: btoa('a;b'), nbLignes: 1, empreinte: 'a'.repeat(64) } }), { status: 200 });

describe('BoutonExporter', () => {
  it('envoie-les-filtres-de-l-ecran', async () => {
    const f = vi.fn(async () => reponseOk('x.csv'));
    vi.stubGlobal('fetch', f);
    await monter({ type: 'client', q: 'Dupont fictif' });
    await exporterEn(e44.export.csv);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/exports');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(init.body as string)).toEqual({ liste: 'listerTiers', format: 'csv', filtres: { type: 'client', q: 'Dupont fictif' } });
  });
  it('nom-du-fichier-venu-du-serveur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponseOk('nom-rendu-par-le-serveur.csv')));
    await monter({ q: 'saisie libre' });
    await exporterEn(e44.export.csv);
    expect(noms).toEqual(['nom-rendu-par-le-serveur.csv']);
    expect(blobs[0]?.type).toBe('text/csv');
  });
  it('csv-commence-par-le-bom', async () => {
    await monter({ type: 'fournisseur' });
    await exporterEn(e44.export.csv);
    expect(blobs).toHaveLength(1);
    const o = await lireOctets(blobs[0]!);
    expect([...o.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(noms[0]).toMatch(/\.csv$/);
  });
  it('double-clic-une-seule-requete', async () => {
    let fin: (r: Response) => void = () => undefined;
    const f = vi.fn(() => new Promise<Response>((r) => (fin = r)));
    vi.stubGlobal('fetch', f);
    await monter();
    await cliquer(bouton(e44.export.bouton));
    const csv = bouton(e44.export.csv);
    await act(async () => {
      csv.click();
      csv.click();
    });
    expect(f).toHaveBeenCalledTimes(1);
    const b = bouton(e44.export.enCours) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('aria-busy')).toBe('true');
    await act(async () => fin(reponseOk('x.csv')));
    await attendre();
    expect((bouton(e44.export.bouton) as HTMLButtonElement).disabled).toBe(false);
  });
  it('trop-gros-message-affinez', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => corpsErreur('EXPORT_TROP_GROS', 413)));
    await monter();
    await exporterEn(e44.export.xlsx);
    expect(document.querySelector('[role=alert]')?.textContent).toBe(e44.export.erreurs.trop_gros);
    expect(e44.export.erreurs.trop_gros).toContain('affinez vos filtres');
    expect(creer).not.toHaveBeenCalled();
  });
  it('au-dela-du-direct-message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => corpsErreur('EXPORT_EN_TACHE_A_VENIR', 501)));
    await monter();
    await exporterEn(e44.export.csv);
    expect(document.querySelector('[role=alert]')?.textContent).toBe(e44.export.erreurs.au_dela_du_direct);
    expect(e44.export.erreurs.au_dela_du_direct).not.toBe(e44.export.erreurs.trop_gros);
  });
  it('url-objet-liberee', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponseOk('x.csv')));
    await monter();
    await exporterEn(e44.export.csv);
    expect(creer).toHaveBeenCalledTimes(1);
    expect(liberer).toHaveBeenCalledWith('blob:fictif-1');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('clic impossible');
    });
    await exporterEn(e44.export.csv);
    expect(liberer).toHaveBeenCalledTimes(2);
  });
});
