import { describe, expect, it } from 'vitest';
import { QueryVentes, VenteDetail, VenteResume } from '../domaines/ventes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Doc = { paths: Record<string, Record<string, { operationId?: string }>> };

describe('contrat des ventes en lecture', () => {
  it('ventes-dans-openapi', () => {
    const doc = genererOpenapi() as Doc;
    expect(doc.paths['/ventes']?.get?.operationId).toBe('listerVentes');
    expect(doc.paths['/ventes/{id}']?.get?.operationId).toBe('lireVente');
    expect(routesEcritureSansEnTete()).toEqual([]);
    for (const m of ['post', 'put', 'delete']) expect(doc.paths['/ventes']?.[m]).toBeUndefined();
  });

  it('bornes-invalides-400', () => {
    const rejet = [{ mois: '2026-13' }, { mois: '2026-00' }, { mois: '2026-1' }, { mois: 'abcd-ef' }, { limite: '0' }, { limite: '101' }, { limite: '1.5' }, { limite: 'NaN' }, { decalage: '-1' }, { client: 'x'.repeat(51) }, { etat: 'x'.repeat(51) }];
    for (const q of rejet) expect(QueryVentes.safeParse(q).success, JSON.stringify(q)).toBe(false);
    const accepte = [{}, { mois: '2026-01' }, { mois: '2026-12' }, { limite: '1' }, { limite: '100' }, { client: 'x'.repeat(50) }];
    for (const q of accepte) expect(QueryVentes.safeParse(q).success, JSON.stringify(q)).toBe(true);
  });

  it('ventes-schemas', () => {
    const resume = { id: 'v1', numero: 'F-0001', type: 'facture', dateFacture: '2026-01-15', ttcCentimes: 12000, resteDuCentimes: 0, etat: 'payee', avoirsLies: [{ id: 'a1', ttcCentimes: 500 }] };
    expect(VenteResume.parse(resume)).toEqual(resume);
    const detail = { ...resume, origine: 'saisie', lignes: [{ libelle: 'Prestation fictive', quantite: 1, ttcCentimes: 12000 }], cartes: [], paiements: [{ date: '2026-02-01', montantCentimes: 12000 }], ecriture: { statut: 'brouillon', lignes: [{ compte: '411', debitCentimes: 12000, creditCentimes: 0 }] } };
    expect(VenteDetail.parse(detail).ecriture?.lignes).toHaveLength(1);
    expect(VenteResume.safeParse({ ...resume, ttcCentimes: 1.5 }).success).toBe(false);
  });
});
