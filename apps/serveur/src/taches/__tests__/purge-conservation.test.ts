import { describe, expect, it } from 'vitest';
import { ajouterJours } from '../../../../../packages/noyau/src/dates/civiles.js';
import type { Gel, RegleConservation } from '../../../../../packages/noyau/src/conservation/regles.js';
import { creerFauxAlertes } from '../../../../../packages/noyau/src/exploitation/port-alerte.js';
import {
  ErreurPurge, passerPurge,
  type AlertePurge, type ObjetConservable, type ParametresPurge, type PurgePlanifiee,
} from '../purge-conservation.js';

const AUJOURDHUI = '2026-06-15';
const ROTATION = 4;
const regle = (surcharge: Partial<RegleConservation> = {}): RegleConservation => ({
  pays: 'FR', categorie: 'pieces', dureeAnnees: 7, pointDepart: 'date_document', statut: 'valide', source: 'source-inventee', ...surcharge,
});
const objet = (id: string, depart: string, societeId = 'societe-a'): ObjetConservable => ({
  id, societeId, categorie: 'pieces', pays: ['FR'], dates: { date_document: depart },
});
const ECHU = '2010-01-01';
const RECENT = '2026-01-01';

function monde(objets: ObjetConservable[], opts: {
  gels?: Gel[]; regles?: RegleConservation[]; fins?: ParametresPurge['finsDeContrat']; panne?: string[];
  plusAncienne?: string | null; purges?: PurgePlanifiee[];
} = {}) {
  const purges = new Map((opts.purges ?? []).map((x) => [`${x.societeId}/${x.objetId}`, x]));
  const efface: string[] = [];
  const traces: unknown[] = [];
  const { port: alerte, recues } = creerFauxAlertes<AlertePurge>();
  const params = (surcharge: Partial<ParametresPurge> = {}): ParametresPurge => ({
    societes: ['societe-a', 'societe-b'], regles: opts.regles ?? [regle()], aujourdhui: AUJOURDHUI,
    rotationSauvegardesJours: ROTATION, finsDeContrat: opts.fins ?? {}, alerte,
    ports: {
      objets: { lister: async (s) => objets.filter((o) => o.societeId === s) },
      purges: {
        lire: async (s, o) => purges.get(`${s}/${o}`) ?? null,
        ecrire: async (x) => { purges.set(`${x.societeId}/${x.objetId}`, structuredClone(x)); },
      },
      gels: { lire: async () => opts.gels ?? [] },
      effacement: {
        effacerBase: async (s, o) => {
          if (opts.panne?.includes(o)) throw new Error('panne');
          efface.push(`${s}/${o}`);
        },
      },
      sauvegardes: { plusAncienneLe: async () => opts.plusAncienne ?? null },
      trace: { ajouter: async (_s, t) => { traces.push(t); } },
    },
    ...surcharge,
  });
  return { params, purges, efface, traces, recues, etat: (s: string, o: string) => purges.get(`${s}/${o}`) };
}

