// @vitest-environment jsdom
// Fiche L11-T32 : écran E17 détail d'un frais (lecture, faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { e17Frais } from '../../../../../../packages/textes/src/ecrans/e17-frais.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

const base = { id: 'FRA-001', personneId: 'PER-01', nature: 'depense', date: '2025-03-12', libelle: 'Repas fictif', montantTtcCentimes: 4250, payeur: 'societe', statut: 'propose', partPersoTtcCentimes: 0, version: 1 };
const trajet = { depart: 'Lyon', arrivee: 'Dijon', motif: 'Visite fictive', kmSaisisDixiemes: 1234, allerRetour: true };

function simuler(corps: unknown, statut = 200) {
  const appels: string[] = [];
  vi.stubGlobal('fetch', (u: string) => {
    appels.push(new URL(String(u), 'http://x').pathname + new URL(String(u), 'http://x').search);
    return Promise.resolve(Response.json(corps, { status: statut }));
  });
  return appels;
}
async function monter(recherche: string): Promise<void> {
  window.history.replaceState(null, '', '/factures/frais/detail' + recherche);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))));
}
const texte = () => document.body.textContent ?? '';

describe('E17 détail d’un frais', () => {
  it('affiche-une-depense', async () => {
    simuler({ body: { ...base, pieceId: 'PIE-1' } });
    await monter('?id=FRA-001');
    expect(route.chemin).toBe('/factures/frais/detail');
    expect(route.id).toBe('e17-frais');
    expect(route.groupe).toBe('autre');
    expect(texte()).toContain('Repas fictif');
    expect(texte()).toMatch(/42,50/);
    expect(texte()).toContain(e17Frais.champs.montant);
    expect(texte()).toContain(e17Frais.valeurs.societe);
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/factures/frais');
    expect(document.querySelector('a')?.textContent).toBe(e17Frais.retour);
  });
  it('affiche-un-trajet-et-ses-km', async () => {
    simuler({ body: { ...base, nature: 'trajet', trajet, kmDixiemes: 2468, montantTrajetCentimes: 9000 } });
    await monter('?id=FRA-002');
    const lignes = [...document.querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);
    expect(lignes).toContainEqual([e17Frais.champs.kmSaisis, '123,4']);
    expect(lignes).toContainEqual([e17Frais.champs.kmRetenus, '246,8']);
    expect(lignes).toContainEqual([e17Frais.champs.depart, 'Lyon']);
    expect(lignes).toContainEqual([e17Frais.champs.allerRetour, e17Frais.valeurs.oui]);
    expect(texte()).toMatch(/90,00/);
  });
  it('trajet-bareme-a-confirmer-sans-montant', async () => {
    simuler({ body: { ...base, nature: 'trajet', trajet: { ...trajet, kmSaisisDixiemes: 50, allerRetour: false }, kmDixiemes: 50, montantTrajetCentimes: null } });
    await monter('?id=FRA-002');
    expect(texte()).toContain(e17Frais.baremeAConfirmer);
    const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent === e17Frais.champs.montantTrajet);
    expect(dt?.nextElementSibling?.textContent).not.toMatch(/€|\d/);
    expect(texte()).toContain('5,0');
  });
  it('payeur-a-confirmer-affiche-a-confirmer', async () => {
    simuler({ body: { ...base, payeur: 'a_confirmer' } });
    await monter('?id=FRA-001');
    const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent === e17Frais.champs.payePar);
    expect(dt?.nextElementSibling?.textContent).toBe(e17Frais.valeurs.aConfirmer);
    expect(texte()).not.toContain(e17Frais.valeurs.societe);
    expect(texte()).not.toContain(e17Frais.valeurs.vous);
  });
  it('id-absent-sans-appel', async () => {
    const appels = simuler({ body: base });
    await monter('');
    expect(appels).toHaveLength(0);
    expect(texte()).toContain(e17Frais.inconnu);
    act(() => racine?.unmount());
    await monter('?id=');
    expect(appels).toHaveLength(0);
    expect(texte()).toContain(e17Frais.inconnu);
  });
  it('id-inconnu-message', async () => {
    simuler({ defined: true, code: 'FRAIS_INCONNU', status: 404, message: 'FRAIS_INCONNU' }, 404);
    await monter('?id=NOPE');
    expect(texte()).toContain(e17Frais.inconnu);
    expect(document.querySelectorAll('dl')).toHaveLength(0);
  });
  it('id-avec-caracteres-speciaux-encode', async () => {
    const appels = simuler({ body: base });
    await monter('?id=' + encodeURIComponent('a/b?c'));
    expect(appels).toEqual(['/frais/a%2Fb%3Fc']);
  });
  it('titre-h1-unique', async () => {
    simuler({ body: base });
    await monter('?id=FRA-001');
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(e17Frais.titre);
    act(() => racine?.unmount());
    await monter('');
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });
});
