// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../noyau/src/argent/index.js';
import { Montant } from '../Montant.js';

async function monter(element: React.ReactElement): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(element);
  });
  const span = conteneur.querySelector('span');
  if (!span) throw new Error('span absent');
  return span;
}

describe('montant', () => {
  it('composant-montant-texte', async () => {
    const positif = await monter(<Montant centimes={centimes(123456)} libelleNegatif="complet" />);
    expect(positif.textContent).toBe('1 234,56 €');
    expect(positif.hasAttribute('data-signe')).toBe(false);
    expect(positif.hasAttribute('aria-label')).toBe(false);

    const negatif = await monter(<Montant centimes={centimes(-500)} libelleNegatif="complet" />);
    expect(negatif.textContent).toBe('−5,00 €');
    expect(negatif.getAttribute('data-signe')).toBe('negatif');
    expect(negatif.getAttribute('aria-label')).toBe('complet');

    const sansLibelle = await monter(<Montant centimes={centimes(-500)} />);
    expect(sansLibelle.getAttribute('data-signe')).toBe('negatif');
    expect(sansLibelle.hasAttribute('aria-label')).toBe(false);

    const zero = await monter(<Montant centimes={centimes(0)} />);
    expect(zero.hasAttribute('data-signe')).toBe(false);
  });
});
