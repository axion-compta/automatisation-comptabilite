// @vitest-environment jsdom
// Fiche L01-T37 : écran N04 Mes comptes comptables (faux serveur en Node).
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { n04 } from '../../../../../../packages/textes/src/ecrans/n04.js';
import { formaterMontantAffiche } from '../../../../../../packages/ui/src/format/affichage.js';
import { centimes } from '../../../../../../packages/noyau/src/argent/index.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FournisseurDonnees } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let noeud: { fermer: () => void };
let racine: Root | null = null;
let vraiFetch: typeof fetch;
beforeAll(() => {
  noeud = demarrerNoeud();
  vraiFetch = globalThis.fetch;
});
afterAll(() => noeud.fermer());
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function pause(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
async function attendre(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await pause(20);
  expect(condition()).toBe(true);
}
async function monter() {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(
      <FournisseurDonnees>
        <Ecran />
      </FournisseurDonnees>,
    );
  });
}
const lignes = () => [...document.querySelectorAll('tbody tr')];
const numeros = () => lignes().map((l) => l.querySelector('td')?.textContent ?? '');
const champ = <T extends HTMLElement>(libelle: string): T => {
  const l = [...document.querySelectorAll('label')].find((x) => x.textContent === libelle);
  return (l as HTMLLabelElement).control as T;
};
async function saisir(el: HTMLSelectElement | HTMLInputElement, valeur: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function envoyer() {
  await act(async () => document.querySelector('form')?.requestSubmit());
}
/** Plan simulé de 120 comptes (50 par page) ; les autres routes passent par le faux serveur. */
function planLong(appels: string[]) {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    if (!String(url).includes('/plan?')) return vraiFetch(url, init);
    appels.push(String(url));
    const d = Number(new URL(String(url)).searchParams.get('decalage'));
    const body = Array.from({ length: 50 }, (_, i) => ({ numero: String(600000 + d + i), libelle: 'Compte fictif', classe: 6, soldeCentimes: 0 }));
    return Promise.resolve(Response.json({ body, decalage: d, total: 120 }));
  });
}

