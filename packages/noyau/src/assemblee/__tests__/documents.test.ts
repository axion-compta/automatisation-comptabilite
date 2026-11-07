import { describe, expect, it } from 'vitest';
import {
  documentsAssemblee,
  ErreurAssemblee,
  type ModeleDocument,
  type ResultatDocuments,
  type TypeDocument,
} from '../documents.js';

const TOUS: TypeDocument[] = [
  'decision_associe_unique',
  'convocation',
  'ordre_du_jour',
  'feuille_presence',
  'pv_ag',
  'consultation_ecrite',
  'pv_consultation',
  'acte_unanime',
];

function modeles(types: readonly TypeDocument[] = TOUS): ModeleDocument[] {
  return types.map((type) => ({ type, version: 'v2', dateModele: '2026-01-15', approuve: true }));
}

function types(r: ResultatDocuments): string[] {
  if (r.statut !== 'documents') throw new Error('documents attendus, reçu : ' + r.statut);
  return r.documents.map((d) => d.type);
}

describe('documents d’assemblée', () => {
  it('associe-unique-une-decision', () => {
    for (const forme of ['SASU', 'EURL', 'SAS', 'SARL'] as const) {
      const r = documentsAssemblee({ forme, nbAssocies: 1 }, modeles());
      expect(types(r)).toEqual(['decision_associe_unique']);
    }
  });
  it('sarl-quatre-documents', () => {
    const r = documentsAssemblee({ forme: 'SARL', nbAssocies: 4 }, modeles());
    expect(types(r)).toEqual(['convocation', 'ordre_du_jour', 'feuille_presence', 'pv_ag']);
    const deux = documentsAssemblee({ forme: 'SARL', nbAssocies: 2, modeDecision: 'acte_unanime' }, modeles());
    expect(types(deux)).toEqual(['convocation', 'ordre_du_jour', 'feuille_presence', 'pv_ag']);
  });
  it('sas-selon-le-mode', () => {
    const assemblee = documentsAssemblee({ forme: 'SAS', nbAssocies: 3, modeDecision: 'assemblee' }, modeles());
    expect(types(assemblee)).toEqual(['convocation', 'ordre_du_jour', 'feuille_presence', 'pv_ag']);
    const ecrite = documentsAssemblee({ forme: 'SAS', nbAssocies: 3, modeDecision: 'consultation_ecrite' }, modeles());
    expect(types(ecrite)).toEqual(['consultation_ecrite', 'pv_consultation']);
    const unanime = documentsAssemblee({ forme: 'SAS', nbAssocies: 3, modeDecision: 'acte_unanime' }, modeles());
    expect(types(unanime)).toEqual(['acte_unanime']);
  });
  it('mode-absent-refuse', () => {
    const r = documentsAssemblee({ forme: 'SAS', nbAssocies: 3 }, modeles());
    expect(r).toEqual({ statut: 'refus', code: 'mode_decision_absent' });
  });
  it('modele-non-approuve-zero-document', () => {
    const liste = modeles().map((m) => (m.type === 'pv_ag' ? { ...m, approuve: false } : m));
    const r = documentsAssemblee({ forme: 'SARL', nbAssocies: 4 }, liste);
    expect(r).toEqual({ statut: 'refus', code: 'modele_a_faire_valider', types: ['pv_ag'] });
    expect('documents' in r).toBe(false);
    const incomplets: ModeleDocument[] = [
      { type: 'pv_ag', version: 'v1', dateModele: '2026-01-15', approuve: true },
      { type: 'ordre_du_jour', approuve: true },
      { type: 'feuille_presence', version: '  ', dateModele: '2026-01-15', approuve: true },
    ];
    const r2 = documentsAssemblee({ forme: 'SARL', nbAssocies: 4 }, incomplets);
    expect(r2).toEqual({
      statut: 'refus',
      code: 'modele_a_faire_valider',
      types: ['convocation', 'feuille_presence', 'ordre_du_jour'],
    });
    const sansDate: ModeleDocument[] = [{ type: 'decision_associe_unique', version: 'v1', approuve: true }];
    expect(documentsAssemblee({ forme: 'SASU', nbAssocies: 1 }, sansDate).statut).toBe('refus');
    expect(documentsAssemblee({ forme: 'SASU', nbAssocies: 1 }, []).statut).toBe('refus');
  });
  it('version-date-et-mention-presentes', () => {
    const liste = modeles().map((m) => ({ ...m, version: 'v-' + m.type, dateModele: '2026-02-01' }));
    const r = documentsAssemblee({ forme: 'SARL', nbAssocies: 4 }, liste);
    if (r.statut !== 'documents') throw new Error('documents attendus');
    expect(r.documents).toHaveLength(4);
    for (const d of r.documents) {
      expect(d.versionModele).toBe('v-' + d.type);
      expect(d.dateModele).toBe('2026-02-01');
      expect(d.mention).toBe('prepare_par_ia_a_faire_valider');
      expect(d.aVerifier).toBe(d.type === 'feuille_presence');
    }
  });
  it('ei-non-applicable', () => {
    expect(documentsAssemblee({ forme: 'EI', nbAssocies: 1 }, modeles())).toEqual({ statut: 'non_applicable' });
    expect(documentsAssemblee({ forme: 'EI', nbAssocies: 1 }, []).statut).toBe('non_applicable');
  });
  it('nb-associes-invalide', () => {
    for (const nb of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      let code: string | undefined;
      try {
        documentsAssemblee({ forme: 'SARL', nbAssocies: nb }, modeles());
      } catch (e) {
        code = e instanceof ErreurAssemblee ? e.code : 'autre';
      }
      expect(code).toBe('entree_invalide');
    }
    expect(() => documentsAssemblee({ forme: 'EI', nbAssocies: Number.NaN }, modeles())).toThrow(ErreurAssemblee);
    expect(() => documentsAssemblee({ forme: 'SASU', nbAssocies: 2 }, modeles())).toThrow(ErreurAssemblee);
  });
});