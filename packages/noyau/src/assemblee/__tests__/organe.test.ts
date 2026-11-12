import { describe, expect, it } from 'vitest';
import { ErreurOrgane, type RegleOrgane, type SocieteOrgane, type StatutsOrgane, organeApprobation } from '../organe.js';

// Règles INVENTÉES pour les tests (valeurs d'exemple, sources fictives).
const D = '2026-01-01';
const r = (p: Partial<RegleOrgane> & Pick<RegleOrgane, 'forme' | 'cas' | 'organe'>): RegleOrgane => ({
  modes: [], selonStatuts: false, depotVautApprobation: false, valableAPartir: D, source: `source-${p.forme}-${p.cas}`, ...p,
});
const REGLES: RegleOrgane[] = [
  r({ forme: 'EI', cas: 'defaut', organe: 'exploitant' }),
  r({ forme: 'EURL', cas: 'associe_unique_dirigeant', organe: 'associe_unique', modes: ['decision_associe_unique'], depotVautApprobation: true }),
  r({ forme: 'EURL', cas: 'associe_unique_non_dirigeant', organe: 'associe_unique', modes: ['decision_associe_unique'] }),
  r({ forme: 'SASU', cas: 'associe_unique_dirigeant', organe: 'associe_unique', modes: ['decision_associe_unique'], depotVautApprobation: true }),
  r({ forme: 'SASU', cas: 'associe_unique_non_dirigeant', organe: 'associe_unique', modes: ['decision_associe_unique'] }),
  r({ forme: 'SARL', cas: 'defaut', organe: 'assemblee_generale', modes: ['assemblee'] }),
  r({ forme: 'SAS', cas: 'defaut', organe: 'collectivite_associes', modes: ['assemblee', 'consultation_ecrite', 'acte_unanime'], selonStatuts: true }),
  r({ forme: 'SCI', cas: 'sans_ag', organe: 'gerant', modes: ['rapport_gerant'] }),
  r({ forme: 'SCI', cas: 'avec_ag', organe: 'assemblee_generale', modes: ['assemblee', 'consultation_ecrite'], selonStatuts: true }),
];
const soc = (p: Partial<SocieteOrgane> & Pick<SocieteOrgane, 'forme'>): SocieteOrgane => ({ nbAssocies: 3, dateReference: '2026-11-12', ...p });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurOrgane ? e.code : 'autre';
  }
  return undefined;
};
const sans: StatutsOrgane = {};

