import { describe, expect, it } from 'vitest';
import type { Alerte, Constat, LigneJournal } from '../../../../../packages/noyau/src/alertes/moteur.js';
import { creerEnveloppe, type Enveloppe } from '../../../../../packages/noyau/src/evenements/enveloppe.js';
import { creerFauxPlanificateur } from '../../../../../packages/noyau/src/exploitation/planificateur.js';
import type { Periode } from '../../../../../packages/noyau/src/interface/types.js';
import type { Instantane } from '../../../../../packages/noyau/src/tableau-de-bord/instantanes.js';
import { creerEvaluateur, inscrireTravailHoraire, type CompteursMenu } from '../alertes-horaire.js';
import { creerConsommateur } from '../evenements-interface.js';

const S = 'societe-test';
const attendre = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

function monde(constatsInitiaux: Constat[] = []) {
  const alertes = new Map<string, Alerte[]>();
  const journal: LigneJournal[] = [];
  const menus: CompteursMenu[] = [];
  const etat = { constats: constatsInitiaux, regles: ['AL-01'], evaluations: 0 };
  let n = 0;
  const evaluateur = creerEvaluateur({
    alertes: {
      async lister(s) { await attendre(); return (alertes.get(s) ?? []).map((a) => ({ ...a })); },
      async enregistrer(s, a, j) { await attendre(); alertes.set(s, a.map((x) => ({ ...x }))); journal.push(...j); },
    },
    source: { async constats() { etat.evaluations += 1; await attendre(); return { constats: etat.constats, regles: etat.regles }; } },
    compteurs: { async enregistrer(_s, c) { menus.push(c); } },
    entreeDe: () => 'declarations',
    nouvelId: () => `alerte-${(n += 1)}`,
  });
  return { alertes, journal, menus, etat, evaluateur };
}
const constat: Constat = { regle: 'AL-01', objetType: 'declaration', objetId: 'tva-1', gravite: 'urgent' };

describe('évaluation horaire', () => {
  it('évaluations concurrentes : aucune alerte en double', async () => {
    const m = monde([constat]);
    await Promise.all([1, 2, 3, 4].map(() => m.evaluateur.evaluer(S, '2026-01-10T10:00:00Z')));
    expect(m.alertes.get(S)).toHaveLength(1);
    expect(m.journal).toHaveLength(1);
    expect(m.menus.at(-1)).toEqual({ declarations: { ouvertes: 1, urgentes: 1, pointExclamation: true } });
  });

  it('résolution automatique au passage suivant, compteur du menu remis à zéro', async () => {
    const m = monde([constat]);
    await m.evaluateur.evaluer(S, '2026-01-10T10:00:00Z');
    m.etat.constats = [];
    await m.evaluateur.evaluer(S, '2026-01-10T11:00:00Z');
    expect(m.alertes.get(S)?.[0]?.etat).toBe('resolue_auto');
    expect(m.menus.at(-1)).toEqual({});
  });

  it('le planificateur lance le travail une fois par heure et par société', async () => {
    const m = monde([constat]);
    const faux = creerFauxPlanificateur();
    inscrireTravailHoraire(faux.planificateur, { evaluateur: m.evaluateur, societes: async () => [S, 'societe-deux'] });
    expect((await faux.avancerJusqua('2026-01-10T10:20:00Z')).map((r) => r.etat)).toEqual(['fait']);
    expect((await faux.avancerJusqua('2026-01-10T10:50:00Z')).map((r) => r.etat)).toEqual(['deja_fait']);
    expect(m.etat.evaluations).toBe(2);
    expect(m.alertes.get('societe-deux')).toHaveLength(1);
  });

  it('une société en échec ne bloque pas les suivantes et le passage est en échec', async () => {
    const faux = creerFauxPlanificateur();
    const vus: string[] = [];
    inscrireTravailHoraire(faux.planificateur, {
      societes: async () => ['a', 'b'],
      evaluateur: { async evaluer(s) { vus.push(s); if (s === 'a') throw new Error('panne'); } },
    });
    expect((await faux.avancerJusqua('2026-01-10T10:00:00Z')).map((r) => r.etat)).toEqual(['echec']);
    expect(vus).toEqual(['a', 'b']);
  });
});

