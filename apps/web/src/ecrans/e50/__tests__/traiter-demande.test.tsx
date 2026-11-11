// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { ISSUES_PAR_DROIT } from '../../../../../../packages/noyau/src/rgpd/types.js';
import { fr } from '../../../../../../packages/textes/src/fr.js';
import { e50Personnes as t } from '../../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { DemandesPersonnes } from '../DemandesPersonnes.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void } | null = null;
let racine: Root | null = null;
afterEach(() => (act(() => racine?.unmount()), serveur?.fermer(), (document.body.innerHTML = ''), vi.unstubAllGlobals()));

const demande = (type: string) => ({ id: 'dem_1', type, recue_le: '2026-10-01', echeance: '2026-11-01', etat: 'recue', en_retard: false, a_rappeler: false, issue: null, conserve_jusqu_au: null, source_motif: null });
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 150))));
type Appel = { url: string; methode: string; cle: string | null; corps: Record<string, unknown> | null };
async function rendre(): Promise<HTMLElement> {
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => racine?.render(<FournisseurDonnees client={creerClient()}><DemandesPersonnes /></FournisseurDonnees>));
  await attendre();
  return hote;
}
type Rep = { statut: number; corps: unknown } | 'reseau';
async function monter(type: string, reponse: Rep = { statut: 200, corps: { body: { ...demande(type), etat: 'traitee' } } }, etats = ['recue'], attente: Promise<void> = Promise.resolve()) {
  const appels: Appel[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const methode = init?.method ?? 'GET';
    appels.push({ url: String(url), methode, cle: new Headers(init?.headers).get('idempotency-key'), corps: init?.body ? JSON.parse(String(init.body)) : null });
    const lecture = methode === 'GET';
    const poste = envois(appels).length > 0;
    if (!lecture) await attente;
    if (!lecture && reponse === 'reseau') throw new TypeError('coupé');
    const liste = etats.map((etat, i) => ({ ...demande(type), id: `dem_${i + 1}`, etat: i === 0 && poste ? 'traitee' : etat }));
    return new Response(JSON.stringify(lecture ? { body: liste } : (reponse as { corps: unknown }).corps), { status: lecture ? 200 : (reponse as { statut: number }).statut, headers: { 'content-type': 'application/json' } });
  });
  return { hote: await rendre(), appels };
}
const bouton = (texte: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texte) as HTMLButtonElement;
const clic = async (el: Element | undefined) => (await act(async () => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))), attendre());
const ouvrir = () => clic(bouton('Traiter'));
const champ = (nom: string) => document.querySelector(`[name="${nom}"]`) as HTMLInputElement & HTMLSelectElement;
const saisir = (nom: string, valeur: string, proto: object = HTMLInputElement.prototype) =>
  act(async () => {
    const el = champ(nom);
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event(proto === HTMLSelectElement.prototype ? 'change' : 'input', { bubbles: true }));
  });
const choisir = (issue: string) => saisir('issue', issue, HTMLSelectElement.prototype);
const valider = () => clic(bouton(t.traiter.valider));
const envois = (a: Appel[]) => a.filter((x) => x.methode === 'POST');

