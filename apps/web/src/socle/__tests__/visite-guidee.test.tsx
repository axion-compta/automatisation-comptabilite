// @vitest-environment jsdom
// Fiche L19-T22 : visite guidée de la première pièce.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { socleVisite } from '../../../../../packages/textes/src/ecrans/socle-visite.js';
import { VisiteGuidee } from '../VisiteGuidee.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
beforeEach(() => sessionStorage.clear());
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
});

async function monter(nombre: number | null, idPiece?: string): Promise<void> {
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(
    <>
      <h1 id="stable" tabIndex={-1}>titre</h1>
      <VisiteGuidee nombrePieces={nombre} surFermeture={() => document.getElementById('stable')?.focus()} {...(idPiece === undefined ? {} : { idPiece })} />
    </>,
  ));
}
const bouton = (t: string): HTMLButtonElement | undefined => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === t);
const clic = (t: string) => act(async () => bouton(t)?.click());
const titre = (): string => document.querySelector('h2')?.textContent ?? '';

describe('visite guidée', () => {
  it('visible-si-aucune-piece', async () => {
    await monter(0);
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(titre()).toBe(socleVisite.etapes[0].titre);
    expect(document.activeElement).toBe(document.querySelector('h2'));
  });
  it('absente-si-une-piece', async () => {
    await monter(1);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });
  it('absente-si-nombre-inconnu-ou-negatif', async () => {
    await monter(null);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    act(() => racine?.unmount());
    await monter(-1);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    act(() => racine?.unmount());
    await monter(Number.NaN);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });
  it('trois-etapes-dans-l-ordre', async () => {
    await monter(0);
    expect(titre()).toBe(socleVisite.etapes[0].titre);
    expect(bouton(socleVisite.actions.precedent)).toBeUndefined();
    await clic(socleVisite.actions.suivant);
    expect(titre()).toBe(socleVisite.etapes[1].titre);
    await clic(socleVisite.actions.suivant);
    expect(titre()).toBe(socleVisite.etapes[2].titre);
    expect(bouton(socleVisite.actions.suivant)).toBeUndefined();
    expect(document.activeElement).toBe(document.querySelector('h2'));
    await clic(socleVisite.actions.precedent);
    expect(titre()).toBe(socleVisite.etapes[1].titre);
  });
  it('etape-trois-lien-vers-la-piece', async () => {
    await monter(0, 'depot 1');
    expect(document.querySelector('a')).toBeNull();
    await clic(socleVisite.actions.suivant);
    await clic(socleVisite.actions.suivant);
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/documents/piece?id=depot%201');
    expect(document.querySelector('a')?.textContent).toBe(socleVisite.lienPiece);
  });
  it('ignorer-masque', async () => {
    await monter(0);
    await clic(socleVisite.actions.ignorer);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(sessionStorage.getItem('visite-guidee-ignoree')).toBe('1');
    expect(document.activeElement).toBe(document.getElementById('stable'));
    act(() => racine?.unmount());
    await monter(0);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });
  it('echap-ferme', async () => {
    await monter(0);
    const autre = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    await act(async () => document.querySelector('h2')?.dispatchEvent(autre));
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    await act(async () => document.querySelector('h2')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('stable'));
  });
});
