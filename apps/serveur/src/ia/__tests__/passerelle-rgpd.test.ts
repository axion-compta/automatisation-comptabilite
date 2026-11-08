import { describe, expect, it, vi } from 'vitest';
import { validerListeRoutes } from '../../../../../packages/noyau/src/securite/routes-ia.js';
import { ajouterJours } from '../../../../../packages/noyau/src/dates/civiles.js';
import { filtrer } from '../../../../../packages/noyau/src/rgpd/marques.js';
import type { SousTraitant } from '../../../../../packages/noyau/src/rgpd/sous-traitants.js';
import { creerPasserelle } from '../passerelle.js';
import { creerPasserelleRgpd, fournisseurAdmis, type ElementContexte, type EvenementRgpd } from '../passerelle-rgpd.js';

const JOURS = 'dix jours'.length;
const reglage = { oppositionJours: JOURS };
const ANNONCE = '2026-01-05';
const PERMISE = ajouterJours(ANNONCE, JOURS);
const AUJOURDHUI = '2026-06-01';
const base: SousTraitant = {
  ref: 'IA-1', type: 'ia', contratArchiveLe: '2026-01-01', annonceLe: ANNONCE,
  traitementDansUe: true, conservationChezFournisseur: false, oppositions: [],
};
const sousTraitants: SousTraitant[] = [
  base,
  { ...base, ref: 'IA-2', conservationChezFournisseur: true },
  { ...base, ref: 'HEB-1', type: 'hebergeur' },
  { ...base, ref: 'IA-3', contratArchiveLe: null },
  { ...base, ref: 'IA-4', annonceLe: '2026-05-25' },
];
const liste = validerListeRoutes({ routes: ['IA-1', 'IA-2', 'HEB-1', 'IA-3', 'IA-4'].map((f) => ({
  fournisseur: f, region: 'ue-test', mode: 'sans-conservation', decision: 'D43', ajouteeLe: '2026-01-01',
})) });
const route = (fournisseur = 'IA-1') => ({ fournisseur, region: 'ue-test', mode: 'sans-conservation' });
const IBAN = 'FR00' + '0'.repeat(20);

function monter(date = AUJOURDHUI) {
  const questions: string[] = [];
  const evenements: EvenementRgpd[] = [];
  const appel = vi.fn(async (_r: unknown, _c: string, q: string) => { questions.push(q); return 'reponse'; });
  const base = creerPasserelle({ liste, appel, journaliser: () => {} });
  const p = creerPasserelleRgpd({
    demander: (d) => base.demander(d), sousTraitants, reglage, aujourdhui: () => date, journaliser: (e) => evenements.push(e),
  });
  return { p, questions, evenements, appel };
}
const dem = (elements: readonly ElementContexte[], extra = {}) =>
  ({ client: 'client-a', route: route(), consigne: 'Classer', elements, personnes: ['Alice Fictive'], ...extra });

