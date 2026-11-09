// @vitest-environment jsdom
// Fiche L15-T57 : écran T05 Mes préférences (faux serveur en Node).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { t05 } from '../../../../../../packages/textes/src/ecrans/t05.js';
import { FournisseurDonnees } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
let noeud: { fermer: () => void } | null = null;
beforeEach(async () => {
  localStorage.clear();
  noeud = demarrerNoeud({ base: location.origin });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees><Ecran /></FournisseurDonnees>));
  await attendre(() => document.querySelector('[data-vocabulaire]') !== null);
});
afterEach(() => (act(() => racine?.unmount()), noeud?.fermer(), (document.body.innerHTML = '')));
const pause = (ms = 20) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
async function attendre(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await pause();
  expect(condition()).toBe(true);
}
const texte = () => document.body.textContent ?? '';
const champ = (libelle: string) => ([...document.querySelectorAll('label')].find((l) => l.textContent === libelle) as HTMLLabelElement).control as HTMLInputElement;
const mots = () => [...document.querySelectorAll('[data-vocabulaire] li')].map((l) => l.textContent);
const copie = () => (JSON.parse(localStorage.getItem('axion.preferences.v1') ?? '{}') as Record<string, Record<string, unknown>>)['bureau'] ?? {};
const clic = (el: HTMLElement) => act(async () => el.click());
async function saisir(el: HTMLInputElement, valeur: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('T05 Mes préférences', () => {
  it('route-declaree', () => expect([route.id, route.chemin]).toEqual(['t05', '/reglages/preferences']));

  it('aucun-choix-de-format-de-nombre', () => {
    expect(document.querySelector('select')).toBeNull();
    expect(texte()).not.toMatch(/format|virgule|décimal/i);
    expect([...document.querySelectorAll('input[type="radio"]')].map((r) => r.parentElement?.textContent)).toEqual([t05.affichage.simple, t05.affichage.comptable]);
  });

  it('aucune-option-mensuelle', () => {
    expect(texte()).not.toMatch(/mensuel|mois/i);
    expect(champ(t05.notifications.resume)).toBeDefined();
  });

  it('mode-comptable-change-les-mots', async () => {
    const avant = mots();
    expect(avant.length).toBeGreaterThan(0);
    await clic(champ(t05.affichage.comptable));
    await attendre(() => document.querySelector('[data-vocabulaire="comptable"]') !== null);
    expect(mots()).not.toEqual(avant);
    expect(copie()['mode']).toBe('comptable');
  });

  it('raccourcis-desactivables', async () => {
    expect(champ(t05.clavier.raccourcis).checked).toBe(true);
    await clic(champ(t05.clavier.raccourcis));
    expect(champ(t05.clavier.raccourcis).checked).toBe(false);
    expect((copie()['raccourcis'] as { actifs: boolean }).actifs).toBe(false);
  });

  it('resume-actif-par-defaut', () => expect(champ(t05.notifications.resume).checked).toBe(true));

  it('heure-invalide-refusee', async () => {
    const heure = champ(t05.notifications.heure);
    await saisir(heure, '24:00');
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(t05.notifications.heureInvalide);
    expect(copie()['resume_email']).toBeUndefined();
    await saisir(heure, '08:30');
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(copie()['resume_email']).toEqual({ actif: true, heure: '08:30' });
  });

  it('mesure-d-usage-pseudonymisee', () => {
    expect(texte()).toContain(t05.usage.description);
    expect(texte()).toMatch(/pseudonymis/);
    expect(texte()).not.toMatch(/anonym/i);
  });

  it('jamais-le-mot-supprime', () => expect(texte()).not.toMatch(/supprim/i));

  it('titre-h1-unique', () => {
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(t05.titre);
  });
});
