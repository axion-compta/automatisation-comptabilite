// @vitest-environment jsdom
// Fiche L00-T16 : composant Palette (Ctrl+K, liste, Entrée, Échap).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Palette, ouvrirPalette } from '../Palette.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

function monter(onAller: (c: string) => void): void {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  act(() => racine?.render(<Palette onAller={onAller} />));
}
const touche = (cible: EventTarget, init: KeyboardEventInit): void => {
  act(() => {
    cible.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });
};
function saisir(champ: HTMLInputElement, texte: string): void {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(champ, texte);
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Palette', () => {
  it('fermée au départ, Ctrl+K l\'ouvre avec les 11 destinations, Échap la ferme', () => {
    monter(vi.fn());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    touche(document, { key: 'k', ctrlKey: true });
    expect(document.querySelectorAll('li button')).toHaveLength(11);
    touche(document.querySelector('input') as HTMLInputElement, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('Entrée sur une phrase claire va à la page ; une ambiguë propose sans choisir', () => {
    const onAller = vi.fn();
    monter(onAller);
    touche(document, { key: 'k', metaKey: true });
    const champ = document.querySelector('input') as HTMLInputElement;
    saisir(champ, 'compte client');
    expect([...document.querySelectorAll('li button')].map((b) => b.textContent)).toEqual(['Mes comptes comptables', 'Mes clients et fournisseurs']);
    touche(champ, { key: 'Enter' });
    expect(onAller).not.toHaveBeenCalled();
    saisir(champ, '/aller la banque');
    touche(champ, { key: 'Enter' });
    expect(onAller).toHaveBeenCalledWith('/banque');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('un clic sur une entrée y mène', () => {
    const onAller = vi.fn();
    monter(onAller);
    touche(document, { key: 'k', ctrlKey: true });
    act(() => (document.querySelectorAll('li button')[5] as HTMLButtonElement).click());
    expect(onAller).toHaveBeenCalledWith('/declarations/tva');
  });
  it('ouvrir-palette-par-evenement', () => {
    monter(vi.fn());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => ouvrirPalette());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
  it('ecouteur-retire-au-demontage', () => {
    const ajout = vi.spyOn(document, 'addEventListener');
    const retrait = vi.spyOn(document, 'removeEventListener');
    monter(vi.fn());
    expect(ajout.mock.calls.some(([t]) => t === 'palette:ouvrir')).toBe(true);
    act(() => racine?.unmount());
    racine = null;
    expect(retrait.mock.calls.some(([t]) => t === 'palette:ouvrir')).toBe(true);
    act(() => ouvrirPalette());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    ajout.mockRestore();
    retrait.mockRestore();
  });
  it('textes affichés identiques aux originaux (venus de packages/textes)', () => {
    monter(vi.fn());
    touche(document, { key: 'k', ctrlKey: true });
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Palette de commandes');
    const champ = document.querySelector('input') as HTMLInputElement;
    expect(champ.getAttribute('aria-label')).toBe('Commande');
    expect(champ.placeholder).toBe('/aller une page');
    saisir(champ, 'zzzzqqqq');
    expect(document.querySelector('p')?.textContent).toBe('Aucune page ne correspond.');
  });
});
