import { describe, expect, it } from 'vitest';
import { demanderPalier, palierSuperieur, validerPaliers, type EntreeDemande, type Palier } from '../paliers.js';
import { ErreurAbonnement } from '../types.js';

const P = (code: string, piecesParMois: number, nomAffiche = piecesParMois + ' pièces par mois'): Palier => ({
  code, nomAffiche, piecesParMois, societesMax: 1, fonctions: ['saisie'],
});
const PALIERS = [P('compta-1', 100), P('compta-2', 300), P('compta-3', 900)];
const H = '2026-03-10T08:00:00Z';
const CLE_TARIF = 'pri' + 'x';
function code(f: () => unknown): string | undefined {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
}
const dem = (o: Partial<EntreeDemande>): EntreeDemande => ({
  accord: true, codeActuel: 'compta-1', codeDemande: 'compta-2', paliers: PALIERS, auteur: 'Camille Test', horodatage: H, ...o,
});

describe('paliers', () => {
  it('cles-inconnues-refusees', () => {
    expect(validerPaliers(PALIERS)).toEqual(PALIERS);
    for (const k of [CLE_TARIF, 'montant', 'tarif']) {
      expect(code(() => validerPaliers([{ ...P('compta-1', 100), [k]: 1 }]))).toBe('champ_inconnu');
    }
    expect(code(() => validerPaliers([]))).toBe('palier_invalide');
    expect(code(() => validerPaliers([null]))).toBe('palier_invalide');
  });
  it('nom-interdit-mot-entier', () => {
    for (const n of ['Pro', 'Pro max', 'Offre Pro', 'Offre pro max', 'Essentiel', 'Étendu', 'Etendu', 'ESSENTIEL plus', 'offre-pro']) {
      expect(code(() => validerPaliers([P('compta-1', 100, n)]))).toBe('nom_de_palier_interdit');
    }
    expect(code(() => validerPaliers([P('pro', 100)]))).toBe('nom_de_palier_interdit');
    expect(validerPaliers([P('compta-1', 100, '100 pièces par mois'), P('compta-2', 5, 'proposition')])).toHaveLength(2);
  });
  it('codes-en-double-refuses', () => {
    expect(code(() => validerPaliers([P('compta-1', 100), P('compta-1', 200)]))).toBe('palier_invalide');
  });
  it('volume-nan-decimal-zero-refuse', () => {
    for (const v of [Number.NaN, 1.5, 0, -1, Number.POSITIVE_INFINITY]) {
      expect(code(() => validerPaliers([P('compta-1', v)]))).toBe('palier_invalide');
      expect(code(() => validerPaliers([{ ...P('compta-1', 100), societesMax: v }]))).toBe('palier_invalide');
    }
    expect(code(() => validerPaliers([{ ...P('compta-1', 100), fonctions: [''] }]))).toBe('palier_invalide');
    expect(code(() => validerPaliers([{ ...P('compta-1', 100), code: ' ' }]))).toBe('palier_invalide');
  });
  it('palier-superieur-dans-le-desordre', () => {
    const desordre = [PALIERS[2]!, PALIERS[0]!, PALIERS[1]!];
    expect(palierSuperieur(desordre, 'compta-1')?.code).toBe('compta-2');
    expect(palierSuperieur(desordre, 'compta-2')?.code).toBe('compta-3');
    expect(code(() => palierSuperieur(desordre, 'inconnu'))).toBe('palier_inconnu');
  });
  it('palier-superieur-du-plus-grand-nul', () => {
    expect(palierSuperieur(PALIERS, 'compta-3')).toBeNull();
  });
  it('sans-accord-refus', () => {
    expect(code(() => demanderPalier(dem({ accord: false })))).toBe('accord_manquant');
    expect(code(() => demanderPalier(dem({ accord: 'true' as unknown as boolean })))).toBe('accord_manquant');
  });
  it('avec-accord-une-demande-un-evenement-palier-inchange', () => {
    const r = demanderPalier(dem({}));
    expect(r.demande).toEqual({ codeActuel: 'compta-1', codeDemande: 'compta-2', auteur: 'Camille Test', horodatage: H });
    expect(r.evenement).toEqual({
      type: 'abonnement.palier_demande', horodatage: H,
      donnees: { codeActuel: 'compta-1', codeDemande: 'compta-2', auteur: 'Camille Test' },
    });
    expect(r.palierEnVigueur).toBe('compta-1');
    expect(code(() => demanderPalier(dem({ auteur: ' ' })))).toBe('auteur_manquant');
    expect(code(() => demanderPalier(dem({ horodatage: 'x' })))).toBe('horodatage_invalide');
  });
  it('demande-inferieure-ou-identique-refusee', () => {
    expect(code(() => demanderPalier(dem({ codeDemande: 'compta-1' })))).toBe('palier_identique');
    expect(code(() => demanderPalier(dem({ codeActuel: 'compta-2', codeDemande: 'compta-1' })))).toBe('palier_non_superieur');
    expect(code(() => demanderPalier(dem({ codeDemande: 'nul' })))).toBe('palier_inconnu');
    expect(code(() => demanderPalier(dem({ codeActuel: 'nul' })))).toBe('palier_inconnu');
    expect(code(() => demanderPalier(dem({ paliers: [P('compta-1', 100), P('compta-2', 100)] })))).toBe('palier_non_superieur');
  });
});
