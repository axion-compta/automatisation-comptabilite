import { describe, expect, it } from 'vitest';
import { appliquerProfil, ErreurProfil, verifierProfil } from '../profil.js';
import type { LigneBrute, ProfilImport } from '../profil.js';

const base: ProfilImport = {
  colonnes: { date: 0, libelle: [1], soldeCourant: 3 }, signe: { type: 'suffixe_moins', colonne: '2' },
  format: { decimal: ',', milliers: '.' }, formatDate: 'JJ/MM/AAAA', deviseParDefaut: 'EUR', ligneEntete: 0,
};
const sansSolde: ProfilImport = { ...base, colonnes: { date: 0, libelle: [1] } };
const L = (rang: number, ...cellules: string[]): LigneBrute => ({ rang, cellules });
const refuse = (p: ProfilImport, n = 5): boolean => {
  try { verifierProfil(p, n); } catch (e) { return e instanceof ErreurProfil && e.code === 'profil_invalide'; }
  return false;
};
const avec = (c: Partial<ProfilImport['colonnes']>, extra: Partial<ProfilImport> = {}): ProfilImport =>
  ({ ...base, colonnes: { ...base.colonnes, ...c }, ...extra });

describe('profil d\'import', () => {
  it('t02-2-ligne-sept', () => {
    const lignes = Array.from({ length: 140 }, (_, i) => L(i + 1, '05/03/2026', `ATELIER ${i}`, i === 6 ? '1.234,56-' : '10,00', ''));
    const r = appliquerProfil(lignes, sansSolde);
    expect(r.compteurs).toEqual({ lues: 140, importees: 140, rejetees: 0 });
    expect(r.lignes).toHaveLength(140);
    expect(r.lignes[6]).toMatchObject({ rang: 7, montant: -123456, dateOperation: '2026-03-05', devise: 'EUR', etatTechnique: 'completee' });
    expect(r.lignes[0]?.montant).toBe(1000);
  });
  it('rejet-numerote-jamais-zero', () => {
    const r = appliquerProfil([
      L(1, '05/03/2026', 'A', '1,00'), L(2, '31/02/2026', 'B', '2,00'), L(3, '06/03/2026', 'C', 'abc'),
      L(4, '06/03/2026', 'D', 'NaN'), L(5, '06/03/2026', 'E', 'Infinity'), L(6, '06/03/2026', 'F', ''),
    ], sansSolde);
    expect(r.rejets).toEqual([
      { rang: 2, motif: 'date_invalide' }, { rang: 3, motif: 'non_numerique' }, { rang: 4, motif: 'non_numerique' },
      { rang: 5, motif: 'non_numerique' }, { rang: 6, motif: 'vide' },
    ]);
    expect(r.lignes.map((l) => l.rang)).toEqual([1]);
  });
  it('compteurs-coherents', () => {
    const r = appliquerProfil([L(1, '05/03/2026', 'A', '1,00'), L(2, 'x', 'B', '2,00'), L(3, '05/03/2026', 'C', '3,00')], sansSolde);
    expect(r.compteurs).toEqual({ lues: 3, importees: 2, rejetees: 1 });
    expect(r.compteurs.importees).toBe(r.lignes.length);
    const vide = appliquerProfil([], base);
    expect(vide).toMatchObject({ lignes: [], rejets: [], compteurs: { lues: 0, importees: 0, rejetees: 0 }, chainage: 'IMPOSSIBLE' });
    expect(appliquerProfil([], sansSolde).chainage).toBe('ABSENT');
    expect(vide.periodeDebut).toBeUndefined();
    const toutes = appliquerProfil([L(1, 'x', 'A', '1,00'), L(2, 'y', 'B', '1,00')], sansSolde);
    expect(toutes.compteurs).toEqual({ lues: 2, importees: 0, rejetees: 2 });
    expect(toutes.lignes).toEqual([]);
  });
  it('solde-courant-donne-ouverture-et-cloture', () => {
    const r = appliquerProfil([L(2, '07/03/2026', 'B', '5,00', '95,00'), L(1, '06/03/2026', 'A', '10,00-', '90,00')], base);
    expect(r.lignes.map((l) => l.rang)).toEqual([1, 2]);
    expect([r.soldeOuverture, r.soldeCloture]).toEqual([10000, 9500]);
    expect([r.periodeDebut, r.periodeFin]).toEqual(['2026-03-06', '2026-03-07']);
    expect(r.chainage).toBe('OK');
    expect(r.signaux).toEqual([]);
  });
  it('chainage-incoherent-signale', () => {
    const r = appliquerProfil([L(1, '06/03/2026', 'A', '10,00-', '90,00'), L(2, '07/03/2026', 'B', '5,00', '85,00'), L(3, '08/03/2026', 'C', '1,00', '86,00')], base);
    expect(r.signaux).toEqual([{ code: 'chainage_incoherent', rang: 2 }]);
    expect(r.chainage).toBe('INCOHERENT');
    expect(r.lignes.map((l) => l.montant)).toEqual([-1000, 500, 100]);
  });
  it('solde-vide-chainage-impossible', () => {
    const r = appliquerProfil([L(1, '06/03/2026', 'A', '10,00-', '90,00'), L(2, '07/03/2026', 'B', '5,00', ''), L(3, '08/03/2026', 'C', '1,00', 'NaN')], base);
    expect(r.chainage).toBe('IMPOSSIBLE');
    expect(r.signaux).toEqual([]);
    expect(r.soldeCloture).toBeUndefined();
    expect(r.soldeOuverture).toBe(10000);
  });
  it('total-egal', () => {
    const r = appliquerProfil([L(1, '06/03/2026', 'A', '10,00-'), L(2, '07/03/2026', 'B', '4,00')], sansSolde, { cellules: ['', 'Total', '6,00-'] });
    expect(r.total).toEqual({ etat: 'egal' });
    expect(appliquerProfil([], sansSolde).total).toBeUndefined();
  });
  it('total-different-ecart', () => {
    const lignes = [L(1, '06/03/2026', 'A', '10,00-'), L(2, '07/03/2026', 'B', '4,00')];
    expect(appliquerProfil(lignes, sansSolde, { cellules: ['', 'Total', '5,00-'] }).total).toEqual({ etat: 'different', ecart: 100 });
    expect(appliquerProfil(lignes, sansSolde, { cellules: ['', 'Total', '7,00-'] }).total).toEqual({ etat: 'different', ecart: -100 });
    expect(appliquerProfil(lignes, sansSolde, { cellules: ['', 'Total', 'abc'] }).total).toEqual({ etat: 'illisible' });
  });
  it('profil-invalide-refuse', () => {
    expect(refuse(base, 4)).toBe(false);
    expect(refuse(avec({ date: 4 }), 4)).toBe(true);
    expect(refuse(avec({ date: -1 }))).toBe(true);
    expect(refuse(avec({ date: 1.5 }))).toBe(true);
    expect(refuse(avec({ date: Number.NaN }))).toBe(true);
    expect(refuse(avec({ libelle: [1, 1] }))).toBe(true);
    expect(refuse(avec({ libelle: [] }))).toBe(true);
    expect(refuse(avec({ reference: 0 }))).toBe(true);
    expect(refuse(avec({}, { signe: { type: 'suffixe_moins', colonne: '9' } }))).toBe(true);
    expect(refuse(avec({}, { signe: { type: 'suffixe_moins', colonne: 'x' } }))).toBe(true);
    expect(refuse(avec({}, { signe: { type: 'suffixe_moins', colonne: '1' } }))).toBe(true);
    expect(refuse(avec({}, { ligneEntete: -1 }))).toBe(true);
    expect(refuse(base, 0)).toBe(true);
    expect(() => appliquerProfil([L(1, '06/03/2026')], base)).toThrow(ErreurProfil);
  });
  it('libelle-sur-deux-colonnes-joint', () => {
    const p = avec({ libelle: [1, 4], reference: 5, dateValeur: 6, devise: 7 });
    const r = appliquerProfil([L(1, '06/03/2026', ' CARTE ', '10,00-', '', 'ATELIER  ', 'R1', '07/03/2026', 'USD'), L(2, '06/03/2026', 'X', '1,00', '', '', '', '', '')], p);
    expect(r.lignes[0]).toMatchObject({ libelleBrut: 'CARTE ATELIER', reference: 'R1', dateValeur: '2026-03-07', devise: 'USD' });
    expect(r.lignes[1]).toMatchObject({ libelleBrut: 'X', devise: 'EUR' });
    expect(r.lignes[1]).not.toHaveProperty('reference');
    expect(r.lignes[1]).not.toHaveProperty('dateValeur');
    expect(appliquerProfil([L(1, '06/03/2026', 'X', '1,00', '', '', '', '99/99/2026', '')], p).rejets).toEqual([{ rang: 1, motif: 'date_invalide' }]);
  });
});