describe('passerelle RGPD', () => {
  it('oubliee-jamais-dans-une-requete-t-exp-8', async () => {
    const { p, questions } = monter();
    const els: ElementContexte[] = [
      { id: 'p1', source: 'preference', marques: ['oubliee'], texte: 'préférence-oubliée-xyz' },
      { id: 'c1', texte: 'libellé ordinaire' },
    ];
    for (const c of ['client-a', 'client-b', 'client-c']) await p.demander(dem(els, { client: c }));
    expect(questions).toHaveLength(3);
    for (const q of questions) {
      expect(q).not.toContain('oubliée-xyz');
      expect(q).toContain('libellé ordinaire');
    }
  });

  it('a-effacer-et-limitee-exclues', async () => {
    const { p, questions } = monter();
    const els: ElementContexte[] = [
      { id: 'a', marques: ['a_effacer'], texte: 'texte-effacer' },
      { id: 'b', marques: ['limitee'], texte: 'texte-limite' },
      { id: 'c', marques: ['limitee', 'oubliee'], texte: 'texte-double' },
      { id: 'd', texte: 'texte-libre' },
    ];
    await p.demander(dem(els));
    expect(questions[0]!.split('\n')).toEqual(['Classer', ...filtrer(els, 'ia').map((e) => e.texte)]);
  });

  it('sans-marque-envoyee-pseudonymisee', async () => {
    const { p, questions } = monter();
    await p.demander(dem([{ id: 'x', texte: `Virement Alice Fictive ${IBAN}` }, { id: 'y', texte: 'Fictive Alice reçu' }], { consigne: 'Pour Alice Fictive' }));
    const q = questions[0]!;
    expect(q).not.toContain('Alice');
    expect(q).not.toContain(IBAN);
    expect(q).toMatch(/\[PERSONNE_1\]/);
    expect(q).toMatch(/\[IBAN_1\]/);
  });

  it('fournisseur-qui-conserve-refuse-avant-appel', async () => {
    const { p, appel, evenements } = monter();
    const r = await p.demander(dem([{ id: 'x', texte: 'texte-secret' }], { route: route('IA-2') }));
    expect(r).toEqual({ issue: 'refusee' });
    expect(appel).not.toHaveBeenCalled();
    expect(evenements).toEqual([{ type: 'ia.fournisseur_refuse', client: 'client-a', fournisseur: 'IA-2', raisons: ['conservation_chez_fournisseur'] }]);
  });

  it('fournisseur-inconnu-ou-non-ia-refuse', async () => {
    const { p, appel, evenements } = monter();
    for (const f of ['IA-9', 'HEB-1']) expect(await p.demander(dem([], { route: route(f) }))).toEqual({ issue: 'refusee' });
    expect(appel).not.toHaveBeenCalled();
    expect(evenements.map((e) => 'raisons' in e && e.raisons)).toEqual([['fournisseur_inconnu'], ['pas_un_fournisseur_ia']]);
  });

  it('fournisseur-sans-contrat-ou-delai-en-cours-refuse', async () => {
    expect(fournisseurAdmis(sousTraitants, 'IA-3', reglage, AUJOURDHUI)).toEqual({ admis: false, raisons: ['contrat_absent'] });
    expect(fournisseurAdmis(sousTraitants, 'IA-4', reglage, AUJOURDHUI)).toEqual({ admis: false, raisons: ['delai_en_cours'] });
    const st = [{ ...base, annonceLe: ANNONCE }];
    const veille = ajouterJours(PERMISE, -1);
    expect(fournisseurAdmis(st, 'IA-1', reglage, veille)).toEqual({ admis: false, raisons: ['delai_en_cours'] });
    expect(fournisseurAdmis(st, 'IA-1', reglage, PERMISE)).toEqual({ admis: true });
    const a = monter(veille);
    expect(await a.p.demander(dem([]))).toEqual({ issue: 'refusee' });
    const b = monter(PERMISE);
    expect(await b.p.demander(dem([]))).toEqual({ issue: 'ok', texte: 'reponse' });
    for (const j of [NaN, Infinity, 1.5, -1]) {
      const c = monter();
      const p = creerPasserelleRgpd({ demander: async () => ({ issue: 'ok', texte: '' }), sousTraitants, reglage: { oppositionJours: j }, aujourdhui: () => AUJOURDHUI, journaliser: () => {} });
      await expect(p.demander(dem([]))).rejects.toMatchObject({ code: 'delai_invalide' });
      expect(c.appel).not.toHaveBeenCalled();
    }
    await expect(monter('2026-02-30').p.demander(dem([]))).rejects.toMatchObject({ code: 'date_invalide' });
  });

  it('route-hors-liste-reste-refusee', async () => {
    const { p, appel } = monter();
    const r = await p.demander(dem([{ id: 'x', texte: 't' }], { route: { ...route(), region: 'hors-ue-test' } }));
    expect(r).toEqual({ issue: 'refusee' });
    expect(appel).not.toHaveBeenCalled();
  });

  it('tout-exclu-consigne-seule', async () => {
    const { p, questions } = monter();
    await p.demander(dem([]));
    await p.demander(dem([{ id: 'a', marques: ['a_effacer'], texte: 'tout-exclu' }], { consigne: 'Autre consigne' }));
    expect(questions).toEqual(['Classer', 'Autre consigne']);
  });

  it('contenu-non-texte-refuse', async () => {
    const { p, appel, evenements } = monter();
    for (const texte of [new Uint8Array([1]), null, 42]) {
      const r = await p.demander(dem([{ id: 'ok', texte: 'a' }, { id: 'n', texte } as unknown as ElementContexte]));
      expect(r).toEqual({ issue: 'refusee' });
    }
    expect(appel).not.toHaveBeenCalled();
    expect(evenements).toHaveLength(3);
    expect(evenements.every((e) => e.type === 'ia.contenu_non_texte')).toBe(true);
  });

  it('entree-et-evenements-sans-contenu', async () => {
    const { p, evenements } = monter();
    const els: ElementContexte[] = [{ id: 'efface-id', marques: ['a_effacer'], texte: 'texte-confidentiel' }];
    const copie = JSON.stringify(els);
    await p.demander(dem(els, { route: route('IA-2'), consigne: 'consigne-confidentielle' }));
    await p.demander(dem([{ id: 'n', texte: 7 } as unknown as ElementContexte], { consigne: 'consigne-confidentielle' }));
    expect(JSON.stringify(els)).toBe(copie);
    const j = JSON.stringify(evenements);
    expect(evenements).toHaveLength(2);
    for (const m of ['confidentiel', 'efface-id', 'Alice']) expect(j).not.toContain(m);
  });
});
