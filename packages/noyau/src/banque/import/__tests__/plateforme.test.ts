import { describe, expect, it } from 'vitest';
import { detecterPlateforme } from '../plateforme.js';

const lignesFictives = [
  ['2026-03-02', 'Vente 1001', '120,00', '3,60', '116,40'],
  ['2026-03-03', 'Vente 1002', '80,00', '2,40', '77,60'],
];
const entetesPlateforme = ['Date', 'Description', 'Montant brut', 'Frais', 'Net'];

describe('plateforme', () => {
  it('colonnes-brut-frais-net-reconnues', () => {
    expect(detecterPlateforme(entetesPlateforme, lignesFictives).reconnu).toBe(true);
    // casse, accents et séparateurs sans importance
    expect(detecterPlateforme(['DATE', 'BRUT', 'Frais de transaction', 'Net versé'], lignesFictives).reconnu).toBe(true);
    // une colonne manquante : pas reconnu (chacune des trois est nécessaire)
    expect(detecterPlateforme(['Date', 'Brut', 'Frais'], lignesFictives).reconnu).toBe(false);
    expect(detecterPlateforme(['Date', 'Brut', 'Net'], lignesFictives).reconnu).toBe(false);
    expect(detecterPlateforme(['Date', 'Frais', 'Net'], lignesFictives).reconnu).toBe(false);
    // le mot doit être entier : « internet » n'est pas « net »
    expect(detecterPlateforme(['Date', 'Brut', 'Frais', 'Internet'], lignesFictives).reconnu).toBe(false);
    // en-têtes vides
    expect(detecterPlateforme([], []).reconnu).toBe(false);
  });

  it('refus-explique-avec-code', () => {
    const r = detecterPlateforme(entetesPlateforme, lignesFictives);
    if (!r.reconnu) throw new Error('attendu : reconnu');
    expect(r.refus.code).toBe('releve_plateforme');
    expect(r.refus.explication.length).toBeGreaterThan(20);
    expect(r.refus.marcheASuivre).toHaveLength(2);
    expect(r.refus.marcheASuivre[0]).toMatch(/relevé bancaire/);
    expect(r.refus.marcheASuivre[1]).toMatch(/pièce/);
  });

  it('aucune-ligne-importee', () => {
    const r = detecterPlateforme(entetesPlateforme, lignesFictives);
    if (!r.reconnu) throw new Error('attendu : reconnu');
    expect(r.lignesImportees).toEqual([]);
    expect(r.lignesIgnorees).toBe(2);
    const vide = detecterPlateforme(entetesPlateforme, []);
    if (!vide.reconnu) throw new Error('attendu : reconnu');
    expect(vide.lignesIgnorees).toBe(0);
  });

  it('releve-bancaire-ordinaire-non-touche', () => {
    const r = detecterPlateforme(['Date', 'Libellé', 'Débit', 'Crédit', 'Solde'], lignesFictives);
    expect(r).toEqual({ reconnu: false });
    expect(detecterPlateforme(['Date', 'Libellé', 'Montant'], lignesFictives)).toEqual({ reconnu: false });
  });
});
