import { describe, expect, it } from 'vitest';
import { CATALOGUE_DOCUMENTS, ErreurCatalogueDocuments, catalogueFiltre } from '../catalogue.js';

const codes = (forme: Parameters<typeof catalogueFiltre>[0]) => catalogueFiltre(forme, 'complet').documents.map((d) => d.code).sort();

describe('catalogue des documents préparés', () => {
  it('catalogue-sarl', () => {
    expect(codes('SARL')).toEqual([
      'annexe', 'balance', 'bilan', 'compte_resultat', 'consultation_ecrite', 'convocation_ag',
      'declaration_tva', 'fec', 'feuille_presence', 'grand_livre', 'liasse_fiscale', 'ordre_du_jour', 'pv_ag', 'pv_consultation', 'rapport_gestion',
    ].sort());
    expect(CATALOGUE_DOCUMENTS).toHaveLength(18);
    expect(new Set(CATALOGUE_DOCUMENTS.map((d) => d.code)).size).toBe(18);
  });

  it('catalogue-sas', () => {
    expect(codes('SAS')).toEqual([
      'acte_unanime', 'annexe', 'balance', 'bilan', 'compte_resultat', 'consultation_ecrite', 'convocation_ag', 'declaration_tva', 'fec',
      'feuille_presence', 'grand_livre', 'liasse_fiscale', 'ordre_du_jour', 'pv_ag', 'pv_consultation', 'rapport_gestion',
    ]);
    const unique = [
      'annexe', 'balance', 'bilan', 'compte_resultat', 'declaration_tva', 'decision_associe_unique', 'fec', 'grand_livre', 'liasse_fiscale', 'rapport_gestion',
    ];
    expect(codes('EURL')).toEqual(unique);
    expect(codes('SASU')).toEqual(unique);
    expect(catalogueFiltre('SAS', 'saisie_seule').absents.map((a) => a.code).sort()).toEqual(['annexe', 'bilan', 'compte_resultat', 'liasse_fiscale', 'rapport_gestion']);
    expect(catalogueFiltre('SAS', 'complet').absents).toEqual([]);
  });

  it('catalogue-ei', () => {
    expect(codes('EI')).toEqual(['balance', 'bilan', 'compte_resultat', 'declaration_tva', 'fec', 'grand_livre', 'liasse_fiscale']);
    expect(codes('SCI')).toContain('rapport_gerant_sci');
  });

  it('saisie-seule-officiels-absents-avec-code', () => {
    const r = catalogueFiltre('SARL', 'saisie_seule');
    expect(r.documents.map((d) => d.code).sort()).toEqual([
      'balance', 'consultation_ecrite', 'convocation_ag', 'declaration_tva', 'fec', 'feuille_presence', 'grand_livre', 'ordre_du_jour', 'pv_ag', 'pv_consultation',
    ]);
    expect(r.absents.map((a) => a.code).sort()).toEqual(['annexe', 'bilan', 'compte_resultat', 'liasse_fiscale', 'rapport_gestion']);
    expect(r.absents.every((a) => a.motif === 'officiel_absent_saisie_seule')).toBe(true);
    expect(catalogueFiltre('SARL', 'complet').absents).toEqual([]);
    expect(catalogueFiltre('SCI', 'saisie_seule').absents).toEqual([]);
  });

  it('entrées invalides refusées', () => {
    expect(() => catalogueFiltre('SA' as never, 'complet')).toThrow(ErreurCatalogueDocuments);
    expect(() => catalogueFiltre('SARL', 'autre' as never)).toThrow(ErreurCatalogueDocuments);
  });
});
