// @vitest-environment jsdom
// Fiche L02-T68 : import d'un relevé dans E03. Faux service en mémoire, relevé fictif.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { Centimes } from '../../../../../../packages/noyau/src/argent/index.js';
import { e03Releve } from '../../../../../../packages/textes/src/ecrans/e03-releve.js';
import { controleSolde, dejaImporte, questionImport } from '../../../../../../packages/textes/src/banque/mots.js';
import { LIGNES_APERCU, ImportReleve, type RapportReleve, type ServiceImportReleve } from '../ImportReleve.js';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
});
const c = (n: number) => n as Centimes;
const lignes = (n: number) => Array.from({ length: n }, (_, i) => ({ date: '2026-03-0' + ((i % 9) + 1), montant: c(1000 + i), libelle: 'Ligne fictive ' + i }));
const base: RapportReleve = { id: 'imp-1', etat: 'a_confirmer', apercu: lignes(3), questions: [], compteurs: { lues: 3, importees: 3, rejetees: 0 }, controle: 'OK' };
function faux(rapport: RapportReleve, apres?: RapportReleve) {
  const appels = { deposer: 0, repondre: [] as string[], confirmer: 0, annuler: 0 };
  let liberer: () => void = () => undefined;
  const service: ServiceImportReleve = {
    deposer: async () => (appels.deposer++, rapport),
    repondre: async (_i, _c, choix) => (appels.repondre.push(choix), apres ?? rapport),
    confirmer: async () => (appels.confirmer++, apres ?? rapport),
    annuler: () => (appels.annuler++, new Promise<void>((r) => (liberer = r))),
  };
  return { service, appels, liberer: () => liberer() };
}
async function monter(service: ServiceImportReleve) {
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<ImportReleve service={service} fichier={new File(['x'], 'releve.csv')} />));
}
const texte = () => document.body.textContent ?? '';
const bouton = (nom: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === nom);
const clic = (b: HTMLElement | undefined) => act(async () => void b?.click());
describe('ImportReleve', () => {
  it('apercu-dix-lignes-au-plus', async () => {
    expect(LIGNES_APERCU).toBe(10);
    for (const [n, attendu] of [[14, 10], [3, 3]] as const) {
      await monter(faux({ ...base, apercu: lignes(n) }).service);
      expect(document.querySelectorAll('tbody tr')).toHaveLength(attendu);
      act(() => racine?.unmount());
      document.body.innerHTML = '';
    }
    await monter(faux({ ...base, apercu: [] }).service);
    expect(document.querySelector('table')).toBeNull();
    expect(document.querySelector('tbody tr')).toBeNull();
  });
  it('question-format-date-deux-reponses', async () => {
    const f = faux({ ...base, questions: [{ code: 'format_date', choix: ['a', 'b'] }] });
    await monter(f.service);
    const q = questionImport('format_date');
    expect(texte()).toContain(q.question);
    expect(bouton(q.reponses[0]!)).toBeDefined();
    expect(bouton(q.reponses[1]!)).toBeDefined();
    await clic(bouton(q.reponses[1]!));
    expect(f.appels.repondre).toEqual(['b']);
  });
  it('quel-compte-un-bouton-par-compte', async () => {
    await monter(faux({ ...base, questions: [{ code: 'quel_compte', choix: ['Compte courant', 'Compte épargne', 'Caisse'] }] }).service);
    expect(texte()).toContain(questionImport('quel_compte').question);
    for (const nom of ['Compte courant', 'Compte épargne', 'Caisse']) expect(bouton(nom)).toBeDefined();
    expect(document.querySelectorAll('button[data-choix]')).toHaveLength(3);
  });
  it('confirmer-bloque-tant-qu-une-question-reste', async () => {
    const avec = faux({ ...base, questions: [{ code: 'quel_compte', choix: [] }] });
    await monter(avec.service);
    expect(bouton(e03Releve.boutons.confirmer)?.disabled).toBe(true);
    await clic(bouton(e03Releve.boutons.confirmer));
    expect(avec.appels.confirmer).toBe(0);
    act(() => racine?.unmount());
    const sans = faux(base);
    await monter(sans.service);
    expect(bouton(e03Releve.boutons.confirmer)?.disabled).toBe(false);
    await clic(bouton(e03Releve.boutons.confirmer));
    expect(sans.appels.confirmer).toBe(1);
  });
  it('rapport-lues-importees-rejetees', async () => {
    await monter(faux({ ...base, compteurs: { lues: 5, importees: 3, rejetees: 2 } }).service);
    const zone = document.querySelector('[role=status]:not([aria-busy])');
    expect(zone?.textContent).toBe(e03Releve.rapport.comptes.replace('{lues}', '5').replace('{importees}', '3').replace('{rejetees}', '2'));
    act(() => racine?.unmount());
    await monter(faux(base).service);
    expect(document.querySelector('[role=status]')?.textContent).toContain('rejetées : 0');
  });
  it('solde-impossible-ou-ecart-annonce', async () => {
    await monter(faux({ ...base, controle: 'IMPOSSIBLE' }).service);
    expect(texte()).toContain(controleSolde('impossible'));
    act(() => racine?.unmount());
    await monter(faux({ ...base, controle: 'ECART', ecart: c(1250) }).service);
    expect(texte()).toContain('12,50');
    expect(texte()).not.toContain(controleSolde('verifie'));
    act(() => racine?.unmount());
    await monter(faux({ ...base, controle: 'ECART' }).service);
    expect(texte()).toContain(controleSolde('ecart'));
  });
  it('deja-importe-zero-ligne', async () => {
    await monter(faux({ ...base, etat: 'deja_importe', apercu: [], compteurs: { lues: 0, importees: 0, rejetees: 0 }, dejaImporteLe: '2026-03-31T10:00:00Z' }).service);
    expect(texte()).toContain(dejaImporte('31/03/2026'));
    expect(document.querySelector('table')).toBeNull();
    expect(bouton(e03Releve.boutons.confirmer)).toBeUndefined();
    for (const dejaImporteLe of [undefined, 'pas-une-date']) {
      act(() => racine?.unmount());
      document.body.innerHTML = '';
      await monter(faux({ ...base, etat: 'deja_importe', apercu: [], ...(dejaImporteLe === undefined ? {} : { dejaImporteLe }) }).service);
      expect(texte()).toContain(e03Releve.dejaImporteSansDate);
      expect(bouton(e03Releve.boutons.confirmer)).toBeUndefined();
    }
  });
  it('apercu-date-mal-formee-reste-affiche', async () => {
    await monter(faux({ ...base, apercu: [{ date: '31/03/2026', montant: 100 as never, libelle: 'Libellé fictif' }] }).service);
    expect(texte()).toContain('31/03/2026');
  });
  it('annuler-cet-import-un-seul-appel', async () => {
    const f = faux(base);
    await monter(f.service);
    expect(bouton(e03Releve.boutons.annuler)).toBeUndefined();
    await clic(bouton(e03Releve.boutons.confirmer));
    const b = bouton(e03Releve.boutons.annuler);
    await act(async () => {
      b?.click();
      b?.click();
    });
    expect(f.appels.annuler).toBe(1);
    await act(async () => f.liberer());
    expect(texte()).toContain(e03Releve.annule);
    expect(bouton(e03Releve.boutons.annuler)).toBeUndefined();
  });
  it('refus-et-vide-en-mots', async () => {
    for (const motif of ['solde_pdf_faux', 'format_inconnu', 'xml_refuse'] as const) {
      await monter(faux({ ...base, etat: 'refuse', motifRefus: motif, apercu: [] }).service);
      expect(texte()).toContain(e03Releve.refus[motif]);
      expect(bouton(e03Releve.boutons.confirmer)).toBeUndefined();
      act(() => racine?.unmount());
    }
    await monter(faux({ ...base, etat: 'vide', apercu: [] }).service);
    expect(texte()).toContain(e03Releve.vide);
    expect(bouton(e03Releve.boutons.confirmer)).toBeUndefined();
  });
  it('panne-du-service-message', async () => {
    const service: ServiceImportReleve = { ...faux(base).service, deposer: () => Promise.reject(new Error('panne')) };
    await monter(service);
    expect(document.querySelector('[role=alert]')?.textContent).toContain(e03Releve.etats.panne);
    expect(texte()).not.toContain('Lignes lues');
    expect(document.querySelector('table')).toBeNull();
  });
});
