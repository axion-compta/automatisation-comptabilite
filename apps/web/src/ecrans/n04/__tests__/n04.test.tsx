// @vitest-environment jsdom
// Fiche L01-T37 : écran N04 Mes comptes comptables (faux serveur en Node).
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { n04 } from '../../../../../../packages/textes/src/ecrans/n04.js';
import { formaterMontantAffiche as fmt } from '../../../../../../packages/ui/src/format/affichage.js';
import { centimes } from '../../../../../../packages/noyau/src/argent/index.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FournisseurDonnees } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let [noeud, racine, vraiFetch]: [{ fermer: () => void } | null, Root | null, typeof fetch | null] = [null, null, null];
beforeAll(() => ([noeud, vraiFetch] = [demarrerNoeud(), globalThis.fetch]));
afterAll(() => noeud?.fermer());
afterEach(() => (act(() => racine?.unmount()), (document.body.innerHTML = ''), vi.unstubAllGlobals()));
const pause = (ms = 30) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
async function attendre(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await pause(20);
  expect(condition()).toBe(true);
}
async function monter() {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees><Ecran /></FournisseurDonnees>));
}
const demonter = () => act(() => racine?.unmount());
const lignes = () => [...document.querySelectorAll('tbody tr')];
const numeros = () => lignes().map((l) => l.querySelector('td')?.textContent ?? '');
const texte = (t: string) => document.body.textContent?.includes(t) === true;
const alerte = () => document.querySelector('[role="alert"]')?.textContent ?? '';
const champ = <T extends HTMLElement>(libelle: string) =>
  ([...document.querySelectorAll('label')].find((x) => x.textContent === libelle) as HTMLLabelElement).control as T;
const bouton = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === t) as HTMLButtonElement;
async function saisir(el: HTMLSelectElement | HTMLInputElement, valeur: string) {
  const select = el instanceof HTMLSelectElement;
  const proto = select ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event(select ? 'change' : 'input', { bubbles: true }));
  });
}
const envoyer = () => act(async () => document.querySelector('form')?.requestSubmit());
const json = (corps: unknown, statut = 200) => Promise.resolve(Response.json(corps, { status: statut }));
/** Remplace le réseau pour les routes du plan ; les autres routes passent par le faux serveur. */
const surPlan = (reponse: (url: string) => Promise<Response>) =>
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => (String(url).includes('/plan?') ? reponse(String(url)) : vraiFetch!(url, init)));
/** Plan simulé de 120 comptes, 50 par page. */
function planLong(appels: string[]) {
  surPlan((url) => {
    appels.push(url);
    const d = Number(new URL(url).searchParams.get('decalage'));
    const body = Array.from({ length: 50 }, (_, i) => ({ numero: String(600000 + d + i), libelle: 'Compte fictif', classe: 6, soldeCentimes: 0 }));
    return json({ body, decalage: d, total: 120 });
  });
}
const an = (id: string, statut: string) => ({ id, libelle: id, debut: '2025-01-01', fin: '2025-12-31', statut });
const vide = { body: [], decalage: 0, total: 0 };
/** Remplace tout le réseau : liste d'années donnée, plan donné. */
const tout = (exercices: unknown[], plan: unknown, appels: string[] = []) =>
  vi.stubGlobal('fetch', (url: string) => {
    const estPlan = String(url).includes('/plan?');
    if (estPlan) appels.push(String(url));
    return json(estPlan ? plan : { body: exercices, decalage: 0, total: exercices.length });
  });
