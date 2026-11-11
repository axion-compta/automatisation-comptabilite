// @vitest-environment jsdom
// Fiche L10-T46 : écran E24 onglet Ventes (lecture, faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { e24Ventes as t } from '../../../../../../packages/textes/src/ecrans/e24-ventes.js';
import { centimes } from '../../../../../../packages/noyau/src/argent/index.js';
import { formaterMontantAffiche } from '../../../../../../packages/ui/src/format/affichage.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const vente = (id: string, etat: string, extra: Record<string, unknown> = {}) => ({
  id, numero: 'FA-' + id, type: 'facture', client: { code: 'CLI-' + id, nom: 'Client ' + id }, dateFacture: '2026-03-12',
  ttcCentimes: 12000, resteDuCentimes: 12000, etat, avoirsLies: [], ...extra,
});
const liste = (body: unknown[]) => ({ body, decalage: 0, total: body.length });

/** Faux serveur : renvoie les ventes qui passent les filtres de la requête reçue. */
function simuler(toutes: ReturnType<typeof vente>[], statut = 200) {
  const requetes: URL[] = [];
  vi.stubGlobal('fetch', (u: string) => {
    const url = new URL(String(u), 'http://x');
    requetes.push(url);
    if (statut !== 200) return Promise.resolve(Response.json({ code: 'X' }, { status: statut }));
    const e = url.searchParams.get('etat');
    const c = url.searchParams.get('client');
    const corps = toutes.filter((v) => (!e || v.etat === e) && (!c || v.client.nom.includes(c)));
    return Promise.resolve(Response.json(liste(corps)));
  });
  return requetes;
}
async function attendre() {
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))));
}
async function monter() {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
async function saisir(el: HTMLInputElement | HTMLSelectElement, valeur: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
  await attendre();
}
const texte = () => document.body.textContent ?? '';
const lignes = () => [...document.querySelectorAll('tbody tr')];

describe('E24 ventes', () => {
  it('affiche-les-ventes-et-leur-etat', async () => {
    simuler([vente('1', 'a_encaisser'), vente('2', 'payee'), vente('3', 'a_relire')]);
    await monter();
    expect(route.id).toBe('e24-ventes');
    expect(route.chemin).toBe('/factures/ventes');
    expect(route.groupe).toBe('autre');
    expect(document.querySelector('h1')?.textContent).toBe(t.titre);
    expect(lignes()).toHaveLength(3);
    expect(texte()).toContain('FA-1');
    expect(texte()).toContain('Client 2');
    expect(texte()).toMatch(/120,00/);
    for (const e of ['a_encaisser', 'payee', 'a_relire'] as const) expect(texte()).toContain(t.etats[e]);
    const lien = lignes()[0]?.querySelector('a');
    expect(lien?.getAttribute('href')).toBe('/factures/vente?id=1');
    expect(lien?.textContent).toBe(t.actions.a_encaisser);
  });
  it('filtre-par-etat', async () => {
    const req = simuler([vente('1', 'a_encaisser'), vente('2', 'payee')]);
    await monter();
    const choix = document.querySelector('select') as HTMLSelectElement;
    expect([...choix.options].map((o) => o.value).filter(Boolean)).toEqual(Object.keys(t.etats));
    await saisir(choix, 'payee');
    expect(req.at(-1)?.searchParams.get('etat')).toBe('payee');
    expect(lignes()).toHaveLength(1);
    expect(texte()).toContain('FA-2');
    expect(texte()).not.toContain('FA-1');
  });
  it('filtre-par-client', async () => {
    const req = simuler([vente('1', 'payee'), vente('2', 'payee')]);
    await monter();
    const champ = document.querySelector('input[type="search"]') as HTMLInputElement;
    expect(champ.closest('label')?.textContent).toBe(t.filtres.client);
    await saisir(champ, 'Client 2');
    expect(req.at(-1)?.searchParams.get('client')).toBe('Client 2');
    expect(lignes()).toHaveLength(1);
    const mois = document.querySelector('input[type="month"]') as HTMLInputElement;
    await saisir(mois, '2026-03');
    expect(req.at(-1)?.searchParams.get('mois')).toBe('2026-03');
  });
  it('avoir-sous-sa-facture', async () => {
    simuler([vente('1', 'payee', { avoirsLies: [{ id: 'AV-1', ttcCentimes: 10550 }] }), vente('AV-2', 'a_relire', { type: 'avoir' })]);
    await monter();
    const cellule = lignes()[0]?.querySelector('td');
    expect(cellule?.textContent).toContain(t.avoirLie.replace('{montant}', formaterMontantAffiche(centimes(10550))));
    expect(lignes()[1]?.textContent).toContain(t.etats.a_relire);
  });
  it('en-retard-affiche-les-jours', async () => {
    simuler([vente('1', 'en_retard', { joursDeRetard: 12 }), vente('2', 'payee')]);
    await monter();
    expect(lignes()[0]?.textContent).toContain(t.enRetard.replace('{jours}', '12'));
    expect(lignes()[1]?.textContent).not.toContain(t.enRetard.replace('{jours}', '12'));
    expect(texte().match(/en retard de/g)).toHaveLength(1);
  });
  it('ecran-vide-message-de-depot', async () => {
    simuler([]);
    await monter();
    expect(texte()).toContain(t.videTitre);
    expect(texte()).toContain(t.vide);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });
  it('erreur-sans-chiffre-partiel', async () => {
    simuler([vente('1', 'payee')], 500);
    await monter();
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    expect(document.querySelector('table')).toBeNull();
    expect(texte()).not.toMatch(/\d/);
    expect(texte()).not.toContain('€');
  });
  it('lisible-a-360-px', async () => {
    window.innerWidth = 360;
    simuler([vente('1', 'a_encaisser')]);
    await monter();
    const enTetes = [...document.querySelectorAll('thead th')].map((h) => h.textContent);
    expect(enTetes).toEqual([t.colonnes.numero, t.colonnes.client, t.colonnes.date, t.colonnes.ttc, t.colonnes.resteDu, t.colonnes.etat, t.colonnes.action]);
    const cellules = [...(lignes()[0]?.querySelectorAll('td') ?? [])];
    expect(cellules.map((c) => c.getAttribute('data-entete'))).toEqual(enTetes);
    expect(document.querySelector('[style*="width"]')).toBeNull();
    expect(document.querySelector('table')?.hasAttribute('width')).toBe(false);
  });
});
