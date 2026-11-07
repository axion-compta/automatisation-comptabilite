// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../noyau/src/argent/index.js';
import { formaterMontantAffiche } from '../../format/affichage.js';
import { Indicateur } from '../Indicateur.js';

async function monter(element: React.ReactElement): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(element);
  });
  return conteneur;
}

describe('indicateur', () => {
  it('affiche-le-montant', async () => {
    const c = await monter(<Indicateur libelle="Chiffre d'affaires" montant={centimes(123456)} />);
    expect(c.textContent).toContain("Chiffre d'affaires");
    expect(c.textContent).toContain(formaterMontantAffiche(centimes(123456)));
    expect(c.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('null-affiche-le-texte-d-absence-sans-zero', async () => {
    const c = await monter(<Indicateur libelle="Résultat" montant={null} texteAbsence="Non calculé" />);
    expect(c.textContent).toContain('Non calculé');
    expect(c.textContent).not.toMatch(/0/);
    expect(c.textContent).not.toContain('€');
    // un vrai zéro, lui, reste affiché
    const zero = await monter(<Indicateur libelle="Résultat" montant={centimes(0)} texteAbsence="Non calculé" />);
    expect(zero.textContent).toContain(formaterMontantAffiche(centimes(0)));
    expect(zero.textContent).not.toContain('Non calculé');
  });

  it('lien-nom-accessible-complet', async () => {
    const c = await monter(
      <Indicateur libelle="Achats" montant={centimes(50000)} href="/pieces?type=achats" />,
    );
    const liens = c.querySelectorAll('a');
    expect(liens.length).toBe(1);
    const lien = liens[0] as HTMLAnchorElement;
    expect(lien.getAttribute('href')).toBe('/pieces?type=achats');
    expect(lien.textContent).toContain('Achats');
    expect(lien.textContent).toContain(formaterMontantAffiche(centimes(50000)));
    expect(lien.hasAttribute('aria-label')).toBe(false);
    // montant absent : le lien porte le libellé et le texte d'absence, jamais « 0 »
    const absent = await monter(
      <Indicateur libelle="Achats" montant={null} texteAbsence="Non calculé" href="/pieces" />,
    );
    const lienAbsent = absent.querySelector('a');
    expect(lienAbsent?.textContent).toContain('Achats');
    expect(lienAbsent?.textContent).toContain('Non calculé');
    expect(lienAbsent?.textContent).not.toMatch(/0/);
  });

  it('sans-lien-pas-de-role-link', async () => {
    const c = await monter(<Indicateur libelle="Ventes" montant={centimes(100)} />);
    expect(c.querySelector('a')).toBeNull();
    expect(c.querySelector('[role="link"]')).toBeNull();
    expect(c.querySelector('[href]')).toBeNull();
  });

  it('provisoire-etiquete', async () => {
    const c = await monter(
      <Indicateur libelle="Ventes" montant={centimes(100)} provisoire texteProvisoire="Provisoire" />,
    );
    expect(c.textContent).toContain('Provisoire');
    expect(c.querySelector('[data-provisoire="oui"]')).not.toBeNull();
    const definitif = await monter(
      <Indicateur libelle="Ventes" montant={centimes(100)} texteProvisoire="Provisoire" />,
    );
    expect(definitif.textContent).not.toContain('Provisoire');
    expect(definitif.querySelector('[data-provisoire]')).toBeNull();
  });

  it('chargement-sans-chiffre', async () => {
    const c = await monter(
      <Indicateur
        libelle="Ventes"
        montant={centimes(123456)}
        href="/pieces"
        provisoire
        texteProvisoire="Provisoire"
        chargement
      />,
    );
    expect(c.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(c.textContent).not.toMatch(/[0-9]/);
    expect(c.textContent).not.toContain('€');
    expect(c.querySelector('a')).toBeNull();
    expect(c.textContent).not.toContain('Provisoire');
    const nul = await monter(<Indicateur libelle="Ventes" montant={null} texteAbsence="Non calculé" chargement />);
    expect(nul.textContent).not.toContain('Non calculé');
  });

  it('montant-negatif-signe', async () => {
    const c = await monter(<Indicateur libelle="CA net" montant={centimes(-250075)} href="/pieces" />);
    expect(c.textContent).toContain(formaterMontantAffiche(centimes(-250075)));
    expect(c.querySelector('a')?.textContent).toContain(formaterMontantAffiche(centimes(-250075)));
    expect(c.querySelector('[data-signe="negatif"]')).not.toBeNull();
  });
});