describe("organe d'approbation des comptes", () => {
  it('sarl-assemblee-annuelle', () => {
    const o = organeApprobation(soc({ forme: 'SARL' }), sans, REGLES);
    expect(o.organe).toBe('assemblee_generale');
    expect(o.modes).toEqual(['assemblee']);
    expect(o.source).toBe('source-SARL-defaut');
  });

  it('sas-plusieurs-associes-mode-selon-statuts', () => {
    const s = soc({ forme: 'SAS' });
    expect(organeApprobation(s, { modesPrevus: ['acte_unanime'] }, REGLES).modes).toEqual(['acte_unanime']);
    expect(organeApprobation(s, { modesPrevus: ['consultation_ecrite', 'assemblee'] }, REGLES).modes).toEqual(['assemblee', 'consultation_ecrite']);
    expect(organeApprobation(s, sans, REGLES).modes).toEqual([]);
    expect(organeApprobation(s, { modesPrevus: ['rapport_gerant'] }, REGLES).modes).toEqual([]);
  });

  it('eurl-gerant-non-associe-decision-associe-unique', () => {
    const o = organeApprobation(soc({ forme: 'EURL', nbAssocies: 1, dirigeantAssocie: false }), sans, REGLES);
    expect(o.organe).toBe('associe_unique');
    expect(o.modes).toEqual(['decision_associe_unique']);
    expect(o.depotVautApprobation).toBe(false);
  });

  it('associe-unique-dirigeant-depot-vaut-approbation-selon-cas', () => {
    expect(organeApprobation(soc({ forme: 'EURL', nbAssocies: 1, dirigeantAssocie: true }), sans, REGLES).depotVautApprobation).toBe(true);
    expect(organeApprobation(soc({ forme: 'EURL', nbAssocies: 1, dirigeantAssocie: false }), sans, REGLES).depotVautApprobation).toBe(false);
    expect(organeApprobation(soc({ forme: 'SASU', nbAssocies: 1, dirigeantAssocie: true }), sans, REGLES).depotVautApprobation).toBe(true);
    expect(organeApprobation(soc({ forme: 'SASU', nbAssocies: 1 }), sans, REGLES).depotVautApprobation).toBe(false);
  });

  it('sci-sans-ag-rapport-du-gerant', () => {
    const o = organeApprobation(soc({ forme: 'SCI' }), { agPrevue: false, modesPrevus: ['assemblee'], visioconference: true }, REGLES);
    expect(o.organe).toBe('gerant');
    expect(o.modes).toEqual(['rapport_gerant']);
    expect(o.modes).not.toContain('assemblee');
    expect(o.modes).not.toContain('visioconference');
    expect(organeApprobation(soc({ forme: 'SCI' }), sans, REGLES).modes).toEqual(['rapport_gerant']);
  });

  it('sci-avec-ag-dans-statuts', () => {
    const o = organeApprobation(soc({ forme: 'SCI' }), { agPrevue: true, modesPrevus: ['assemblee'] }, REGLES);
    expect(o.organe).toBe('assemblee_generale');
    expect(o.modes).toEqual(['assemblee']);
    expect(o.source).toBe('source-SCI-avec_ag');
  });

  it('visioconference-propose-si-statuts', () => {
    const s = soc({ forme: 'SARL' });
    expect(organeApprobation(s, { visioconference: true }, REGLES).modes).toEqual(['assemblee', 'visioconference']);
    expect(organeApprobation(s, { visioconference: false }, REGLES).modes).not.toContain('visioconference');
    expect(organeApprobation(s, sans, REGLES).modes).not.toContain('visioconference');
    const sasConsult = organeApprobation(soc({ forme: 'SAS' }), { modesPrevus: ['consultation_ecrite'], visioconference: true }, REGLES);
    expect(sasConsult.modes).toEqual(['consultation_ecrite']);
    expect(organeApprobation(soc({ forme: 'EURL', nbAssocies: 1 }), { visioconference: true }, REGLES).modes).not.toContain('visioconference');
  });

  it('regle_non_sourcee: une règle sans source ou sans date valide est refusée', () => {
    const avec = (p: Partial<RegleOrgane>): RegleOrgane[] => [...REGLES, r({ forme: 'SARL', cas: 'defaut', organe: 'assemblee_generale', ...p })];
    for (const source of ['', '   ']) expect(code(() => organeApprobation(soc({ forme: 'SARL' }), sans, avec({ source })))).toBe('regle_non_sourcee');
    expect(code(() => organeApprobation(soc({ forme: 'SARL' }), sans, avec({ valableAPartir: '' })))).toBe('regle_non_sourcee');
    expect(code(() => organeApprobation(soc({ forme: 'SARL' }), sans, avec({ valableAPartir: '2026-02-30' })))).toBe('regle_non_sourcee');
  });

  it('règle datée: la plus récente applicable à la date, sinon refus', () => {
    const neuve = r({ forme: 'SARL', cas: 'defaut', organe: 'assemblee_generale', modes: ['assemblee'], valableAPartir: '2027-01-01', source: 'neuve' });
    const reg = [...REGLES, neuve];
    expect(organeApprobation(soc({ forme: 'SARL', dateReference: '2026-12-31' }), sans, reg).source).toBe('source-SARL-defaut');
    expect(organeApprobation(soc({ forme: 'SARL', dateReference: '2027-01-01' }), sans, reg).source).toBe('neuve');
    expect(code(() => organeApprobation(soc({ forme: 'SARL', dateReference: '2025-12-31' }), sans, REGLES))).toBe('regle_absente');
    expect(code(() => organeApprobation(soc({ forme: 'SARL' }), sans, []))).toBe('regle_absente');
  });

  it('entrées invalides refusées; EI sans mode', () => {
    expect(code(() => organeApprobation(soc({ forme: 'SARL', nbAssocies: 0 }), sans, REGLES))).toBe('entree_invalide');
    for (const n of [Number.NaN, 1.5, Infinity, -Infinity, -1]) expect(code(() => organeApprobation(soc({ forme: 'SARL', nbAssocies: n }), sans, REGLES))).toBe('entree_invalide');
    expect(code(() => organeApprobation(soc({ forme: 'EURL', nbAssocies: 2 }), sans, REGLES))).toBe('entree_invalide');
    expect(code(() => organeApprobation(soc({ forme: 'SARL', dateReference: 'x' }), sans, REGLES))).toBe('entree_invalide');
    // SARL ou SAS à associé unique : aucune règle par défaut, refus prudent
    expect(code(() => organeApprobation(soc({ forme: 'SARL', nbAssocies: 1 }), sans, REGLES))).toBe('regle_absente');
    expect(code(() => organeApprobation(soc({ forme: 'SAS', nbAssocies: 1, dirigeantAssocie: true }), sans, REGLES))).toBe('regle_absente');
    const ei = organeApprobation(soc({ forme: 'EI', nbAssocies: 1 }), { visioconference: true }, REGLES);
    expect(ei).toMatchObject({ organe: 'exploitant', modes: [] });
  });
});
