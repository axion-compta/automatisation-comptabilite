// @vitest-environment jsdom
// Fiche L15-T50 : écran E01 « Mon mois ».
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { creerServiceTableauDeBord } from '../../../../../../packages/contrat/src/domaines/tableau-de-bord-service.js';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e01 } from '../../../../../../packages/textes/src/ecrans/e01.js';
import { formaterMontantAffiche } from '../../../../../../packages/ui/src/format/affichage.js';
import { centimes } from '../../../../../../packages/noyau/src/argent/index.js';
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

type Tableau = NonNullable<ReturnType<ReturnType<typeof creerServiceTableauDeBord>['lire']>>;
type Bloc = Tableau['blocs'][number];
const EXERCICE = 'EX2026';
const service = creerServiceTableauDeBord();
const lire = (profil: 'pleine' | 'vide' = 'pleine'): Tableau => structuredClone(service.lire(EXERCICE, { vue: 'mois', profil })!);

/** Intercepte la lecture du tableau de bord : corps modifiable, en-tête de panne facultatif. */
async function monter(opts: { corps?: (t: Tableau) => void; panne?: string; profil?: 'pleine' | 'vide' } = {}): Promise<void> {
  const vrai = globalThis.fetch;
  vi.stubGlobal('fetch', (u: string, o: RequestInit = {}) => {
    if (!String(u).includes('/tableau-de-bord')) return vrai(u, o);
    if (opts.panne === undefined && opts.corps === undefined && opts.profil === undefined) return vrai(u, o);
    const t = lire(opts.profil);
    if (opts.panne !== undefined) {
      const heads = new Headers(o.headers);
      heads.set('x-panne-bloc', opts.panne);
      return vrai(u, { ...o, headers: heads });
    }
    opts.corps?.(t);
    return Promise.resolve(Response.json({ body: t }));
  });
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 200))));
}
const carte = (titre: string) => [...document.querySelectorAll('section.axion-carte')].find((s) => s.querySelector('h2')?.textContent === titre)!;
const bloc = (t: Tableau, code: string): Bloc => t.blocs.find((b) => b.code === code)!;

describe('E01', () => {
  it('quatre-blocs', async () => {
    await monter();
    expect(route).toMatchObject({ id: 'e01', chemin: '/mois', groupe: 'menu', titre: e01.titre });
    expect(Object.values(e01.blocs).map((t) => carte(t))).toHaveLength(4);
    expect(document.querySelectorAll('section.axion-carte h2')).toHaveLength(4);
  });
  it('anneau-present', async () => {
    await monter();
    expect(document.querySelectorAll('.axion-anneau')).toHaveLength(1);
    expect(document.querySelectorAll('.axion-anneau__arc')).toHaveLength(3);
  });
  it('trois-alertes-et-voir-tout', async () => {
    await monter();
    expect(document.querySelectorAll('.axion-carte-alerte')).toHaveLength(3);
    expect([...document.querySelectorAll('.axion-carte-alerte button')].some((b) => b.textContent === e01.alertes.reporter)).toBe(false);
    const lien = [...document.querySelectorAll('button, a')].find((e) => /^Voir tout \(\d+\)$/.test(e.textContent ?? ''))!;
    expect(Number(/\((\d+)\)/.exec(lien.textContent ?? '')?.[1])).toBeGreaterThan(3);
    const recu = vi.fn();
    window.addEventListener('ouvrir-cloche', recu);
    act(() => (lien as HTMLElement).click());
    window.removeEventListener('ouvrir-cloche', recu);
    expect(recu).toHaveBeenCalledTimes(1);
  });
  it('tva-en-doute-aucun-montant', async () => {
    await monter({ corps: (t) => void Object.assign(bloc(t, 'tva_impots'), { etat: 'impossible', mot: 'pieces_a_regarder', donnees: { piecesEnDoute: 4 } }) });
    const tva = carte(e01.blocs.tva_impots);
    expect(tva.textContent).toContain('Il reste 4 pièces à regarder');
    expect(tva.textContent).not.toMatch(/€|\d[\d\s ]*,\d{2}/);
  });
  it('bloc-en-panne-les-autres-affiches', async () => {
    await monter({ panne: 'tresorerie' });
    const tres = carte(e01.blocs.tresorerie);
    expect(tres.textContent).toContain(e01.mots.calcul_impossible);
    expect(tres.textContent).not.toContain('€');
    for (const t of [e01.blocs.resultat, e01.blocs.a_faire]) expect(carte(t).textContent).toContain('€');
    expect(document.querySelectorAll('.axion-anneau')).toHaveLength(1);
  });
  it('profil-vide-mots-d-aide', async () => {
    await monter({ profil: 'vide', corps: () => undefined });
    expect(carte(e01.blocs.tresorerie).textContent).toContain(e01.mots.vide_tresorerie);
    expect(carte(e01.blocs.resultat).textContent).toContain(e01.mots.vide_resultat);
    expect(carte(e01.blocs.a_faire).textContent).toContain(e01.mots.vide_a_faire);
    expect(document.body.textContent).not.toContain('€');
  });
  it('libelle-resultat-provisoire', async () => {
    await monter();
    expect(carte(e01.blocs.resultat).textContent?.toLowerCase()).toContain('résultat provisoire avant impôt');
    expect(document.body.textContent).not.toMatch(/bénéfice|benefice/i);
  });
  it('titre-h1-unique', async () => {
    await monter();
    const h1 = document.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(e01.titre);
  });
  it('aucun-calcul-au-front', async () => {
    await monter({
      corps: (t) => {
        Object.assign(bloc(t, 'tresorerie'), { donnees: { tresorerie: { centimes: 123456, devise: 'EUR' } } });
        Object.assign(bloc(t, 'resultat'), { donnees: { resultatProvisoire: { centimes: -98765, devise: 'EUR' } } });
      },
    });
    expect(carte(e01.blocs.tresorerie).textContent).toContain(formaterMontantAffiche(centimes(123456)));
    expect(carte(e01.blocs.resultat).textContent).toContain(formaterMontantAffiche(centimes(-98765)));
  });
});
