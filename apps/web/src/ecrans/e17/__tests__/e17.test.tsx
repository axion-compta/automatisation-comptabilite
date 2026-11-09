// @vitest-environment jsdom
// Fiche L11-T31 : écran E17 Mes frais et trajets (lecture, faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e17 } from '../../../../../../packages/textes/src/ecrans/e17.js';
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
const totaux = { aRembourserCentimes: 0, enAttenteCentimes: 0, exclusCentimes: 0, kmSansMontantDixiemes: 0 };
const ligne = (id: string, o: object = {}) => ({ id, personneId: 'P1', nature: 'depense', date: '2026-10-01', libelle: 'Ticket fictif ' + id, montantTtcCentimes: 1000, payeur: 'personne', statut: 'valide', ...o });
function simuler(body: object[], t: object = {}, statut = 200) {
  const corps = { body, decalage: 0, total: body.length, totaux: { ...totaux, ...t } };
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(statut === 200 ? corps : {}, { status: statut })));
}
const texte = () => document.body.textContent ?? '';
const carte = (titre: string) => [...document.querySelectorAll('section.axion-carte')].find((s) => s.querySelector('h2')?.textContent === titre)!;

describe('E17', () => {
  it('exemple-de-la-demo-trois-totaux', async () => {
    simuler([ligne('F1')], { aRembourserCentimes: 1260, enAttenteCentimes: 4500, exclusCentimes: 6400 });
    await monter();
    expect(carte(e17.totaux.aRembourser).textContent).toMatch(/12,60/);
    expect(carte(e17.totaux.enAttente).textContent).toMatch(/45,00/);
    expect(carte(e17.totaux.exclus).textContent).toMatch(/64,00/);
    expect(texte()).not.toContain('121,60');
    expect(route.id).toBe('e17');
    expect(route.chemin).toBe('/factures/frais');
    expect(route.groupe).toBe('autre');
    expect(route.titre).toBe(e17.titre);
  });
  it('paye-par-entreprise-grise', async () => {
    simuler([ligne('F1', { statut: 'exclu_paye_societe', payeur: 'societe' }), ligne('F2')], { exclusCentimes: 1000 });
    await monter();
    const lignes = [...document.querySelectorAll('tbody tr')];
    expect(lignes).toHaveLength(2);
    expect(lignes[0]!.textContent).toContain(e17.payeParEntreprise);
    expect(lignes[0]!.querySelector('.e17-ligne--grisee')).not.toBeNull();
    expect(lignes[1]!.textContent).not.toContain(e17.payeParEntreprise);
    expect(lignes[1]!.querySelector('.e17-ligne--grisee')).toBeNull();
    expect(lignes[0]!.querySelector('a')?.getAttribute('href')).toBe('/factures/frais/detail?id=F1');
  });
  it('etat-a-completer-dit-ce-qui-manque', async () => {
    simuler([ligne('F1', { statut: 'a_completer', manque: ['justificatif'] })], { enAttenteCentimes: 1000 });
    await monter();
    expect(document.querySelector('tbody tr')?.textContent).toContain(e17.manques.justificatif);
  });
  it('km-sans-montant-affiches', async () => {
    simuler([ligne('T1', { nature: 'trajet', kmDixiemes: 125, montantTrajetCentimes: null })], { kmSansMontantDixiemes: 125 });
    await monter();
    expect(texte()).toContain(e17.totaux.kmSansMontant.replace('{km}', '12,5'));
    simuler([ligne('F1')]);
    act(() => racine?.unmount());
    await monter();
    expect(texte()).not.toMatch(/\d km sans montant/);
  });
  it('etat-vide-message', async () => {
    simuler([]);
    await monter();
    expect(texte()).toContain(e17.vide);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(0);
  });
  it('erreur-sans-chiffre-partiel', async () => {
    simuler([], {}, 500);
    await monter();
    expect(document.querySelector('[role=alert]')).not.toBeNull();
    expect(texte()).not.toMatch(/\d|€/);
    expect(document.querySelectorAll('section.axion-carte')).toHaveLength(0);
  });
  it('chargement-totaux-absents', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => undefined));
    await monter();
    expect(document.querySelector('[role=status]')).not.toBeNull();
    expect(texte()).not.toMatch(/€/);
    expect(document.querySelectorAll('section.axion-carte')).toHaveLength(0);
  });
  it('titre-h1-unique', async () => {
    await monter();
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect([...document.querySelectorAll('h1')].map((h) => h.textContent)).toEqual([e17.titre]);
    expect(document.querySelector('main')).toBeNull();
  });
  it('lisible-a-360-px', async () => {
    vi.stubGlobal('innerWidth', 360);
    window.dispatchEvent(new Event('resize'));
    await monter();
    expect(document.querySelector('table')).not.toBeNull();
    for (const td of document.querySelectorAll('tbody td')) expect(td.getAttribute('data-entete')).toBeTruthy();
    expect(document.querySelectorAll('section.axion-carte')).toHaveLength(3);
  });
});
