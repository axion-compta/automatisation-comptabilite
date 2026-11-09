// @vitest-environment jsdom
// Fiche L03-T44 : écran E19 Ma TVA.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e19 } from '../../../../../../packages/textes/src/ecrans/e19.js';
import { piecesARegarder } from '../../../../../../packages/textes/src/documents/declarations.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
async function monter(): Promise<void> {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 200))));
}
const zone = () => document.querySelector('[aria-labelledby=e19-estimation]')!;
const exercice = { id: 'EX2026', libelle: 'Année 2026', debut: '2026-01-01', fin: '2026-12-31', statut: 'ouvert' };
function simuler(estimation: unknown, periodes: unknown = { body: [], decalage: 0, total: 0 }) {
  vi.stubGlobal('fetch', (u: string) => {
    const url = String(u);
    const corps = url.includes('/tva/estimation') ? { body: estimation } : url.includes('/tva/periodes') ? periodes : { body: [exercice], decalage: 0, total: 1 };
    return Promise.resolve(Response.json(corps));
  });
}

describe('E19', () => {
  it('affiche-les-periodes', async () => {
    await monter();
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    const textes = Object.values(e19.periodes.etats);
    for (const l of document.querySelectorAll('tbody tr')) expect(textes.some((t) => l.textContent?.includes(t))).toBe(true);
    expect(route.chemin).toBe('/declarations/tva');
    expect(route.id).toBe('e19');
  });
  it('estimation-calculee-avec-montants', async () => {
    simuler({ exerciceId: 'EX2026', etat: 'calculee', collecteeCentimes: 123456, deductibleCentimes: 7800 });
    await monter();
    expect(zone().textContent).toContain(e19.estimation.collectee);
    expect(zone().textContent).toMatch(/1\s?234,56/);
    expect(zone().textContent).toMatch(/78,00/);
  });
  it('doute-aucun-montant-affiche', async () => {
    await monter();
    expect(zone().textContent).toContain(piecesARegarder(2));
    expect(zone().textContent).not.toMatch(/\d\s*€|€\s*\d/);
    expect(zone().querySelector('a')?.getAttribute('href')).toBe(e19.estimation.cheminPieces);
    simuler({ exerciceId: 'EX2026', etat: 'non_calculee', motif: 'tva_en_doute', piecesARegarder: 1 });
    act(() => racine?.unmount());
    await monter();
    expect(zone().textContent).toContain('Il reste 1 pièce à regarder');
    expect(zone().querySelector('p')?.textContent).not.toContain('2 pièces');
    expect(zone().textContent).not.toMatch(/€/);
  });
  it('regime-non-traite', async () => {
    simuler({ exerciceId: 'EX2026', etat: 'non_calculee', motif: 'regime_non_traite' });
    await monter();
    expect(zone().textContent).toContain(e19.estimation.regimeNonTraite);
    expect(zone().querySelector('a')).toBeNull();
    expect(zone().textContent).not.toMatch(/€|\d/);
  });
  it('etat-erreur-403', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({}, { status: 403 })));
    await monter();
    expect(document.querySelector('[role=alert]')?.textContent).toContain(e19.etats.acces);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(0);
  });
  it('titre-h1-unique', async () => {
    await monter();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(e19.titre);
    expect(document.querySelectorAll('main')).toHaveLength(0);
  });
  it('liste-de-periodes-vide', async () => {
    simuler({ exerciceId: 'EX2026', etat: 'calculee', collecteeCentimes: 0, deductibleCentimes: 0 });
    await monter();
    expect(document.body.textContent).toContain(e19.periodes.vide);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