describe('écran E50, traiter une demande', () => {
  it('issues-filtrees-par-type', async () => {
    for (const type of ['acces', 'effacement', 'opposition'] as const) {
      await monter(type);
      await ouvrir();
      expect([...champ('issue').options].map((o) => o.value)).toEqual([...ISSUES_PAR_DROIT[type]]);
      act(() => racine?.unmount());
    }
  });
  it('refus-sans-motif-bloque-avant-envoi', async () => {
    const { appels } = await monter('effacement');
    await ouvrir();
    await choisir('refus_conservation');
    await saisir('source', 'Source fictive A');
    await valider();
    expect(document.body.textContent).toContain(t.erreurs.motifManquant);
    expect(envois(appels)).toHaveLength(0);
  });
  it('refus-sans-source-bloque-avant-envoi', async () => {
    const { appels } = await monter('effacement');
    await ouvrir();
    await choisir('refus_gel');
    await saisir('motif', 'Motif fictif');
    await valider();
    expect(document.body.textContent).toContain(t.erreurs.sourceManquante);
    expect(envois(appels)).toHaveLength(0);
  });
  it('autres-personnes-decochee-par-defaut', async () => {
    const { appels } = await monter('acces');
    await ouvrir();
    expect(champ('autresPersonnes').checked).toBe(false);
    expect(document.body.textContent).toContain(t.traiter.autresPersonnesAide);
    await valider();
    const [envoi] = envois(appels);
    expect(envoi?.url).toContain('/personnes/demandes/dem_1/traitement');
    expect(envoi?.corps).toEqual({ issue: 'acces_produit', inclure_autres_personnes: false });
    expect(envoi?.cle?.length).toBeGreaterThanOrEqual(8);
  });
  it('deja-traitee-message', async () => {
    await monter('acces', { statut: 409, corps: { code: 'DEJA_TRAITEE' } });
    await ouvrir();
    await valider();
    expect(document.body.textContent).toContain(t.erreurs.dejaTraitee);
  });
  it('a-effacer-sans-promesse-immediate', async () => {
    await monter('effacement');
    await ouvrir();
    await choisir('a_effacer');
    expect(document.body.textContent).toContain(t.aEffacerExplication);
    expect(document.body.textContent).not.toMatch(/effacées? immédiatement|effacement immédiat/i);
  });
  it('enregistrer-puis-voir-dans-la-liste', async () => {
    serveur = demarrerNoeud({ base: location.origin });
    const hote = await rendre();
    const avant = hote.querySelectorAll('tbody tr').length;
    await saisir('type', 'limitation', HTMLSelectElement.prototype);
    await saisir('recue_le', '2026-11-02');
    await clic(bouton('Enregistrer'));
    expect(hote.querySelectorAll('tbody tr')).toHaveLength(avant + 1);
  });
  it('erreurs-reseau-serveur-et-422-traduites', async () => {
    for (const [rep, attendu] of [['reseau', fr.erreurs.reseau], [{ statut: 500, corps: {} }, fr.erreurs.generique], [{ statut: 422, corps: { code: 'MOTIF_MANQUANT' } }, t.erreurs.motifManquant]] as const) {
      await monter('acces', rep);
      await ouvrir();
      await valider();
      expect(document.querySelector('[role="alert"]')?.textContent).toBe(attendu);
      expect(document.body.textContent).not.toContain(t.erreurs.reglageAbsent);
      act(() => racine?.unmount());
    }
  });
  it('enregistrer-en-echec-message-reseau', async () => {
    await monter('acces', 'reseau');
    await saisir('recue_le', '2026-11-02');
    await clic(bouton('Enregistrer'));
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(fr.erreurs.reseau);
  });
  it('double-clic-un-seul-envoi-meme-cle', async () => {
    let lacher = () => {};
    const { appels } = await monter('acces', { statut: 500, corps: {} }, ['recue'], new Promise<void>((r) => (lacher = r)));
    await ouvrir();
    await valider();
    await valider();
    expect(envois(appels)).toHaveLength(1);
    lacher();
    await attendre();
    await valider();
    const [a, b] = envois(appels);
    expect(envois(appels)).toHaveLength(2);
    expect(b?.cle).toBe(a?.cle);
  });
  it('liste-relue-apres-succes', async () => {
    const { appels } = await monter('acces');
    await ouvrir();
    await valider();
    expect(appels.filter((x) => x.methode === 'GET')).toHaveLength(2);
    expect(document.querySelector('tbody')?.textContent).toContain(t.etats.traitee);
  });
  it('bouton-traiter-seulement-sur-demandes-non-finales', async () => {
    await monter('acces', undefined, ['recue', 'traitee', 'refusee']);
    expect([...document.querySelectorAll('button')].filter((b) => b.textContent === 'Traiter')).toHaveLength(1);
  });
  it('clavier-seul', async () => {
    const { appels } = await monter('acces');
    const origine = bouton('Traiter');
    origine.focus();
    await clic(origine);
    expect(document.activeElement).toBe(champ('issue'));
    await act(async () => champ('issue').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await attendre();
    expect(document.querySelector('[name="issue"]')).toBeNull();
    expect(document.activeElement).toBe(bouton('Traiter'));
    await ouvrir();
    await valider();
    expect(envois(appels)).toHaveLength(1);
  });
});
