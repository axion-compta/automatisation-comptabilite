// @vitest-environment jsdom
// Fiche L09-T43 : écran E39 « Voici ce que j'ai compris » (faux serveur).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e39 } from '../../../../../../packages/textes/src/ecrans/e39.js';
import { profilCodes } from '../../../../../../packages/textes/src/ecrans/profil-codes.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let noeud: { fermer: () => void };
beforeEach(() => void (noeud = demarrerNoeud({ base: location.origin })));
let racine: Root | null = null;
afterEach(() => {
  noeud.fermer();
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const pause = (ms = 200) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
async function monter(): Promise<HTMLElement> {
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await pause();
  return hote;
}
const groupes = (h: HTMLElement) => [...h.querySelectorAll('[role=group]')];
const valider = (h: HTMLElement) => [...h.querySelectorAll('button')].find((b) => b.textContent === e39.boutons.valider)!;
const cliquer = async (b: Element) => {
  await act(async () => b.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await pause(400);
};

type Corps = { body: { champs: { cle: string; valeur: unknown; statut: string }[]; blocages: string[] } };
type Appel = { url: string; cle: string | null };
/** Enveloppe le fetch : journalise les écritures, peut transformer le profil lu ou refuser une écriture. */
function espion(o: { profil?: (b: Corps) => unknown; refuser?: (url: string, n: number) => boolean } = {}): Appel[] {
  const appels: Appel[] = [];
  const reel = globalThis.fetch;
  vi.stubGlobal('fetch', async (entree: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entree);
    const ecriture = init?.method === 'POST';
    if (ecriture) {
      const cle = new Headers(init?.headers).get('idempotency-key');
      appels.push({ url, cle });
      if (o.refuser?.(url, appels.length)) return Response.json({ code: 'RIEN_A_CONFIRMER' }, { status: 409 });
    }
    const r = await reel(entree, init);
    if (!ecriture && o.profil && url.endsWith('/profil')) return Response.json(o.profil((await r.json()) as Corps));
    return r;
  });
  return appels;
}
const confirmations = (a: Appel[]) => a.filter((x) => x.url.endsWith('/confirmer'));

describe('écran E39', () => {
  it('recapitulatif-affiche', async () => {
    const h = await monter();
    expect(h.querySelector('h1')?.textContent).toBe(e39.titre);
    expect(h.textContent).toContain(e39.mention);
    expect(h.textContent).toContain('Lemoine Rénovation');
    expect([...h.querySelectorAll('a')].some((a) => a.textContent === e39.boutons.voirSource)).toBe(true);
  });

  it('a-confirmer-en-tete', async () => {
    const h = await monter();
    const statuts = groupes(h).map((g) => g.className.includes('a_confirmer'));
    expect(statuts[0]).toBe(true);
    const premierConfirme = statuts.indexOf(false);
    if (premierConfirme >= 0) expect(statuts.slice(premierConfirme)).not.toContain(true);
  });

  it('une-validation-confirme-tout', async () => {
    const appels = espion();
    const h = await monter();
    const nb = groupes(h).filter((g) => g.className.includes('a_confirmer')).length;
    expect(nb).toBeGreaterThan(0);
    await cliquer(valider(h));
    expect(confirmations(appels)).toHaveLength(nb);
    expect(groupes(h).some((g) => g.className.includes('a_confirmer'))).toBe(false);
    expect(h.textContent).toContain(e39.valide);
  });

  it('idempotence-par-champ', async () => {
    const appels = espion({ refuser: (url, n) => n === 1 && url.endsWith('/confirmer') });
    const h = await monter();
    await cliquer(valider(h));
    await cliquer(valider(h));
    const cles = appels.map((a) => a.cle);
    expect(cles[0]).toBe(cles[1]);
    const conf = confirmations(appels);
    expect(new Set(conf.map((a) => a.url)).size).toBe(new Set(conf.map((a) => a.cle)).size);
    expect(cles.every((c) => typeof c === 'string' && c.length >= 8)).toBe(true);
  });

  it('contradiction-choix-obligatoire', async () => {
    const appels = espion({
      profil: (r) => {
        const tva = r.body.champs.find((c) => c.cle === 'regime_tva');
        r.body.champs.push({ cle: 'regime_tva', ...tva, valeur: 'autre valeur', statut: 'a_confirmer' });
        return r;
      },
    });
    const h = await monter();
    expect(valider(h).disabled).toBe(true);
    expect(h.textContent).toContain(e39.contradiction.consigne);
    await cliquer(valider(h));
    expect(appels).toHaveLength(0);
    const radios = h.querySelectorAll<HTMLInputElement>('input[type=radio]');
    expect(radios).toHaveLength(2);
    await act(async () => radios[1]!.click());
    expect(valider(h).disabled).toBe(false);
  });

  it('blocage-sans-validation', async () => {
    espion({ profil: (r) => ({ body: { ...r.body, blocages: ['societe_cotee'] } }) });
    const h = await monter();
    expect(h.textContent).toContain(profilCodes.phraseDeCode('blocages', 'societe_cotee'));
    expect(valider(h)).toBeUndefined();
    expect(h.querySelector('button')).toBeNull();
  });

  it('refus-arrete-et-informe', async () => {
    const appels = espion({ refuser: (url, n) => n === 1 && url.endsWith('/confirmer') });
    const h = await monter();
    await cliquer(valider(h));
    expect(appels).toHaveLength(1);
    expect(h.querySelector('[role=alert]')?.textContent).toContain(e39.refus);
    expect(h.textContent).not.toContain(e39.valide);
  });
});
