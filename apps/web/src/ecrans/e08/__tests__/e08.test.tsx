// @vitest-environment jsdom
// Fiche L04-T41 : écran E08 Fiche d'une pièce (faux serveur, lecture seule).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detailPiece } from '../../../../../../packages/contrat/src/domaines/pieces-service.js';
import { e08 } from '../../../../../../packages/textes/src/ecrans/e08.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran, tauxEnTexte } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

function simuler() {
  const appels: string[] = [];
  vi.stubGlobal('fetch', (u: string) => {
    const chemin = new URL(String(u), 'http://x').pathname;
    appels.push(chemin);
    const piece = detailPiece(decodeURIComponent(chemin.split('/').pop() ?? ''));
    return Promise.resolve(piece ? Response.json({ body: piece }) : Response.json({ defined: true, code: 'PIECE_INCONNUE', status: 404, message: 'PIECE_INCONNUE' }, { status: 404 }));
  });
  return appels;
}
async function monter(recherche: string): Promise<HTMLElement> {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/documents/piece' + recherche);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))));
  return document.body;
}
const evidence = (h: HTMLElement) => [...h.querySelectorAll('dd.axion-champ-lu__valeur--evidence')];
const libelleDe = (dd: Element) => dd.previousElementSibling?.textContent;

describe('E08 fiche d’une pièce', () => {
  it('affiche-les-champs', async () => {
    simuler();
    const h = await monter('?id=piece-002');
    expect(route).toMatchObject({ id: 'e08', chemin: '/documents/piece', groupe: 'autre' });
    expect(h.querySelector('h1')?.textContent).toBe(detailPiece('piece-002')?.nomNormalise);
    const libelles = [...h.querySelectorAll('dt')].map((d) => d.textContent);
    expect(libelles).toContain(e08.champs.fournisseur_nom);
    expect(libelles).toContain(e08.prefixes.ht.replace('{taux}', '19 %'));
    expect(libelles).toContain(e08.prefixes.tva.replace('{taux}', '11 %'));
    expect(libelles).toContain(e08.prefixes.ht.replace('{taux}', '6 %'));
    expect(h.textContent).toContain('FOURNISSEUR-EXEMPLE');
    expect(h.textContent).toContain(e08.comptee);
    expect(h.textContent).toContain(e08.types.facture);
    expect([tauxEnTexte('1900'), tauxEnTexte('550'), tauxEnTexte('0'), tauxEnTexte('5'), tauxEnTexte('x')]).toEqual(['19 %', '5,5 %', '0 %', '0,05 %', 'x']);
  });

  it('seul-le-champ-douteux-en-evidence', async () => {
    simuler();
    const h = await monter('?id=piece-009');
    const marques = evidence(h);
    expect(marques).toHaveLength(1);
    expect(libelleDe(marques[0]!)).toBe(e08.champs.ttc);
    expect(marques[0]?.textContent).toContain(e08.mots.douteux);
    expect(evidence(await monter('?id=piece-001'))).toHaveLength(0);
  });

  it('motifs-en-mots', async () => {
    simuler();
    const h = await monter('?id=piece-006');
    expect(h.textContent).toContain(e08.motifs.titre);
    expect(h.textContent).toContain(e08.motifs.plusieurs_factures);
    expect(h.textContent).toContain(e08.nonComptee);
    expect(h.textContent).not.toContain('plusieurs_factures');
  });

  it('sensible-aucun-champ', async () => {
    simuler();
    const h = await monter('?id=piece-010');
    expect(h.textContent).toContain(e08.protegee);
    expect(h.querySelectorAll('dd.axion-champ-lu__valeur')).toHaveLength(0);
    expect(h.textContent).not.toContain('FOURNISSEUR-EXEMPLE');
  });

  it('piece-inconnue-erreur-et-retour', async () => {
    const appels = simuler();
    const h = await monter('?id=piece-999');
    expect(h.querySelector('[role=alert]')?.textContent).toContain(e08.etats.inconnue);
    expect(h.querySelector('a')?.getAttribute('href')).toBe('/documents');
    appels.length = 0;
    const sans = await monter('');
    expect(sans.textContent).toContain(e08.etats.inconnue);
    expect(sans.querySelector('a')?.getAttribute('href')).toBe('/documents');
    expect(appels).toHaveLength(0);
  });

  it('mention-conservation-des-originaux', async () => {
    simuler();
    const h = await monter('?id=piece-001');
    expect(h.textContent).toContain(e08.originaux);
    expect(h.textContent).toContain(e08.prepare);
  });

  it('confiance-jamais-chiffree', async () => {
    simuler();
    for (const id of ['piece-001', 'piece-009']) {
      const h = await monter('?id=' + id);
      expect(h.textContent).not.toMatch(/confiance/i);
      expect(h.textContent).not.toMatch(/\b0[.,]\d+\b|\d+\s*% (sûr|certain)/);
      const mots = [...h.querySelectorAll('dd.axion-champ-lu__valeur')].map((dd) => dd.textContent ?? '');
      for (const t of mots) expect(Object.values(e08.mots).some((m) => t.includes(m))).toBe(true);
    }
  });
});
