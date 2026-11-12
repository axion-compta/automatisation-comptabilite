// @vitest-environment jsdom
// Fiche L15-T58 : raccourcis d'une lettre.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installerLettres } from '../lettres.js';

let retrait: (() => void) | null = null;
afterEach(() => {
  retrait?.();
  retrait = null;
  document.body.innerHTML = '';
});

function monter(actifs = true) {
  const c = vi.fn();
  retrait = installerLettres(window, { actifs: () => actifs, actions: { c } });
  return c;
}
const appuyer = (cible: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true, ...init });
  cible.dispatchEvent(e);
  return e;
};
const ajouter = (html: string): Element => {
  document.body.insertAdjacentHTML('beforeend', html);
  return document.body.lastElementChild as Element;
};

describe('lettres', () => {
  it('lettre-hors-champ-agit', () => {
    const c = monter();
    const e = appuyer(document.body);
    expect(c).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    appuyer(document.body, { key: 'x' });
    appuyer(document.body, { key: '1' });
    expect(c).toHaveBeenCalledTimes(1);
  });

  it.each([['input', '<input />'], ['textarea', '<textarea></textarea>'], ['select', '<select></select>'], ['contenteditable', '<div contenteditable="true"><span>a</span></div>']])(
    'lettre-dans-un-champ-ignoree (%s)',
    (_nom, html) => {
      const c = monter();
      const el = ajouter(html);
      const cible = el.firstElementChild && el.tagName === 'DIV' ? el.firstElementChild : el;
      const e = appuyer(cible);
      expect(c).not.toHaveBeenCalled();
      expect(e.defaultPrevented).toBe(false);
    },
  );

  it('desactives-rien', () => {
    const c = monter(false);
    appuyer(document.body);
    expect(c).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { altKey: true }, { metaKey: true }])('avec-ctrl-ignoree %j', (init) => {
    const c = monter();
    appuyer(document.body, init);
    expect(c).not.toHaveBeenCalled();
  });

  it('dialogue-ouvert-ignoree', () => {
    const c = monter();
    const d = ajouter('<div aria-modal="true" role="dialog"></div>');
    appuyer(document.body);
    d.remove();
    ajouter('<dialog open></dialog>');
    appuyer(document.body);
    expect(c).not.toHaveBeenCalled();
  });

  it('retrait-des-ecouteurs', () => {
    const c = monter();
    retrait?.();
    retrait = null;
    appuyer(document.body);
    expect(c).not.toHaveBeenCalled();
  });
});
