import { describe, expect, it } from 'vitest';
import {
  ErreurCasCourant,
  escompteConsenti,
  escompteObtenu,
  taxeVehiculeLue,
} from '../escompte.js';

const COMPTES_OBTENU = { fournisseur: 'F-401', escompteObtenu: 'P-765' };
const COMPTES_CONSENTI = { escompteConsenti: 'C-665', client: 'K-411' };
const COMPTES_TAXE = { charge: 'C-635', etat: 'E-447' };
const BASE = { id: 'E1', date: '2026-03-15', journal: 'OD' };

describe('escompte', () => {
  it('escompte-obtenu', () => {
    const r = escompteObtenu({ ...BASE, du: 10000, paye: 9800, tvaSurEscompte: false }, COMPTES_OBTENU, 'a_valider');
    expect(r.blocageTva).toBe(false);
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes).toEqual([
      { compte: 'F-401', libelle: 'Escompte obtenu', debit: 200, credit: 0 },
      { compte: 'P-765', libelle: 'Escompte obtenu', debit: 0, credit: 200 },
    ]);
  });

  it('escompte-consenti', () => {
    const r = escompteConsenti({ ...BASE, du: 10000, paye: 9800, tvaSurEscompte: false }, COMPTES_CONSENTI, 'valide');
    expect(r.blocageTva).toBe(false);
    expect(r.carteAvoirADemander).toBe(false);
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes).toEqual([
      { compte: 'C-665', libelle: 'Escompte consenti', debit: 200, credit: 0 },
      { compte: 'K-411', libelle: 'Escompte consenti', debit: 0, credit: 200 },
    ]);
  });

  it('escompte-avec-tva-bloque-la-tva', () => {
    const e = { ...BASE, du: 10000, paye: 9800, tvaSurEscompte: true };
    expect(escompteObtenu(e, COMPTES_OBTENU, 'a_valider').blocageTva).toBe(true);
    expect(escompteObtenu(e, COMPTES_OBTENU, 'propose').blocageTva).toBe(true);
    expect(escompteConsenti(e, COMPTES_CONSENTI, '').blocageTva).toBe(true);
    expect(escompteObtenu(e, COMPTES_OBTENU, 'valide').blocageTva).toBe(false);
    expect(escompteConsenti(e, COMPTES_CONSENTI, 'valide').blocageTva).toBe(false);
  });

  it('taxe-vehicule-montant-lu', () => {
    const e = taxeVehiculeLue({ ...BASE, montantLu: 45000 }, COMPTES_TAXE);
    expect(e.statut).toBe('brouillon');
    expect(e.lignes).toEqual([
      { compte: 'C-635', libelle: 'Taxe sur véhicule', debit: 45000, credit: 0 },
      { compte: 'E-447', libelle: 'Taxe sur véhicule', debit: 0, credit: 45000 },
    ]);
    for (const m of [undefined, 1.5, NaN, Infinity, 0, -5]) {
      expect(() => taxeVehiculeLue({ ...BASE, montantLu: m }, COMPTES_TAXE)).toThrow(
        expect.objectContaining({ code: 'montant_non_lu' }),
      );
    }
  });

  it('client-deduit-escompte-carte-avoir', () => {
    const e = { ...BASE, du: 10000, paye: 9800, tvaSurEscompte: false };
    expect(escompteConsenti({ ...e, deduitParClient: true }, COMPTES_CONSENTI, 'valide').carteAvoirADemander).toBe(true);
    expect(escompteConsenti({ ...e, deduitParClient: false }, COMPTES_CONSENTI, 'valide').carteAvoirADemander).toBe(false);
    expect(escompteConsenti(e, COMPTES_CONSENTI, 'valide').carteAvoirADemander).toBe(false);
  });

  it('paye-superieur-au-du-refuse', () => {
    for (const [du, paye] of [[10000, 10001], [10000, 10000], [0, 0]] as const) {
      const e = { ...BASE, du, paye, tvaSurEscompte: false };
      expect(() => escompteObtenu(e, COMPTES_OBTENU, 'valide')).toThrow(expect.objectContaining({ code: 'pas_d_escompte' }));
      expect(() => escompteConsenti(e, COMPTES_CONSENTI, 'valide')).toThrow(expect.objectContaining({ code: 'pas_d_escompte' }));
    }
  });

  it('entrees-invalides', () => {
    const ok = { ...BASE, du: 10000, paye: 9800, tvaSurEscompte: false };
    const mauvais = [NaN, 1.5, Infinity, -Infinity, -100];
    for (const v of mauvais) {
      for (const e of [{ ...ok, du: v }, { ...ok, paye: v }]) {
        expect(() => escompteObtenu(e, COMPTES_OBTENU, 'valide')).toThrow(ErreurCasCourant);
        expect(() => escompteObtenu(e, COMPTES_OBTENU, 'valide')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
        expect(() => escompteConsenti(e, COMPTES_CONSENTI, 'valide')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      }
    }
    for (const e of [{ ...ok, id: '' }, { ...ok, date: ' ' }, { ...ok, journal: '' }]) {
      expect(() => escompteObtenu(e, COMPTES_OBTENU, 'valide')).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      expect(() => taxeVehiculeLue({ ...e, montantLu: 100 }, COMPTES_TAXE)).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
    }
    expect(() => escompteObtenu(ok, { fournisseur: '', escompteObtenu: 'P-765' }, 'valide')).toThrow(
      expect.objectContaining({ code: 'entree_invalide' }),
    );
    expect(() => escompteConsenti(ok, { escompteConsenti: 'C-665', client: '' }, 'valide')).toThrow(
      expect.objectContaining({ code: 'entree_invalide' }),
    );
    expect(() => taxeVehiculeLue({ ...BASE, montantLu: 100 }, { charge: '', etat: 'E-447' })).toThrow(
      expect.objectContaining({ code: 'entree_invalide' }),
    );
  });
});
