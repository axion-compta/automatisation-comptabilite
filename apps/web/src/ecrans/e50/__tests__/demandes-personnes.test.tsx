// @vitest-environment jsdom
// Fiche L08-T39 : écran E50, demandes des personnes et recherche (faux serveur, lecture seule).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ISSUES_DEMANDE, TYPES_DROIT_PERSONNE, ETATS_DEMANDE_PERSONNE } from '../../../../../../packages/contrat/src/domaines/personnes.js';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e50Personnes as t } from '../../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { DemandesPersonnes } from '../DemandesPersonnes.js';
import { e50 } from '../../../../../../packages/textes/src/ecrans/e50.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void } | null = null;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  serveur?.fermer();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
async function monter(): Promise<HTMLElement> {
  serveur = demarrerNoeud({ base: location.origin });
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees client={creerClient()}><Ecran /></FournisseurDonnees>));
  await attendre();
  return hote;
}
/** Liste imposée au composant (cas que le jeu fictif du faux serveur ne contient pas). */
async function monterAvecListe(body: unknown[]): Promise<HTMLElement> {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ body }), { status: 200, headers: { 'content-type': 'application/json' } }));
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees client={creerClient()}><DemandesPersonnes /></FournisseurDonnees>));
  await attendre();
  return hote;
}
const saisir = (nom: string, valeur: string) =>
  act(async () => {
    const el = document.querySelector(`input[name="${nom}"]`) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
const rechercher = async () => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent === t.rechercher.bouton);
  await act(async () => b?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await attendre();
};
const lignes = (h: HTMLElement) => h.querySelectorAll('tbody tr');

describe('écran E50, demandes des personnes', () => {
  it('six-demandes-affichees', async () => {
    const h = await monter();
    expect(lignes(h)).toHaveLength(6);
    expect(h.querySelector('h2#e50-demandes')?.textContent).toBe(t.titre);
    expect(h.querySelector('h2#e50-recherche')?.textContent).toBe(t.rechercher.titre);
    expect(h.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retard-et-rappel-en-mots', async () => {
    const h = await monter();
    expect(h.textContent).toContain(t.enRetard);
    expect(h.textContent).toContain(t.aRappeler);
  });

  it('refus-avec-date-et-source', async () => {
    const refus = { id: 'dem_x', type: 'effacement', recue_le: '2026-10-01', echeance: '2026-12-01', etat: 'refusee', en_retard: false, a_rappeler: false, issue: 'refus_conservation', conserve_jusqu_au: '2031-12-31', source_motif: 'Source fictive A' };
    const sansDate = { ...refus, id: 'dem_y', conserve_jusqu_au: null, source_motif: 'Source fictive B' };
    const h = await monterAvecListe([refus, sansDate]);
    expect(h.textContent).toContain(t.issues.refus_conservation);
    expect(h.textContent).toContain('Conservé jusqu’au 31/12/2031. Source : Source fictive A.');
    expect(h.textContent).toContain('Conservé jusqu’au date à confirmer. Source : Source fictive B.');
  });

  it('liste-vide', async () => {
    const h = await monterAvecListe([]);
    expect(h.textContent).toContain(t.aucuneDemande);
    expect(lignes(h)).toHaveLength(0);
  });

  it('recherche-douze-pieces', async () => {
    const h = await monter();
    await saisir('nom', 'Camille Exemple');
    await rechercher();
    expect(h.textContent).toMatch(/Pièces : 12/);
  });

  it('recherche-trop-courte-message', async () => {
    const h = await monter();
    await saisir('nom', 'ab');
    await rechercher();
    expect(h.textContent).toContain(t.rechercher.tropCourt);
    await saisir('nom', 'Inconnue Introuvable');
    await rechercher();
    expect(h.textContent).toContain(t.rechercher.aucunResultat);
  });

  it('saisie-absente-de-l-url', async () => {
    const h = await monter();
    const avant = location.href;
    await saisir('nom', 'Camille Exemple');
    await saisir('email', 'camille@exemple.fr');
    await rechercher();
    expect(location.href).toBe(avant);
    expect(location.href).not.toMatch(/Camille|exemple/i);
    expect(h.textContent).toMatch(/Pièces/);
  });

  it('erreur-de-lecture-message-selon-le-statut', async () => {
    for (const [statut, attendu, exclu] of [[500, e50.etats.erreur, t.erreurs.reglageAbsent], [503, t.erreurs.reglageAbsent, e50.etats.erreur]] as const) {
      vi.stubGlobal('fetch', async () => new Response('{}', { status: statut, headers: { 'content-type': 'application/json' } }));
      const hote = document.body.appendChild(document.createElement('div'));
      racine = createRoot(hote);
      await act(async () => racine?.render(<FournisseurDonnees client={creerClient()}><DemandesPersonnes /></FournisseurDonnees>));
      await act(async () => void (await new Promise((r) => setTimeout(r, 700))));
      expect(hote.textContent).toContain(attendu);
      expect(hote.textContent).not.toContain(exclu);
      expect(lignes(hote)).toHaveLength(0);
      act(() => racine?.unmount());
      hote.remove();
    }
  });

  it('recherche-en-erreur-message-selon-le-statut', async () => {
    const h = await monter();
    await saisir('nom', 'Camille Exemple');
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } }));
    await rechercher();
    expect(h.textContent).toContain(e50.etats.erreur);
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } }));
    await rechercher();
    expect(h.textContent).toContain(t.erreurs.reglageAbsent);
  });

  it('cles-de-texte-egales-aux-constantes', () => {
    expect(Object.keys(t.types).sort()).toEqual([...TYPES_DROIT_PERSONNE].sort());
    expect(Object.keys(t.etats).sort()).toEqual([...ETATS_DEMANDE_PERSONNE].sort());
    expect(Object.keys(t.issues).sort()).toEqual([...ISSUES_DEMANDE].sort());
  });
});
