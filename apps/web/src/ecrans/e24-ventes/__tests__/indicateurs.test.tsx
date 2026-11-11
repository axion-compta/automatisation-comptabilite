// @vitest-environment jsdom
// Fiche L10-T47 : rangée d'indicateurs du mois de l'écran E24 Ventes.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { e24Ventes as t } from '../../../../../../packages/textes/src/ecrans/e24-ventes.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Indicateurs } from '../Indicateurs.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const ind = (montantCentimes: number) => ({ montantCentimes, pieces: ['P1'] });
const rempli = (extra: Record<string, unknown> = {}) => ({
  chiffreAffaires: ind(123400), aEncaisser: ind(45600), enRetard: { ...ind(7800), clients: 2 },
  tvaCollectee: ind(24680), tvaEnAttente: ind(1350), provisoire: false, ...extra,
});
const zero = { montantCentimes: 0, pieces: [] };
const vides = { chiffreAffaires: zero, aEncaisser: zero, enRetard: { ...zero, clients: 0 }, tvaCollectee: zero, tvaEnAttente: zero, provisoire: false };

function simuler(corps: (url: URL) => unknown) {
  const urls: URL[] = [];
  vi.stubGlobal('fetch', (u: string) => {
    const url = new URL(String(u), 'http://x');
    urls.push(url);
    return Promise.resolve(Response.json({ body: corps(url) }));
  });
  return urls;
}
async function attendre() {
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))));
}
async function monter(mois = '2026-03') {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Indicateurs mois={mois} /></FournisseurDonnees>));
  await attendre();
}
const texte = () => document.body.textContent ?? '';

describe('E24 indicateurs', () => {
  it('cinq-indicateurs', async () => {
    const urls = simuler(() => rempli());
    await monter();
    expect(urls[0]?.pathname).toBe('/ventes/indicateurs');
    expect(urls[0]?.searchParams.get('mois')).toBe('2026-03');
    expect(document.querySelectorAll('.axion-indicateur')).toHaveLength(5);
    for (const l of [t.indicateurs.factureMois, t.indicateurs.resteAEncaisser, t.indicateurs.enRetard, t.indicateurs.tvaCollectee, t.indicateurs.tvaEnAttente]) expect(texte()).toContain(l);
    expect(texte()).toMatch(/1\s?234,00/);
    expect(texte()).toMatch(/246,80/);
    expect(texte()).toContain(`${t.clientsEnRetard} : 2`);
  });
  it('regime-a-confirmer-bandeau-et-aucun-montant', async () => {
    simuler(() => rempli({ tvaCollectee: { nonCalculee: 'regime_a_confirmer' } }));
    await monter();
    expect(document.querySelector('[role="status"]')?.textContent).toBe(t.profilIncomplet);
    const tva = [...document.querySelectorAll('.axion-indicateur')].filter((e) => /TVA/.test(e.textContent ?? ''));
    expect(tva).toHaveLength(2);
    for (const e of tva) {
      expect(e.textContent).toContain(t.tvaNonCalculee);
      expect(e.textContent).not.toMatch(/\d/);
    }
    expect(texte()).not.toMatch(/246,80|13,50/);
  });
  it('avec-propositions-provisoire', async () => {
    const urls = simuler((u) => rempli({ provisoire: u.searchParams.get('avecPropositions') === 'true' }));
    await monter();
    expect(texte()).not.toContain(t.provisoire);
    const case_ = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(case_.closest('label')?.textContent).toBe(t.avecPropositions);
    await act(async () => case_.click());
    await attendre();
    expect(urls.at(-1)?.searchParams.get('avecPropositions')).toBe('true');
    expect(document.querySelectorAll('.axion-indicateur__etiquette')).toHaveLength(5);
    expect(texte()).toContain(t.provisoire);
  });
  it('indicateur-mene-a-la-liste', async () => {
    simuler(() => rempli());
    await monter();
    const href = (libelle: string) => [...document.querySelectorAll('a')].find((a) => a.textContent?.includes(libelle))?.getAttribute('href');
    expect(href(t.indicateurs.resteAEncaisser)).toBe('/factures/ventes?mois=2026-03&etat=a_encaisser');
    expect(href(t.indicateurs.enRetard)).toBe('/factures/ventes?mois=2026-03&etat=en_retard');
    expect(href(t.indicateurs.factureMois)).toBe('/factures/ventes?mois=2026-03');
    expect(document.querySelectorAll('a.axion-indicateur__lien')).toHaveLength(5);
  });
  it('societe-vide-zeros-et-aucune-vente-ce-mois-ci', async () => {
    simuler(() => vides);
    await monter();
    expect(texte()).toContain(t.aucuneVenteMois);
    expect(document.querySelectorAll('.axion-indicateur')).toHaveLength(5);
    expect(texte()).toMatch(/0,00/);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
  it('chargement-sans-chiffre', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    await monter();
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(5);
    expect(texte()).not.toMatch(/\d/);
    expect(texte()).not.toContain('€');
  });
});
