// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../noyau/src/argent/index.js';
import { formaterMontantAffiche } from '../../format/affichage.js';
import { CarteTvaAPayer, type CarteTvaAPayerProps } from '../CarteTvaAPayer.js';

const textes = {
  titre: 'Titre fictif',
  aConfirmer: 'Montant à confirmer',
  bloquee: 'Pièces à lever',
  payee: 'Payée par',
  lienPieces: 'Voir les pièces',
  echeance: 'Échéance',
};

async function monter(props: Partial<CarteTvaAPayerProps> & Pick<CarteTvaAPayerProps, 'etat'>): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(<CarteTvaAPayer echeance="2026-12-19" textes={textes} lienPieces="/pieces" {...props} />);
  });
  return conteneur;
}

/** Texte de la carte sans l'échéance (testée à part). */
function texteSansEcheance(c: HTMLElement): string {
  const copie = c.cloneNode(true) as HTMLElement;
  copie.querySelector('.axion-carte-tva__echeance')?.remove();
  return copie.textContent ?? '';
}

describe('carte TVA à payer', () => {
  it('montant-affiche-via-montant', async () => {
    const c = await monter({ etat: { etat: 'montant', centimes: 123456 } });
    expect(c.querySelector('.axion-carte-tva__montant span')?.textContent).toBe(formaterMontantAffiche(centimes(123456)));
    expect(c.querySelector('a')).toBeNull();
  });

  it('a-confirmer-aucun-chiffre', async () => {
    const c = await monter({ etat: { etat: 'a_confirmer' } });
    expect(texteSansEcheance(c)).toContain('Montant à confirmer');
    expect(texteSansEcheance(c)).not.toMatch(/[0-9]/);
    expect(c.querySelector('.axion-carte-tva__montant')).toBeNull();
  });

  it('bloquee-aucun-montant-et-lien', async () => {
    const c = await monter({ etat: { etat: 'bloquee', pieces: 1 } });
    expect(texteSansEcheance(c)).not.toMatch(/[0-9]/);
    expect(texteSansEcheance(c)).not.toContain('€');
    expect(c.querySelector('.axion-carte-tva__montant')).toBeNull();
    expect(c.querySelector('a')?.getAttribute('href')).toBe('/pieces');
    expect(texteSansEcheance(c)).toContain('Pièces à lever');
    const sansLien = await monter({ etat: { etat: 'bloquee', pieces: 3 }, lienPieces: '' });
    expect(sansLien.querySelector('a')).toBeNull();
    const vide = await monter({
      etat: { etat: 'bloquee', pieces: 0 },
      textes: { titre: '', aConfirmer: '', bloquee: '', payee: '', lienPieces: '', echeance: '' },
    });
    expect(vide.querySelector('.axion-carte-tva__montant')).toBeNull();
  });

  it('payee-par-et-date', async () => {
    const c = await monter({ etat: { etat: 'payee', par: 'Camille Fictif', le: '2026-12-10' } });
    expect(c.querySelector('[data-champ="par"]')?.textContent).toBe('Camille Fictif');
    expect(c.querySelector('[data-champ="le"]')?.textContent).toBe('2026-12-10');
    expect(c.querySelector('.axion-carte-tva__montant')).toBeNull();
  });

  it('aucun-bouton-payer', async () => {
    for (const etat of [
      { etat: 'montant', centimes: 100 },
      { etat: 'a_confirmer' },
      { etat: 'bloquee', pieces: 2 },
      { etat: 'payee', par: 'Camille Fictif', le: '2026-12-10' },
    ] as const) {
      const c = await monter({ etat });
      expect(c.querySelector('button, [role="button"], input[type="submit"]')).toBeNull();
      expect(c.textContent?.toLowerCase()).not.toContain('payer maintenant');
    }
  });

  it('echeance-affichee', async () => {
    const c = await monter({ etat: { etat: 'a_confirmer' }, echeance: '2027-01-19' });
    expect(c.querySelector('[data-champ="echeance"]')?.textContent).toBe('2027-01-19');
    expect(c.querySelector('.axion-carte-tva__echeance')?.textContent).toContain('Échéance');
  });

  it('montant-negatif-credit-affiche', async () => {
    const c = await monter({ etat: { etat: 'montant', centimes: -5000 } });
    const m = c.querySelector('.axion-carte-tva__montant span');
    expect(m?.textContent).toBe(formaterMontantAffiche(centimes(-5000)));
    expect(m?.getAttribute('data-signe')).toBe('negatif');
  });

  it('montant-invalide-refuse', async () => {
    for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 12.5]) {
      await expect(monter({ etat: { etat: 'montant', centimes: valeur } })).rejects.toThrow();
    }
  });
});
