// @vitest-environment jsdom
// Fiche L10-T49 : écran E44 fiche d'un client.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e44Client as t } from '../../../../../../packages/textes/src/ecrans/e44-client.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
async function monter(code: string): Promise<void> {
  history.replaceState(null, '', route.chemin + (code ? '?code=' + code : ''));
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 150))));
}
const fiche = (o: object) => ({ code: 'CLI9', nom: 'Maison Test', nature: 'professionnel', statutVies: 'non_verifie', soldeCentimes: 0, facturesOuvertes: [], delaiMoyenJours: null, ...o });
const simuler = (o: object) => vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ body: fiche(o) })));

describe('E44 fiche client', () => {
  it('route-declaree', () => expect([route.id, route.chemin, route.groupe]).toEqual(['e44-client', '/reglages/entreprise/client', 'reglages']));
  it('affiche-la-fiche', async () => {
    await monter('CLI001');
    expect(document.querySelector('h1')?.textContent).toBe('Immobilière Marceau');
    for (const m of [t.nature.professionnel, '987654324', t.vies.libelle, t.solde, t.factures.titre]) expect(document.body.textContent).toContain(m);
    expect(document.querySelector('[data-signe]') ?? document.querySelector('dd span')).not.toBeNull();
  });
  it('tva-non-verifiee-jamais-valide', async () => {
    for (const [statut, mot, autres] of [['non_verifie', t.vies.non_verifie, [t.vies.verifie, t.vies.invalide]], ['invalide', t.vies.invalide, [t.vies.verifie]], ['verifie', t.vies.verifie, [t.vies.non_verifie]]] as const) {
      simuler({ statutVies: statut, tva: 'FR00000000000' });
      await monter('CLI9');
      const dd = [...document.querySelectorAll('dd')].map((d) => d.textContent);
      expect(dd).toContain(mot);
      for (const a of autres) expect(dd).not.toContain(a);
      expect(document.body.textContent).not.toMatch(/(?<![a-zé])valide\b/i);
      act(() => racine?.unmount());
    }
  });
  it('factures-ouvertes-cliquables', async () => {
    simuler({ soldeCentimes: 3000, facturesOuvertes: [{ id: 'F 1', numero: 'FA-1', resteDuCentimes: 1000, etat: 'ouverte' }, { id: 'F2', numero: 'FA-2', resteDuCentimes: 2000, etat: 'ouverte' }] });
    await monter('CLI9');
    const liens = [...document.querySelectorAll<HTMLAnchorElement>('li a')];
    expect(liens.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['FA-1', '/factures/vente?id=F%201'], ['FA-2', '/factures/vente?id=F2']]);
    simuler({});
    act(() => racine?.unmount());
    await monter('CLI9');
    expect(document.body.textContent).toContain(t.factures.aucune);
  });
  it('delai-moyen-non-connu', async () => {
    simuler({ delaiMoyenJours: null });
    await monter('CLI9');
    expect(document.body.textContent).toContain(t.delai.inconnu);
    act(() => racine?.unmount());
    simuler({ delaiMoyenJours: 0 });
    await monter('CLI9');
    expect(document.body.textContent).toContain('0 jours');
    expect(document.body.textContent).not.toContain(t.delai.inconnu);
  });
  it('habitude-en-phrase', async () => {
    simuler({ nom: 'Immobilière Marceau', habitude: { nature: 'service', compteProduit: '706' } });
    await monter('CLI9');
    expect(document.body.textContent).toContain('Quand le client est Immobilière Marceau, alors 706 Prestations');
    act(() => racine?.unmount());
    simuler({});
    await monter('CLI9');
    expect(document.body.textContent).toContain(t.habitude.aucune);
  });
  it('client-inconnu-erreur-et-retour', async () => {
    for (const code of ['CLI-INCONNU', '']) {
      await monter(code);
      expect(document.querySelector('[role=alert]')?.textContent).toContain(t.etats.inconnu);
      expect(document.querySelector<HTMLAnchorElement>(`a[href="/reglages/entreprise/tiers"]`)?.textContent).toBe(t.retour);
      act(() => racine?.unmount());
    }
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({}, { status: 500 })));
    await monter('CLI001');
    expect(document.querySelector('[role=alert]')?.textContent).toContain(t.etats.erreur);
    expect(document.querySelector('dl')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d\s?€/);
  });
});
