// @vitest-environment jsdom
// Fiche L02-T59 : frise de couverture des relevés et bandeau « il manque le relevé » de l'écran E12.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e12 } from '../../../../../../packages/textes/src/ecrans/e12.js';
import { formaterMontantAffiche } from '../../../../../../packages/ui/src/format/affichage.js';
import { centimes } from '../../../../../../packages/noyau/src/argent/index.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

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
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
type Mois = [string, 'couvert' | 'manquant' | 'partiel'];
type Trou = { debut: string; fin: string; ecartCentimes?: number; etat?: string };
const MOIS_2026 = Array.from({ length: 12 }, (_, k): Mois => [`2026-${String(k + 1).padStart(2, '0')}`, 'couvert']);
const avec = (m: string, etat: Mois[1], base: Mois[] = MOIS_2026): Mois[] => base.map((x) => (x[0] === m ? [m, etat] : x));

/** Couverture et trous répondent par les corps donnés ; le reste passe au faux serveur. */
async function monter(mois: Mois[], trous: Trou[] = []): Promise<void> {
  const vrai = globalThis.fetch;
  const comptes = (await (await vrai('/banque/comptes')).json()) as { body: { id: string }[] };
  const compteId = comptes.body[0]!.id;
  vi.stubGlobal('fetch', (u: string, o?: RequestInit) => {
    if (String(u).includes('/couverture')) return Promise.resolve(Response.json({ body: { compteId, mois: mois.map(([m, etat]) => ({ mois: m, etat })) } }));
    if (String(u).includes('/banque/trous')) {
      const body = trous.map((t, i) => ({ id: 'T' + i, compteId, preuve: 'dates', etat: 'ouvert', ...t }));
      return Promise.resolve(Response.json({ body, decalage: 0, total: body.length }));
    }
    return vrai(u, o);
  });
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const frise = () => [...document.querySelectorAll('.e12-frise li')];
const liste = () => [...document.querySelectorAll('.e12-frise-texte li')];
const bandeau = () => document.querySelector('.e12-bandeau');

describe('E12 couverture des relevés', () => {
  it('septembre-manquant-en-mot', async () => {
    await monter(avec('2026-09', 'manquant'));
    expect(frise()).toHaveLength(12);
    const sept = frise()[8]!;
    expect(sept.textContent).toContain('septembre');
    expect(sept.textContent).toContain(e12.couverture.etats.manquant);
    expect(frise()[7]!.textContent).toContain(e12.couverture.etats.couvert);
    expect(sept.querySelector('svg')).not.toBeNull();
  });
  it('bandeau-trou-ouvert', async () => {
    await monter(avec('2026-09', 'manquant'), [{ debut: '2026-09-01', fin: '2026-09-30' }]);
    expect(bandeau()?.textContent).toContain('Il manque le relevé de septembre.');
  });
  it('pas-de-bandeau-sans-trou', async () => {
    await monter(MOIS_2026);
    expect(bandeau()).toBeNull();
    await monter(avec('2026-09', 'manquant'), [{ debut: '2026-09-01', fin: '2026-09-30', etat: 'comble' }]);
    expect(bandeau()).toBeNull();
  });
  it('ecart-affiche', async () => {
    await monter(avec('2026-09', 'manquant'), [{ debut: '2026-09-01', fin: '2026-09-30', ecartCentimes: 134567 }]);
    expect(bandeau()?.textContent).toContain(formaterMontantAffiche(centimes(134567)));
    await monter(avec('2026-09', 'manquant'), [{ debut: '2026-09-01', fin: '2026-09-30' }]);
    expect(bandeau()?.textContent).toBe('Il manque le relevé de septembre.');
  });
  it('liste-texte-equivalente', async () => {
    await monter(avec('2026-09', 'partiel'));
    expect(liste()).toHaveLength(12);
    expect(liste()[8]?.textContent).toBe('septembre 2026 : ' + e12.couverture.etats.partiel);
    expect(document.querySelector('.e12-frise')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.e12-frise-texte')?.getAttribute('aria-label')).toBe(e12.couverture.liste);
  });
  it('compte-sans-releve-tous-manquants', async () => {
    await monter(MOIS_2026.map(([m]): Mois => [m, 'manquant']));
    expect(frise().every((li) => li.textContent?.includes(e12.couverture.etats.manquant))).toBe(true);
    expect(liste().filter((li) => li.textContent?.endsWith(e12.couverture.etats.manquant))).toHaveLength(12);
  });
  it('deux-trous-un-bandeau-et-exercice-decale', async () => {
    const decale = Array.from({ length: 12 }, (_, k): Mois => [`${k < 9 ? 2026 : 2027}-${String(((k + 3) % 12) + 1).padStart(2, '0')}`, 'couvert']);
    await monter(decale, [{ debut: '2026-05-01', fin: '2026-05-31' }, { debut: '2026-09-01', fin: '2026-09-30', ecartCentimes: 100 }]);
    expect(document.querySelectorAll('.e12-bandeau')).toHaveLength(1);
    expect(bandeau()?.textContent).toContain('relevé de mai');
    expect(bandeau()?.textContent).toContain('relevé de septembre');
    expect(frise()[0]?.textContent).toContain('avril');
  });
});