describe('N04', () => {
  it('affiche-le-plan-de-l-annee-ouverte', async () => {
    await monter();
    await attendre(() => lignes().length === 25);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(n04.titre);
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('EX2026');
    expect(numeros()).toContain('101000');
    expect(route.id).toBe('n04');
    expect(route.chemin).toBe('/reglages/entreprise/comptes');
    expect(route.groupe).toBe('reglages');
  });

  it('filtre-classe-6', async () => {
    await monter();
    await attendre(() => lignes().length === 25);
    const classe = champ<HTMLSelectElement>(n04.champs.classe);
    expect([...classe.options].map((o) => o.value)).toEqual(['', '1', '2', '3', '4', '5', '6', '7']);
    await saisir(classe, '6');
    await attendre(() => lignes().length === 7);
    expect(numeros().every((n) => n.startsWith('6'))).toBe(true);
    await saisir(classe, '');
    await attendre(() => lignes().length === 25);
  });

  it('recherche-sans-accent', async () => {
    await monter();
    await attendre(() => lignes().length === 25);
    const recherche = champ<HTMLInputElement>(n04.champs.recherche);
    await saisir(recherche, '  RESERVES  ');
    await pause();
    expect(lignes()).toHaveLength(25); // rien n'est envoyé avant la validation
    await envoyer();
    await attendre(() => lignes().length === 1);
    expect(lignes()[0]?.textContent).toContain('Réserves');
    await saisir(recherche, 'zzzz');
    await envoyer();
    await attendre(() => document.body.textContent?.includes(n04.etats.videTitre) === true);
    expect(lignes()).toHaveLength(0);
  });

  it('pagination-suivante', async () => {
    const appels: string[] = [];
    planLong(appels);
    await monter();
    await attendre(() => numeros()[0] === '600000');
    expect(appels[0]).toContain('limite=50');
    expect(appels[0]).toContain('decalage=0');
    expect(document.body.textContent).toContain('1 à 50 sur 120');
    const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t) as HTMLButtonElement;
    expect(bouton(n04.pagination.precedent).disabled).toBe(true);
    await act(async () => bouton(n04.pagination.suivant).click());
    await attendre(() => numeros()[0] === '600050');
    expect(appels.at(-1)).toContain('decalage=50');
    expect(document.body.textContent).toContain('51 à 100 sur 120');
    await act(async () => bouton(n04.pagination.precedent).click());
    await attendre(() => numeros()[0] === '600000');
  });

  it('solde-formate', async () => {
    await monter();
    await attendre(() => lignes().length === 25);
    const ligne = (n: string) => lignes().find((l) => l.querySelector('td')?.textContent === n);
    const solde = ligne('606000')?.querySelectorAll('td')[2];
    expect(solde?.textContent).toBe(formaterMontantAffiche(centimes(241984300)));
    expect(solde?.className).toContain('droite');
    const negatif = ligne('401000')?.querySelectorAll('td')[2];
    expect(negatif?.textContent).toBe(formaterMontantAffiche(centimes(-241984300)));
    expect(negatif?.querySelector('[data-signe="negatif"]')?.getAttribute('aria-label')).toBe(
      n04.tableau.soldeNegatif.replace('{montant}', formaterMontantAffiche(centimes(-241984300))),
    );
  });

  it('champs-de-formulaire-nommes', async () => {
    await monter();
    await attendre(() => lignes().length === 25);
    for (const libelle of Object.values(n04.champs)) {
      const el = champ<HTMLElement>(libelle);
      expect(el, libelle).toBeTruthy();
      expect((el as HTMLInputElement).labels?.[0]?.textContent).toBe(libelle);
    }
    expect(document.querySelectorAll('select')).toHaveLength(2);
  });

  it('entrees-limites', async () => {
    const ex = (id: string, statut: string) => ({ id, libelle: id, debut: '2025-01-01', fin: '2025-12-31', statut });
    const servir = (exercices: unknown[], plan: unknown) =>
      vi.stubGlobal('fetch', (url: string) =>
        Promise.resolve(Response.json(String(url).includes('/plan?') ? plan : { body: exercices, decalage: 0, total: exercices.length })),
      );
    const vide = { body: [], decalage: 0, total: 0 };
    servir([], vide); // aucune année
    await monter();
    await attendre(() => document.body.textContent?.includes(n04.etats.aucuneAnnee) === true);
    act(() => racine?.unmount());
    servir([ex('A', 'cloture'), ex('B', 'ouvert')], vide); // ordre inversé : l'année ouverte reste choisie
    await monter();
    await attendre(() => document.body.textContent?.includes(n04.etats.videTitre) === true);
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('B');
    act(() => racine?.unmount());
    servir([ex('A', 'cloture'), ex('B', 'cloture')], vide); // aucune année ouverte : la première
    await monter();
    await attendre(() => document.querySelector('select') !== null);
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('A');
    act(() => racine?.unmount());
    // solde non entier ou non fini : réponse refusée, aucune ligne
    servir([ex('A', 'ouvert')], { body: [{ numero: '1', libelle: 'x', classe: 1, soldeCentimes: 1.5 }], decalage: 0, total: 1 });
    await monter();
    await attendre(() => document.querySelector('[role="alert"]') !== null);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(n04.etats.generique);
    expect(lignes()).toHaveLength(0);
  });

  it('retour-a-la-premiere-page', async () => {
    const appels: string[] = [];
    planLong(appels);
    await monter();
    await attendre(() => numeros()[0] === '600000');
    const suivant = () => [...document.querySelectorAll('button')].find((b) => b.textContent === n04.pagination.suivant) as HTMLButtonElement;
    const actions = [
      () => saisir(champ<HTMLSelectElement>(n04.champs.classe), '6'),
      () => saisir(champ<HTMLSelectElement>(n04.champs.annee), 'EX2025'),
      async () => {
        await saisir(champ<HTMLInputElement>(n04.champs.recherche), 'achat');
        await envoyer();
      },
    ];
    for (const action of actions) {
      await act(async () => suivant().click());
      await attendre(() => appels.at(-1)?.includes('decalage=50') === true);
      await action();
      await attendre(() => appels.at(-1)?.includes('decalage=0') === true);
    }
    expect(appels.at(-1)).toContain('/EX2025/plan?');
    expect(appels.at(-1)).toContain('classe=6');
    expect(appels.at(-1)).toContain('q=achat');
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('EX2025');
  });

  it('identifiant-d-annee-encode', async () => {
    const appels: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      const plan = String(url).includes('/plan?');
      if (plan) appels.push(String(url));
      const ex = [{ id: 'A/B', libelle: 'Année A', debut: '2025-01-01', fin: '2025-12-31', statut: 'ouvert' }];
      return Promise.resolve(Response.json(plan ? { body: [], decalage: 0, total: 0 } : { body: ex, decalage: 0, total: 1 }));
    });
    await monter();
    await attendre(() => appels.length > 0);
    expect(appels[0]).toContain('/exercices/A%2FB/plan?');
  });

  it('etats-d-erreur', async () => {
    const cas: Array<[() => Promise<Response>, string]> = [
      [() => Promise.resolve(Response.json({}, { status: 404 })), n04.etats.introuvable],
      [() => Promise.reject(new TypeError('coupé')), n04.etats.reseau],
      [() => Promise.resolve(Response.json({}, { status: 400 })), n04.etats.generique],
    ];
    for (const [reponse, texte] of cas) {
      vi.stubGlobal('fetch', (url: string, init?: RequestInit) => (String(url).includes('/plan?') ? reponse() : vraiFetch(url, init)));
      await monter();
      await attendre(() => document.querySelector('[role="alert"]') !== null);
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(texte);
      act(() => racine?.unmount());
    }
    // la liste des années elle-même en erreur
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({}, { status: 403 })));
    await monter();
    await attendre(() => document.querySelector('[role="alert"]') !== null);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(n04.etats.acces);
    expect(document.querySelector('select')).toBeNull();
  });

  it('etat-erreur-403', async () => {
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      String(url).includes('/plan?') ? Promise.resolve(Response.json({}, { status: 403 })) : vraiFetch(url, init),
    );
    await monter();
    await attendre(() => document.querySelector('[role="alert"]') !== null);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(n04.etats.acces);
    expect(lignes()).toHaveLength(0);
  });
});
