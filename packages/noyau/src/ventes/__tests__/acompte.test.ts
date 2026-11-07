import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import type { ParametreLegal } from '../../../../parametres/src/au-jour.js';
import { qualifierAcompte } from '../acompte.js';

const comptes = { client: 'C1', tvaCollectee: 'T1', tvaEnAttente: 'T2', avancesClients: 'AV', banque: 'BQ' };
const param = (statut: ParametreLegal['statut']): ParametreLegal => ({
  cle: 'cle.inventee.acompte',
  pays: 'FR',
  valeur: 'x',
  effet_debut: '2026-01-01',
  effet_fin: null,
  statut,
  source: 'Source inventée',
  date_releve: '2026-06-01',
});
const base = {
  id: 'ac-1',
  journal: 'BQ',
  date: '2026-11-05',
  ttc: centimes(119000),
  confirmePar: 'personne-exemple',
  clientAuxiliaire: 'CLI-EXEMPLE',
  tauxPdb: 1900 as number | null,
  parametreExigibilite: param('valide') as ParametreLegal | undefined,
  comptes,
};
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('acompte encaissé avant la facture', () => {
  it('v13-confirme-parametre-valide', () => {
    const r = qualifierAcompte(base);
    expect(r.etat).toBe('propose');
    const l = r.ecriture?.lignes ?? [];
    expect(l.map((x) => [x.compte, x.debit, x.credit])).toEqual([
      ['BQ', 119000, 0],
      ['AV', 0, 100000],
      ['T1', 0, 19000],
    ]);
    expect(l[1]?.auxiliaire).toBe('CLI-EXEMPLE');
    expect(r.ecriture?.statut).toBe('propose');
    expect(r.lignesTva).toEqual([
      { compte: 'T1', tauxPdb: 1900, baseCentimes: 100000, tvaCentimes: 19000, codeTva: 'COLLECTEE', cas: 'B', sens: 'acompte', dateExigibilite: '2026-11-05', pieceId: 'ac-1' },
    ]);
    expect(r.cartes).toEqual([]);
    expect(r.blocage).toBeUndefined();
  });
  it('v13-parametre-a-verifier-cc-t18-aucune-tva', () => {
    for (const s of ['a_verifier', 'non_verifie', 'retire'] as const) {
      const r = qualifierAcompte({ ...base, parametreExigibilite: param(s) });
      expect(r).toMatchObject({ etat: 'bloque', ecriture: null, lignesTva: [], blocage: 'CC-T18' });
    }
  });
  it('parametre-absent-cc-t18', () => {
    const r = qualifierAcompte({ ...base, parametreExigibilite: undefined });
    expect(r).toMatchObject({ etat: 'bloque', ecriture: null, lignesTva: [], blocage: 'CC-T18' });
  });
  it('v26-non-confirme-a-qualifier-zero-produit', () => {
    for (const confirmePar of [undefined, '']) {
      const r = qualifierAcompte({ ...base, confirmePar, parametreExigibilite: undefined });
      expect(r).toMatchObject({ etat: 'a_qualifier', ecriture: null, lignesTva: [] });
      expect(r.blocage).toBeUndefined();
    }
  });
  it('taux-inconnu-a3', () => {
    const r = qualifierAcompte({ ...base, tauxPdb: null });
    expect(r).toMatchObject({ etat: 'a_verifier', ecriture: null, lignesTva: [], cartes: ['A3'] });
  });
  it('taux-zero-ht-egal-ttc', () => {
    const r = qualifierAcompte({ ...base, tauxPdb: 0 });
    expect(r.etat).toBe('propose');
    expect(r.ecriture?.lignes.map((x) => [x.compte, x.debit, x.credit])).toEqual([
      ['BQ', 119000, 0],
      ['AV', 0, 119000],
    ]);
    expect(r.lignesTva[0]).toMatchObject({ baseCentimes: 119000, tvaCentimes: 0 });
  });
  it('ht-plus-tva-egal-ttc-boucle', () => {
    let graine = 12345;
    const suivant = (max: number): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % max;
    };
    for (let i = 0; i < 1000; i++) {
      const ttc = centimes(suivant(5000000) + 1);
      const r = qualifierAcompte({ ...base, ttc, tauxPdb: suivant(10001) });
      const t = r.lignesTva[0];
      expect(t).toBeDefined();
      expect((t?.baseCentimes ?? 0) + (t?.tvaCentimes ?? 0)).toBe(ttc);
      expect(t?.tvaCentimes).toBeGreaterThanOrEqual(0);
      expect(r.ecriture && verifierEquilibre(r.ecriture).equilibree).toBe(true);
    }
  });
  it('ttc-invalide', () => {
    for (const ttc of [0, -1, 1.5, NaN, Infinity]) {
      expect(code(() => qualifierAcompte({ ...base, ttc: ttc as never })), String(ttc)).toBe('ttc_invalide');
    }
  });
  it('taux-invalide', () => {
    for (const tauxPdb of [-1, 10001, 1.5, NaN]) {
      expect(code(() => qualifierAcompte({ ...base, tauxPdb })), String(tauxPdb)).toBe('taux_invalide');
    }
    expect(qualifierAcompte({ ...base, tauxPdb: 10000 }).etat).toBe('propose');
  });
  it('date-invalide', () => {
    expect(code(() => qualifierAcompte({ ...base, date: '2026-02-30' }))).toBe('date_invalide');
  });
});
