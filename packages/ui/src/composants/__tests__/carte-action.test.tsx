// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { centimes } from '../../../../noyau/src/argent/index.js';
import { CarteAction, type CarteActionProps } from '../CarteAction.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const libelles = {
  mention: 'MENTION-AVANT',
  mentionValidee: (personne: string, date: string) => `VALIDE-PAR ${personne} LE ${date}`,
  objets: (n: number) => `${String(n)} OBJETS`,
  periode: (p: string) => `PERIODE ${p}`,
  appliquer: 'APPLIQUER',
  confirmer: 'CONFIRMER',
  ouvrirEcran: 'OUVRIR-ECRAN',
  pourquoi: 'POURQUOI',
};
type Prop = CarteActionProps['proposition'];
const conteneurs: HTMLElement[] = [];
const rappels = () => ({ onAppliquer: vi.fn(), onOuvrirEcran: vi.fn(), onPourquoi: vi.fn() });

async function monter(proposition: Prop, extra: Partial<CarteActionProps> = {}) {
  const f = rappels();
  const c = document.createElement('div');
  document.body.appendChild(c);
  conteneurs.push(c);
  await act(async () => {
    createRoot(c).render(<CarteAction proposition={proposition} libelles={libelles} etat="a_valider" {...f} {...extra} />);
  });
  return { c, f };
}
afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});
const bouton = (c: HTMLElement, texte: string) => [...c.querySelectorAll('button')].find((b) => b.textContent === texte);
const cliquer = (b: HTMLElement | undefined) => act(async () => b!.click());
async function entree(cible: HTMLElement): Promise<KeyboardEvent> {
  const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  await act(async () => {
    cible.dispatchEvent(e);
  });
  return e;
}
const B: Prop = { niveau: 'B', nombreObjets: 3 };
const M: Prop = { niveau: 'M', nombreObjets: 3 };
const I: Prop = { niveau: 'I', nombreObjets: 3 };

describe('CarteAction', () => {
  it('affiche-nombre-periode-montant', async () => {
    const { c } = await monter({ niveau: 'B', nombreObjets: 12, periode: '2026-T1', montantTotalCentimes: centimes(123456) });
    expect(c.textContent).toContain('12 OBJETS');
    expect(c.textContent).toContain('PERIODE 2026-T1');
    expect(c.textContent).toMatch(/1\s234,56/);
    expect(c.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('mention-avant-validation', async () => {
    for (const etat of ['a_valider', 'confirmation', 'expiree'] as const) {
      const { c } = await monter(M, { etat });
      expect(c.textContent).toContain('MENTION-AVANT');
      expect(c.textContent).not.toContain('VALIDE-PAR');
    }
  });

  it('mention-apres-validation', async () => {
    const { c } = await monter(B, { etat: 'appliquee', validation: { personne: 'Camille Exemple', date: '2026-11-07' } });
    expect(c.textContent).toContain('VALIDE-PAR Camille Exemple LE 07/11/2026');
    expect(c.textContent).not.toContain('MENTION-AVANT');
    expect(bouton(c, 'APPLIQUER')).toBeUndefined();
    const sansDate = await monter(B, { etat: 'appliquee', validation: { personne: 'Camille Exemple', date: 'pas-une-date' } });
    expect(sansDate.c.textContent).toContain('VALIDE-PAR Camille Exemple');
    const sansValidation = await monter(B, { etat: 'appliquee' });
    expect(sansValidation.c.textContent).toContain('MENTION-AVANT');
  });

  it('niveau-b-un-clic', async () => {
    const { c, f } = await monter(B);
    expect(bouton(c, 'CONFIRMER')).toBeUndefined();
    await cliquer(bouton(c, 'APPLIQUER'));
    expect(f.onAppliquer).toHaveBeenCalledTimes(1);
  });

  it('niveau-m-deux-clics', async () => {
    const { c, f } = await monter(M);
    await cliquer(bouton(c, 'APPLIQUER'));
    expect(f.onAppliquer).not.toHaveBeenCalled();
    expect(bouton(c, 'CONFIRMER')).toBeDefined();
    await cliquer(bouton(c, 'CONFIRMER'));
    expect(f.onAppliquer).toHaveBeenCalledTimes(1);
    const seul = await monter(M, { etat: 'expiree' });
    expect(bouton(seul.c, 'APPLIQUER')).toBeUndefined();
  });

  it('entree-n-applique-pas-m', async () => {
    const { c, f } = await monter(M);
    for (const cible of [c.firstElementChild as HTMLElement, bouton(c, 'APPLIQUER')!]) expect((await entree(cible)).defaultPrevented).toBe(true);
    await cliquer(bouton(c, 'APPLIQUER'));
    expect((await entree(bouton(c, 'CONFIRMER')!)).defaultPrevented).toBe(true);
    expect(f.onAppliquer).not.toHaveBeenCalled();
  });

  it('entree-n-applique-pas-i', async () => {
    const { c, f } = await monter(I);
    for (const cible of [c.firstElementChild as HTMLElement, bouton(c, 'OUVRIR-ECRAN')!]) expect((await entree(cible)).defaultPrevented).toBe(true);
    expect(f.onAppliquer).not.toHaveBeenCalled();
    expect(f.onOuvrirEcran).not.toHaveBeenCalled();
    const touche = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    await act(async () => {
      bouton(c, 'POURQUOI')!.dispatchEvent(touche);
    });
    expect(touche.defaultPrevented).toBe(false);
  });

  it('niveau-i-ouvrir-l-ecran-seulement', async () => {
    for (const etat of ['a_valider', 'confirmation'] as const) {
      const { c, f } = await monter(I, { etat });
      expect(bouton(c, 'APPLIQUER')).toBeUndefined();
      expect(bouton(c, 'CONFIRMER')).toBeUndefined();
      await cliquer(bouton(c, 'OUVRIR-ECRAN'));
      expect(f.onOuvrirEcran).toHaveBeenCalledTimes(1);
      expect(f.onAppliquer).not.toHaveBeenCalled();
    }
    const { c, f } = await monter(B);
    await cliquer(bouton(c, 'POURQUOI'));
    expect(f.onPourquoi).toHaveBeenCalledTimes(1);
    expect(bouton(c, 'OUVRIR-ECRAN')).toBeUndefined();
  });

  it('montant-absent-ou-zero', async () => {
    const vide = await monter(B);
    expect(vide.c.textContent).not.toMatch(/€|NaN|Infinity|undefined/);
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const { c } = await monter({ ...B, montantTotalCentimes: mauvais as never });
      expect(c.textContent).not.toMatch(/€|NaN|Infinity|undefined/);
    }
    const zero = await monter({ ...B, montantTotalCentimes: centimes(0) });
    expect(zero.c.textContent).toContain('0,00');
    const neg = await monter({ ...B, montantTotalCentimes: centimes(-500) });
    expect(neg.c.textContent).toContain('5,00');
    const nb = await monter({ niveau: 'B', nombreObjets: Number.NaN });
    expect(nb.c.textContent).not.toMatch(/NaN|OBJETS/);
  });
});
