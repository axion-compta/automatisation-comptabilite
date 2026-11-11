// @vitest-environment jsdom
// Fiche L10-T48 : écran E24 détail d'une vente (lecture seule, faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { e24Vente } from '../../../../../../packages/textes/src/ecrans/e24-vente.js';
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

const vente = {
  id: 'VEN-1',
  numero: 'FA-2026-0031',
  type: 'facture',
  client: { code: 'CLI001', nom: 'Immobilière Marceau' },
  dateFacture: '2026-03-05',
  echeance: '2026-04-04',
  ttcCentimes: 120000,
  resteDuCentimes: 70000,
  etat: 'payee_en_partie',
  avoirsLies: [{ id: 'AV-1', ttcCentimes: 5000 }],
  origine: 'import',
  lignes: [{ libelle: 'Travaux fictifs', quantite: 2, ttcCentimes: 120000 }],
  cartes: [{ code: 'A1', mot: 'Totaux', message: 'Revoyez les totaux.' }],
  ecriture: { statut: 'proposee', lignes: [{ compte: '411000', debitCentimes: 120000, creditCentimes: 0 }, { compte: '706000', debitCentimes: 0, creditCentimes: 100000 }] },
  paiements: [{ date: '2026-03-20', montantCentimes: 50000 }],
};

function simuler(corps: unknown, statut = 200) {
  const appels: string[] = [];
  vi.stubGlobal('fetch', (u: string) => {
    const url = new URL(String(u), 'http://x');
    appels.push(url.pathname);
    return Promise.resolve(Response.json(corps, { status: statut }));
  });
  return appels;
}
async function monter(recherche: string): Promise<void> {
  window.history.replaceState(null, '', '/factures/vente' + recherche);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))));
}
const texte = () => document.body.textContent ?? '';

describe('E24 détail d’une vente', () => {
  it('affiche-la-facture-et-les-lignes', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    expect(route.id).toBe('e24-vente');
    expect(route.chemin).toBe('/factures/vente');
    expect(route.groupe).toBe('autre');
    expect(document.querySelector('h1')?.textContent).toBe('FA-2026-0031');
    expect(texte()).toContain('Immobilière Marceau');
    expect(texte()).toContain('05/03/2026');
    expect(texte()).toMatch(/1\s200,00/);
    expect(texte()).toContain('Travaux fictifs');
  });
  it('cartes-en-mots', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    expect(document.querySelector('h3')?.textContent).toBe('Totaux à relire');
    expect(texte()).toContain('Sur la facture FA-2026-0031, le montant hors taxe plus la TVA ne donne pas le total');
    expect(texte()).not.toMatch(/\{|A1/);
  });
  it('ecriture-preparee-par-ia', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    expect(texte()).toContain(e24Vente.prepareParIa);
    expect(texte()).toContain('411000');
    expect(texte()).toContain('706000');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
  });
  it('paiements-et-reste-du', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    expect(texte()).toContain('20/03/2026');
    expect(texte()).toMatch(/500,00/);
    const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent === e24Vente.champs.resteDu);
    expect(dt?.nextElementSibling?.textContent).toMatch(/700,00/);
  });
  it('avoir-lie-cliquable', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    const lien = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href')?.includes('AV-1'));
    expect(lien?.getAttribute('href')).toBe('/factures/vente?id=AV-1');
    expect(lien?.textContent).toMatch(/50,00/);
  });
  it('vente-inconnue-erreur-et-retour', async () => {
    simuler({ error: { code: 'VENTE_INCONNUE' } }, 404);
    await monter('?id=XXX');
    expect(texte()).toContain(e24Vente.inconnue);
    expect(texte()).not.toMatch(/\d{2},\d{2}/);
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/factures/ventes');
    await act(async () => racine?.unmount());
    const appels = simuler({});
    await monter('');
    expect(appels).toHaveLength(0);
    expect(texte()).toContain(e24Vente.inconnue);
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/factures/ventes');
  });
  it('aucun-bouton-qui-ecrit', async () => {
    simuler({ body: vente });
    await monter('?id=VEN-1');
    expect(document.querySelectorAll('button, [role="button"], input[type="submit"]')).toHaveLength(0);
    expect(texte()).not.toContain('Valider');
  });
  it('taux-en-texte', () => {
    expect(tauxEnTexte(1900)).toBe('19 %');
    expect(tauxEnTexte(550)).toBe('5,5 %');
    expect(tauxEnTexte(1)).toBe('0,01 %');
    expect(tauxEnTexte(0)).toBe('0 %');
    expect(tauxEnTexte(-1)).toBe('taux illisible');
    expect(tauxEnTexte(12.5)).toBe('taux illisible');
    expect(tauxEnTexte(Number.NaN)).toBe('taux illisible');
  });
});