const T = (debut: string, fin: string): Periode => ({ debut, fin });
const inst = (bloc: Instantane['bloc'], periode: Periode, v = 1): Instantane => ({ periode, bloc, versionEcritures: v, invalide: false });
const evt = (id: string, type: string, version: number, date = '2026-03-15'): Enveloppe =>
  creerEnveloppe({
    id, type, societe_id: S, exercice_id: null, objet_id: 'ecr-1', version, acteur: { type: 'systeme', id: 'test' },
    canal: 'api', horodatage: '2026-03-20T08:00:00Z', correlation_id: 'corr-1', charge: { date },
  });

function consommateur(declarees: Periode[] = []) {
  const m = monde();
  let liste: Instantane[] = [inst('resultat', T('2026-03-01', '2026-03-31')), inst('resultat', T('2026-04-01', '2026-04-30'))];
  let version = 1;
  const vus = new Map<string, number>();
  const ids = new Set<string>();
  const cartes: string[] = [];
  const calculs: string[] = [];
  const c = creerConsommateur({
    evaluateur: m.evaluateur,
    vus: {
      async derniereVersion(_s, o) { return vus.get(o) ?? 0; },
      async noter(e) { ids.add(e.id); vus.set(e.objet_id, e.version); },
      async dejaVu(_s, id) { return ids.has(id); },
    },
    instantanes: {
      async lister() { return liste.map((i) => ({ ...i })); },
      async remplacer(_s, l) { liste = l.map((i) => ({ ...i })); },
      async versionEcritures() { return version; },
      async periodesDeclarees() { return declarees; },
    },
    cartes: { async ouvrirAntidatee(_s, o, d) { cartes.push(`${o}@${d}`); } },
    async calculer(_s, i) { calculs.push(i.periode.debut); return i; },
  });
  return { c, m, cartes, calculs, liste: () => liste, monter: () => { version += 1; } };
}

describe('événements d\'écriture', () => {
  it.each([[true, ['2026-03-01', '2026-04-01'], 2], [false, ['2026-03-01'], 1]] as const)('écriture antidatée, version montée : %s, recalculs %j', async (monte, recalculs, v) => {
    const x = consommateur([T('2026-01-01', '2026-03-31')]);
    if (monte) x.monter();
    expect(await x.c.consommer(evt('e1', 'compta.ecriture.validee', 1))).toBe('traite');
    expect(x.calculs).toEqual(recalculs);
    expect(x.liste().every((i) => !i.invalide && i.versionEcritures === v)).toBe(true);
    expect(x.cartes).toEqual(['ecr-1@2026-03-15']);
  });

  it('écriture hors période déclarée : aucune carte', async () => {
    const x = consommateur([T('2025-01-01', '2025-12-31')]);
    await x.c.consommer(evt('e1', 'compta.ecriture.corrigee', 1));
    expect(x.cartes).toEqual([]);
  });

  it('idempotence : même id ignoré, version ancienne ignorée, type étranger ignoré', async () => {
    const x = consommateur();
    expect(await x.c.consommer(evt('e1', 'compta.ecriture.validee', 2))).toBe('traite');
    expect(await x.c.consommer(evt('e1', 'compta.ecriture.validee', 3))).toBe('doublon');
    expect(await x.c.consommer(evt('e2', 'compta.ecriture.validee', 2))).toBe('ancien');
    expect(await x.c.consommer(evt('e3', 'compta.autre.chose', 9))).toBe('ignore');
    expect(x.m.etat.evaluations).toBe(1);
  });

  it('même événement livré deux fois en même temps : traité une seule fois', async () => {
    const x = consommateur();
    const r = await Promise.all([x.c.consommer(evt('e1', 'compta.tiers.cree', 1)), x.c.consommer(evt('e1', 'compta.tiers.cree', 1))]);
    expect(r).toEqual(['traite', 'doublon']);
    expect(x.m.etat.evaluations).toBe(1);
  });
});
