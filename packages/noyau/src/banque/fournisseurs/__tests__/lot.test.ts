import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurLot, annuler, fichierPossible, marquerPaye, proposerLot, signalerSansDebit, validerLot } from '../lot.js';
import type { Lot } from '../lot.js';

const H = '2025-03-01T10:00:00Z';
const lignes = [{ pieceId: 'f1', montant: centimes(120000) }, { pieceId: 'f2', montant: centimes(200000) }];
const pers = { type: 'personne', id: 'u1' } as const;
const ia = { type: 'ia', id: 'a1' } as const;
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurLot ? e.code : 'autre';
  }
  return undefined;
};
const valide = (): Lot => validerLot(proposerLot(lignes, ia, H), pers, H).lot;

describe('lot de fournisseurs à payer', () => {
  it('t13-2-ia-refusee', () => {
    const lot = proposerLot(lignes, ia, H);
    expect(lot).toMatchObject({ etat: 'propose', creeParType: 'ia', total: 320000 });
    expect(code(() => validerLot(lot, ia, H))).toBe('ia_interdite');
    expect(code(() => validerLot(lot, { type: 'systeme', id: 's' }, H))).toBe('ia_interdite');
  });

  it('t13-2-personne-validee-journal', () => {
    const r = validerLot(proposerLot(lignes, ia, H), pers, H);
    expect(r.lot.etat).toBe('valide_par_personne');
    expect(r.journal).toEqual({ action: 'valider_lot', acteurType: 'personne', acteurId: 'u1', horodatage: H });
    expect(code(() => validerLot(r.lot, pers, H))).toBe('etat_incompatible');
  });

  it('autonome-reste-humain', () => {
    const lot = proposerLot(lignes, ia, H);
    for (const mode of ['assiste', 'autonome'] as const) {
      expect(code(() => validerLot(lot, { ...ia, mode }, H))).toBe('ia_interdite');
    }
  });

  it('t13-3-fichier-avant-validation-refuse', () => {
    expect(fichierPossible(proposerLot(lignes, pers, H))).toEqual({ possible: false, code: 'valider_avant' });
    expect(fichierPossible(valide())).toEqual({ possible: true });
    expect(fichierPossible({ ...valide(), etat: 'annule' })).toEqual({ possible: false, code: 'valider_avant' });
  });

  it('t13-6-marque-paye-sans-ecriture', () => {
    const avant = valide();
    const copie = JSON.stringify(avant);
    const apres = marquerPaye(avant, pers, H);
    expect(apres.etat).toBe('marque_paye');
    expect(JSON.stringify(avant)).toBe(copie);
    expect(Object.keys(apres).sort()).toEqual([...Object.keys(avant), 'marquePayeLe'].sort());
    expect(code(() => marquerPaye(proposerLot(lignes, pers, H), pers, H))).toBe('etat_incompatible');
    const src = readFileSync(new URL('../lot.ts', import.meta.url), 'utf8');
    expect(src.split('\n').filter((l) => /^\s*(import|export)\b.*from/.test(l) && /ecritures/.test(l))).toEqual([]);
  });

  it('signal-apres-delai', () => {
    const lot = marquerPaye(valide(), pers, H);
    expect(signalerSansDebit([lot], [], '2025-03-11', 10)).toEqual([]);
    expect(signalerSansDebit([lot], [], '2025-03-12', 10)).toEqual(['f1', 'f2']);
    expect(signalerSansDebit([valide()], [], '2026-01-01', 10)).toEqual([]);
    for (const d of [Number.NaN, -1, 1.5, Infinity]) expect(code(() => signalerSansDebit([lot], [], '2025-03-12', d))).toBe('delai_invalide');
    expect(code(() => signalerSansDebit([lot], [], 'pas-une-date', 10))).toBe('date_invalide');
  });

  it('pas-de-signal-si-debit', () => {
    const lot = marquerPaye(valide(), pers, H);
    expect(signalerSansDebit([lot], ['f1'], '2025-04-01', 10)).toEqual(['f2']);
    expect(signalerSansDebit([lot], ['f1', 'f2'], '2025-04-01', 10)).toEqual([]);
  });

  it('annulation-apres-fichier-refusee', () => {
    expect(annuler(valide(), pers)).toMatchObject({ etat: 'annule', annulePar: 'u1' });
    expect(annuler(proposerLot(lignes, ia, H), pers).etat).toBe('annule');
    for (const etat of ['fichier_genere', 'marque_paye', 'annule'] as const) {
      expect(code(() => annuler({ ...valide(), etat }, pers))).toBe('annulation_impossible');
    }
  });

  it('cas-limites', () => {
    expect(code(() => proposerLot([], pers, H))).toBe('lot_vide');
    expect(code(() => proposerLot(lignes, pers, 'hier'))).toBe('horodatage_invalide');
    expect(code(() => proposerLot(lignes, pers, '2025-02-30T10:00:00Z'))).toBe('horodatage_invalide');
    expect(code(() => proposerLot([{ pieceId: 'x', montant: 1.5 as never }], pers, H))).toBe('montant_invalide');
    const altere = { ...proposerLot(lignes, ia, H), total: centimes(1) };
    expect(code(() => validerLot(altere, pers, H))).toBe('total_incoherent');
    expect(code(() => marquerPaye({ ...valide(), total: centimes(1) }, pers, H))).toBe('total_incoherent');
    expect(code(() => validerLot({ ...proposerLot(lignes, ia, H), lignes: [] }, pers, H))).toBe('lot_vide');
  });
});
