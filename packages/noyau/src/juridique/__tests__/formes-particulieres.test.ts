import { describe, expect, it } from 'vitest';
import { ErreurFormesParticulieres, voletAssociation, voletEnFormation } from '../formes-particulieres.js';

// Données fictives : paramètres inventés, aucune valeur légale.
const CONFIRME = { valeur: 'organe_fictif', confirme: true };
const DOCS = { valeur: ['approbation_comptes', 'rapport_organe'], confirme: true };
const parametres = (surcharge: Record<string, unknown> = {}) => ({ organeApprobation: CONFIRME, documents: DOCS, ...surcharge });
const ACTES = [
  { id: 'acte-2', date: '2026-03-02', repris: false },
  { id: 'acte-1', date: '2026-02-01', repris: false },
  { id: 'acte-3', date: '2026-03-10', repris: true },
];
const REPRISE = { documentReprise: { valeur: 'reprise_actes', confirme: true } };
const codeDe = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurFormesParticulieres ? e.code : 'autre';
  }
  return undefined;
};

describe('formes particulières (noyau)', () => {
  it('association-zero-dividende', () => {
    const v = voletAssociation(parametres());
    expect(v).toMatchObject({ statut: 'volet', dividendes: 'interdits' });
    expect(voletAssociation(parametres({ propositionDividende: true }))).toEqual({ statut: 'refus', code: 'association_sans_dividende' });
    expect(voletAssociation(parametres({ propositionDividende: false })).statut).toBe('volet');
  });

  it('association-documents-approbation', () => {
    const v = voletAssociation(parametres());
    if (v.statut !== 'volet') throw new Error('volet attendu');
    expect(v.organeApprobation).toBe('organe_fictif');
    expect(v.documents.map((d) => d.code)).toEqual(['approbation_comptes', 'rapport_organe']);
    expect(codeDe(() => voletAssociation(parametres({ documents: { valeur: [], confirme: true } })))).toBe('entree_invalide');
    expect(codeDe(() => voletAssociation(parametres({ organeApprobation: { valeur: ' ', confirme: true } })))).toBe('entree_invalide');
  });

  it('en-formation-actes-a-reprendre', () => {
    const v = voletEnFormation('en_formation', ACTES, REPRISE);
    expect(v).toMatchObject({ statut: 'en_formation', actesAReprendre: ['acte-1', 'acte-2'] });
    if (v.statut !== 'en_formation') throw new Error('en formation attendu');
    expect(v.documentReprise).toMatchObject({ code: 'reprise_actes', mention: 'prepare_par_ia_a_faire_valider', aVerifier: false });
    expect(voletEnFormation('immatriculee', ACTES, REPRISE).statut).toBe('immatriculee');
  });

  it('en-formation-zero-dividende', () => {
    const v = voletEnFormation('en_formation', ACTES, REPRISE);
    expect(v).toMatchObject({ dividendes: 'aucun' });
    expect(voletEnFormation('en_formation', ACTES, REPRISE, { propositionDividende: true })).toEqual({ statut: 'refus', code: 'societe_en_formation' });
  });

  it('parametre-non-confirme-a-verifier', () => {
    const v = voletAssociation(parametres({ organeApprobation: { valeur: 'organe_fictif', confirme: false } }));
    if (v.statut !== 'volet') throw new Error('volet attendu');
    expect(v.aVerifier).toBe(true);
    expect(v.documents.every((d) => d.aVerifier && d.mention === 'prepare_par_ia_a_faire_valider')).toBe(true);
    const w = voletAssociation(parametres({ documents: { ...DOCS, confirme: false } }));
    expect(w.statut === 'volet' && w.aVerifier).toBe(true);
    const f = voletEnFormation('en_formation', ACTES, { documentReprise: { valeur: 'reprise_actes', confirme: false } });
    expect(f.statut === 'en_formation' && f.documentReprise.aVerifier).toBe(true);
    const ok = voletAssociation(parametres());
    expect(ok.statut === 'volet' && ok.aVerifier).toBe(false);
  });

  it('aucun-document-signe', () => {
    const v = voletAssociation(parametres());
    const f = voletEnFormation('en_formation', ACTES, REPRISE);
    if (v.statut !== 'volet' || f.statut !== 'en_formation') throw new Error('volets attendus');
    for (const d of [...v.documents, f.documentReprise]) {
      expect(Object.keys(d).sort()).toEqual(['aVerifier', 'code', 'mention']);
    }
    expect(JSON.stringify([v, f])).not.toMatch(/signe|depose|envoy/i);
  });
});