const pret = () => attendre(() => lignes().length === 25);
describe('N04', () => {
  it('affiche-le-plan-de-l-annee-ouverte', async () => {
    await monter();
    await pret();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe(n04.titre);
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('EX2026');
    expect(numeros()).toContain('101000');
    expect([route.id, route.chemin, route.groupe]).toEqual(['n04', '/reglages/entreprise/comptes', 'reglages']);
  });
  it('filtre-classe-6', async () => {
    await monter();
    await pret();
    const classe = champ<HTMLSelectElement>(n04.champs.classe);
    expect([...classe.options].map((o) => o.value)).toEqual(['', '1', '2', '3', '4', '5', '6', '7']);
    await saisir(classe, '6');
    await attendre(() => lignes().length === 7);
    expect(numeros().every((n) => n.startsWith('6'))).toBe(true);
    await saisir(classe, '');
    await pret();
  });
  it('recherche-sans-accent', async () => {
    await monter();
    await pret();
    const recherche = champ<HTMLInputElement>(n04.champs.recherche);
    await saisir(recherche, '  RESERVES  ');
    await pause();
    expect(lignes()).toHaveLength(25); // rien n'est envoyé avant la validation
    await envoyer();
    await attendre(() => lignes().length === 1);
    expect(lignes()[0]?.textContent).toContain('Réserves');
    await saisir(recherche, 'zzzz');
    await envoyer();
    await attendre(() => texte(n04.etats.videTitre));
    expect(lignes()).toHaveLength(0);
  });
  it('pagination-suivante', async () => {
    const appels: string[] = [];
    planLong(appels);
    await monter();
    await attendre(() => numeros()[0] === '600000');
    expect(appels[0]).toContain('limite=50');
    expect(appels[0]).toContain('decalage=0');
    expect(texte('1 à 50 sur 120')).toBe(true);
    expect(bouton(n04.pagination.precedent).disabled).toBe(true);
    await act(async () => bouton(n04.pagination.suivant).click());
    await attendre(() => numeros()[0] === '600050');
    expect(appels.at(-1)).toContain('decalage=50');
    expect(texte('51 à 100 sur 120')).toBe(true);
    await act(async () => bouton(n04.pagination.precedent).click());
    await attendre(() => numeros()[0] === '600000');
  });
  it('retour-a-la-premiere-page', async () => {
    const appels: string[] = [];
    planLong(appels);
    await monter();
    await attendre(() => numeros()[0] === '600000');
    const actions = [
      () => saisir(champ<HTMLSelectElement>(n04.champs.classe), '6'),
      () => saisir(champ<HTMLSelectElement>(n04.champs.annee), 'EX2025'),
      async () => (await saisir(champ<HTMLInputElement>(n04.champs.recherche), 'achat'), await envoyer()),
    ];
    for (const action of actions) {
      await act(async () => bouton(n04.pagination.suivant).click());
      await attendre(() => appels.at(-1)?.includes('decalage=50') === true && numeros()[0] === '600050');
      await action();
      // la page de départ est réellement affichée (le tableau et ses boutons reviennent après le chargement)
      await attendre(() => appels.at(-1)?.includes('decalage=0') === true && numeros()[0] === '600000' && bouton(n04.pagination.suivant) !== undefined);
    }
    for (const t of ['/EX2025/plan?', 'classe=6', 'q=achat']) expect(appels.at(-1)).toContain(t);
    expect(champ<HTMLSelectElement>(n04.champs.annee).value).toBe('EX2025');
  });
  it('solde-formate', async () => {
    await monter();
    await pret();
    const solde = (n: string) => lignes().find((l) => l.querySelector('td')?.textContent === n)?.querySelectorAll('td')[2];
    expect(solde('606000')?.textContent).toBe(fmt(centimes(241984300)));
    expect(solde('606000')?.className).toContain('droite');
    expect(solde('401000')?.textContent).toBe(fmt(centimes(-241984300)));
    const negatif = solde('401000')?.querySelector('[data-signe="negatif"]');
    expect(negatif?.getAttribute('aria-label')).toBe(n04.tableau.soldeNegatif.replace('{montant}', fmt(centimes(-241984300))));
  });
  it('champs-de-formulaire-nommes', async () => {
    await monter();
    await pret();
    for (const libelle of Object.values(n04.champs)) expect(champ<HTMLInputElement>(libelle).labels?.[0]?.textContent, libelle).toBe(libelle);
    expect(document.querySelectorAll('select')).toHaveLength(2);
  });
  it('entrees-limites', async () => {
    const mauvais = { body: [{ numero: '1', libelle: 'x', classe: 1, soldeCentimes: 1.5 }], decalage: 0, total: 1 };
    const appels: string[] = [];
    const cas: Array<[unknown[], unknown, () => boolean]> = [
      [[], vide, () => texte(n04.etats.aucuneAnnee)], // aucune année
      [[an('A', 'cloture'), an('B', 'ouvert')], vide, () => champ<HTMLSelectElement>(n04.champs.annee)?.value === 'B'], // ordre inversé
      [[an('A', 'cloture'), an('B', 'cloture')], vide, () => champ<HTMLSelectElement>(n04.champs.annee)?.value === 'A'], // aucune ouverte
      [[an('A', 'ouvert')], mauvais, () => alerte().includes(n04.etats.generique)], // solde non entier
      [[an('A/B', 'ouvert')], vide, () => appels[0]?.includes('/exercices/A%2FB/plan?') === true], // identifiant encodé
    ];
    for (const [annees, plan, ok] of cas) {
      appels.length = 0;
      tout(annees, plan, appels);
      await monter();
      await attendre(() => { try { return ok(); } catch { return false; } });
      expect(lignes()).toHaveLength(0);
      demonter();
    }
  });
  it('message-aucune-annee-creee', async () => {
    tout([], vide);
    await monter();
    await attendre(() => texte(n04.etats.aucuneAnnee));
    const affiche = document.body.textContent ?? '';
    expect(affiche).toContain('encore créée');
    expect(affiche).not.toContain('ouverte');
  });
  it('etats-d-erreur', async () => {
    const cas: Array<[() => Promise<Response>, string]> = [
      [() => json({}, 403), n04.etats.acces],
      [() => json({}, 404), n04.etats.introuvable],
      [() => Promise.reject(new TypeError('coupé')), n04.etats.reseau],
      [() => json({}, 400), n04.etats.generique],
    ];
    for (const [reponse, attendu, partout] of [...cas.map((c) => [...c, false] as const), [() => json({}, 403), n04.etats.acces, true] as const]) {
      if (partout) vi.stubGlobal('fetch', reponse); // la liste des années elle-même en erreur
      else surPlan(reponse);
      await monter();
      await attendre(() => alerte() !== '');
      expect(alerte()).toContain(attendu);
      expect(lignes()).toHaveLength(0);
      expect(document.querySelector('select') === null).toBe(partout);
      demonter();
    }
  });
});