describe('purge selon la règle de conservation', () => {
  it('r3-regle-vide-purge-refusee', async () => {
    for (const r of [regle({ dureeAnnees: null }), regle({ statut: 'non_verifie' })]) {
      const m = monde([objet('o1', ECHU)], { regles: [r] });
      await passerPurge(m.params());
      expect(m.efface).toEqual([]);
      expect(m.etat('societe-a', 'o1')).toMatchObject({ statut: 'refusee', code: 'a_confirmer' });
    }
  });

  it('r4-gel-refuse-et-trace', async () => {
    const m = monde([objet('o1', ECHU)], { gels: [{ pose_le: '2026-01-01' }] });
    await passerPurge(m.params());
    expect(m.efface).toEqual([]);
    expect(m.etat('societe-a', 'o1')).toMatchObject({ statut: 'refusee', code: 'gel_actif' });
    expect(m.traces).toEqual([{ code: 'suppression_refusee_gel', objetId: 'o1', le: AUJOURDHUI }]);
  });

  it('trop-tot-planifiee-avec-date-prevue', async () => {
    const m = monde([objet('o1', RECENT)]);
    await passerPurge(m.params());
    expect(m.efface).toEqual([]);
    expect(m.etat('societe-a', 'o1')).toMatchObject({ statut: 'planifiee', datePrevue: '2033-01-01' });
  });

  it('echue-effacee-avec-preuve', async () => {
    const m = monde([objet('o1', ECHU)]);
    await passerPurge(m.params());
    expect(m.efface).toEqual(['societe-a/o1']);
    expect(m.etat('societe-a', 'o1')).toMatchObject({
      statut: 'effacee_base',
      preuve: { effaceBaseLe: AUJOURDHUI, sauvegardesAuPlusTardLe: ajouterJours(AUJOURDHUI, ROTATION), source: 'source-inventee' },
    });
  });

  it('fin-de-contrat-sans-export-remis-refusee', async () => {
    const sans = monde([objet('o1', ECHU)], { fins: { 'societe-a': {} } });
    await passerPurge(sans.params());
    expect(sans.efface).toEqual([]);
    expect(sans.etat('societe-a', 'o1')).toMatchObject({ statut: 'refusee', code: 'export_non_remis' });
    const gel = monde([objet('o1', ECHU)], { fins: { 'societe-a': {} }, gels: [{ pose_le: '2026-01-01' }] });
    await passerPurge(gel.params());
    expect(gel.etat('societe-a', 'o1')).toMatchObject({ code: 'gel_actif' });
    const avec = monde([objet('o1', ECHU)], { fins: { 'societe-a': { exportRemisLe: '2026-06-01' } } });
    await passerPurge(avec.params());
    expect(avec.etat('societe-a', 'o1')?.statut).toBe('effacee_base');
  });

  it('relance-idempotente', async () => {
    const m = monde([objet('o1', ECHU)]);
    await passerPurge(m.params());
    await passerPurge(m.params());
    expect(m.efface).toEqual(['societe-a/o1']);
  });

  it('effacement-en-echec-jamais-marque-efface', async () => {
    const m = monde([objet('o1', ECHU), objet('o2', ECHU)], { panne: ['o1'] });
    await passerPurge(m.params());
    expect(m.etat('societe-a', 'o1')).toBeUndefined();
    expect(m.recues).toEqual([{ code: 'purge_en_echec', societeId: 'societe-a', objetId: 'o1' }]);
    expect(m.etat('societe-a', 'o2')?.statut).toBe('effacee_base');
  });

  it('sauvegardes-confirmees-apres-rotation', async () => {
    const jour = (plusAncienne: string | null) => monde([objet('o1', ECHU)], { plusAncienne });
    for (const [valeur, attendu] of [
      [null, 'effacee_base'], [ajouterJours(AUJOURDHUI, -1), 'effacee_base'], [AUJOURDHUI, 'effacee_base'],
      [ajouterJours(AUJOURDHUI, 1), 'effacee_sauvegardes'],
    ] as const) {
      const m = jour(valeur);
      await passerPurge(m.params());
      await passerPurge(m.params());
      expect(m.etat('societe-a', 'o1')?.statut).toBe(attendu);
      expect(m.efface).toHaveLength(1);
    }
  });

  it('une-societe-n-efface-pas-une-autre', async () => {
    const m = monde([objet('o1', ECHU, 'societe-a'), objet('o2', ECHU, 'societe-b')]);
    await passerPurge(m.params({ societes: ['societe-b'] }));
    expect(m.efface).toEqual(['societe-b/o2']);
    expect(m.etat('societe-a', 'o1')).toBeUndefined();
  });

  it('parametres-invalides', async () => {
    for (const rotation of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      const m = monde([objet('o1', ECHU)]);
      await expect(passerPurge(m.params({ rotationSauvegardesJours: rotation }))).rejects.toBeInstanceOf(ErreurPurge);
      expect(m.efface).toEqual([]);
    }
    const m = monde([objet('o1', ECHU)]);
    await expect(passerPurge(m.params({ aujourdhui: '15/06/2026' }))).rejects.toMatchObject({ code: 'date_invalide' });
    expect(m.efface).toEqual([]);
  });
});
