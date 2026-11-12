// @vitest-environment jsdom
// Fiche L15-T67 : panneau du chat en 4 états et omnibarre à deux sources.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chat } from '../../../../../packages/textes/src/ecrans/chat.js';
import { FournisseurPreferences } from '../../donnees/preferences.js';
import { Omnibarre, PanneauChat, largeurDe, type Source } from '../PanneauChat.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
const CLE = 'axion.preferences.v1';
beforeEach(() => localStorage.clear());
afterEach(() => (act(() => racine?.unmount()), (racine = null), (document.body.innerHTML = '')));
async function monter(el: JSX.Element) {
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurPreferences>{el}</FournisseurPreferences>));
}
const panneau = () => document.querySelector('[data-testid="panneau-chat"]') as HTMLElement;
const pousser = (cle: string, valeur: unknown) =>
  localStorage.setItem(CLE, JSON.stringify({ bureau: { [cle]: valeur } }));

describe('largeurDe', () => {
  it('donne 56 px, 380 px, le pourcentage choisi borné à 50 et la pleine largeur', () => {
    expect(largeurDe('reduit', 30)).toBe('56px');
    expect(largeurDe('normal', 30)).toBe('380px');
    expect(largeurDe('elargi', 30)).toBe('30%');
    expect(largeurDe('elargi', 80)).toBe('50%');
    expect(largeurDe('plein', 30)).toBe('100%');
  });
});

describe('PanneauChat', () => {
  it('premier-lancement-elargi-sans-choix', async () => {
    await monter(<PanneauChat>contenu</PanneauChat>);
    expect(panneau().dataset['etat']).toBe('elargi');
    expect(panneau().style.width).toBe('50%');
  });
  it('etat-memorise-et-lu-au-lancement-suivant', async () => {
    pousser('chat_etat', 'reduit');
    await monter(<PanneauChat>contenu</PanneauChat>);
    expect(panneau().dataset['etat']).toBe('reduit');
    expect(panneau().style.width).toBe('56px');
    expect(panneau().textContent).not.toContain('contenu');
  });
  it('choix-de-la-personne-jamais-ecrase', async () => {
    pousser('chat_etat', 'plein');
    await monter(<PanneauChat installationTerminee>contenu</PanneauChat>);
    expect(panneau().dataset['etat']).toBe('plein');
  });
  it('apres-installation-normal-sans-choix', async () => {
    await monter(<PanneauChat installationTerminee>contenu</PanneauChat>);
    expect(panneau().dataset['etat']).toBe('normal');
    expect(panneau().style.width).toBe('380px');
  });
  it('bouton-change-etat-et-memorise', async () => {
    await monter(<PanneauChat installationTerminee>contenu</PanneauChat>);
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent === chat.panneau.etats.plein)!;
    await act(async () => b.click());
    expect(panneau().dataset['etat']).toBe('plein');
    expect(JSON.parse(localStorage.getItem(CLE) ?? '{}').bureau.chat_etat).toBe('plein');
  });
  it('largeur-reglable-au-clavier-bornee', async () => {
    pousser('chat_etat', 'elargi');
    await monter(<PanneauChat>contenu</PanneauChat>);
    const p = document.querySelector('[role="separator"]') as HTMLElement;
    const touche = (key: string) => act(async () => void p.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
    for (let i = 0; i < 20; i++) await touche('ArrowRight');
    expect(panneau().style.width).toBe('50%');
    for (let i = 0; i < 20; i++) await touche('ArrowLeft');
    expect(panneau().style.width).toBe('20%');
  });
});

describe('Omnibarre', () => {
  const ok = (nom: string, titre: string): Source => ({ nom, groupe: 'recherche', chercher: async () => [titre] });
  const saisir = async (v: string) => {
    const champ = document.querySelector('input') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(champ, v);
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  it('assemble-deux-sources-en-parallele', async () => {
    const lancees: string[] = [];
    const a: Source = { nom: 'recherche', groupe: 'recherche', chercher: async (q) => (lancees.push('a'), [`Pièce ${q}`]) };
    const b: Source = { nom: 'conversations', groupe: 'conversations', chercher: async (q) => (lancees.push('b'), [`Fil ${q}`]) };
    await monter(<Omnibarre sources={[a, b]} />);
    await saisir('loyer');
    expect(lancees.sort()).toEqual(['a', 'b']);
    const titres = [...document.querySelectorAll('h3')].map((h) => h.textContent);
    expect(titres).toEqual([chat.omnibarre.groupes.recherche, chat.omnibarre.groupes.conversations]);
    expect(document.body.textContent).toContain('Pièce loyer');
    expect(document.body.textContent).toContain('Fil loyer');
  });
  it('une-source-en-panne-les-autres-restent', async () => {
    const panne: Source = { nom: 'conversations', groupe: 'conversations', chercher: async () => Promise.reject(new Error('x')) };
    await monter(<Omnibarre sources={[ok('recherche', 'Pièce loyer'), panne]} />);
    await saisir('loyer');
    expect(document.body.textContent).toContain('Pièce loyer');
    expect(document.body.textContent).toContain(chat.omnibarre.sourceEnPanne.replace('{nom}', 'conversations'));
    expect(document.body.textContent).not.toContain(chat.omnibarre.rien);
  });
});
