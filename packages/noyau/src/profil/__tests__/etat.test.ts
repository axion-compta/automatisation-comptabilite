import { describe, expect, it } from 'vitest';
import { ajouterValeur, confirmer, marquerJeNeSaisPas } from '../champs.js';
import type { NouvelleValeur } from '../champs.js';
import type { ChampProfil } from '../types.js';
import { CLES_OBLIGATOIRES, etatProfil, fecEtDeclarationsPermis, tvaCalculable } from '../etat.js';

const SOC = 'soc-exemple-1';
const AUTRE = 'soc-exemple-2';
const JOUR = '2026-01-10';
const APRES = '2026-02-01';
const LUI = { type: 'personne', id: 'personne-exemple' } as const;
const VALEURS: Record<string, unknown> = {
  denomination: 'Atelier Exemple',
  forme: 'SARL',
  siren: '123456782',
  exercice_debut: '2026-01-01',
  exercice_fin: '2026-12-31',
  regime_tva: 'reel_simplifie',
  regime_imposition: 'reel_simplifie',
  tenue: 'partie_double',
};
const TRIEES = [...CLES_OBLIGATOIRES].sort();

const propose = (h: readonly ChampProfil[], cle: string, valeur: unknown, jour = JOUR, societeId = SOC): readonly ChampProfil[] => {
  const nouvelle: NouvelleValeur = { societeId, cle, valeur, origine: 'saisie_personne', confiance: 'sur' };
  return ajouterValeur(h, nouvelle, jour);
};
const confirme = (h: readonly ChampProfil[], cle: string, valeur: unknown, jour = JOUR, societeId = SOC): readonly ChampProfil[] =>
  confirmer(propose(h, cle, valeur, jour, societeId), { societeId, cle, effetDebut: jour }, LUI, jour + 'T10:00:00Z');
const tout = (sauf: string[] = [], societeId = SOC): readonly ChampProfil[] =>
  Object.entries(VALEURS).reduce<readonly ChampProfil[]>((h, [cle, v]) => (sauf.includes(cle) ? h : confirme(h, cle, v, JOUR, societeId)), []);
const sansSiren = (h: readonly ChampProfil[]): readonly ChampProfil[] => confirme(h, 'en_formation', true);

describe('état du profil', () => {
  it('tout-confirme-complet', () => {
    const h = tout();
    expect(etatProfil(h, SOC, JOUR)).toMatchObject({ etat: 'complet', manquants: [], aConfirmer: [] });
    expect(tvaCalculable(h, SOC, JOUR)).toEqual({ calculable: true });
    expect(fecEtDeclarationsPermis(h, SOC, JOUR)).toEqual({ permis: true });
  });

  it('regime-tva-a-confirmer-p04', () => {
    const h = propose(tout(['regime_tva']), 'regime_tva', 'reel_simplifie');
    expect(etatProfil(h, SOC, JOUR)).toMatchObject({ etat: 'a_confirmer', manquants: [], aConfirmer: ['regime_tva'] });
    expect(tvaCalculable(h, SOC, JOUR)).toEqual({ calculable: false, motif: 'regime_tva_a_confirmer' });
    expect(Object.keys(tvaCalculable(h, SOC, JOUR)).sort()).toEqual(['calculable', 'motif']);
    expect(tvaCalculable(tout(['regime_tva']), SOC, JOUR)).toEqual({ calculable: false, motif: 'regime_tva_absent' });
  });

  it('obligatoire-vide-incomplet', () => {
    const vide: NouvelleValeur = { societeId: SOC, cle: 'denomination', valeur: null, origine: 'saisie_personne', confiance: 'a_verifier', statut: 'vide' };
    const h = ajouterValeur(tout(['denomination']), vide, JOUR);
    const e = etatProfil(h, SOC, JOUR);
    expect(e).toMatchObject({ etat: 'incomplet', manquants: ['denomination'], aConfirmer: [] });
    expect(e.motifs).toEqual({ denomination: 'vide' });
    expect(tvaCalculable(tout(['regime_tva']), SOC, JOUR).calculable).toBe(false);
    const aConfirmer = propose(tout(['forme', 'siren']), 'forme', 'SARL');
    expect(etatProfil(aConfirmer, SOC, JOUR)).toMatchObject({ etat: 'incomplet', manquants: ['siren'], aConfirmer: ['forme'] });
  });

  it('je-ne-sais-pas-incomplet', () => {
    const h = marquerJeNeSaisPas(tout(['regime_imposition']), { societeId: SOC, cle: 'regime_imposition' }, JOUR);
    const e = etatProfil(h, SOC, JOUR);
    expect(e).toMatchObject({ etat: 'incomplet', manquants: ['regime_imposition'] });
    expect(e.motifs).toEqual({ regime_imposition: 'je_ne_sais_pas' });
    const tva = marquerJeNeSaisPas(tout(['regime_tva']), { societeId: SOC, cle: 'regime_tva' }, JOUR);
    expect(tvaCalculable(tva, SOC, JOUR)).toEqual({ calculable: false, motif: 'regime_tva_absent' });
  });

  it('en-formation-sans-siren', () => {
    const h = sansSiren(tout(['siren']));
    expect(etatProfil(h, SOC, JOUR)).toMatchObject({ etat: 'complet', manquants: [] });
    expect(fecEtDeclarationsPermis(h, SOC, JOUR)).toEqual({ permis: false, motif: 'siren_absent' });
    const reste = sansSiren(propose(tout(['siren', 'tenue']), 'tenue', 'partie_double'));
    expect(etatProfil(reste, SOC, JOUR)).toMatchObject({ etat: 'a_confirmer', aConfirmer: ['tenue'] });
    const nonConfirme = propose(tout(['siren']), 'en_formation', true);
    expect(etatProfil(nonConfirme, SOC, JOUR)).toMatchObject({ etat: 'incomplet', manquants: ['siren'] });
    const faux = confirme(tout(['siren']), 'en_formation', false);
    expect(etatProfil(faux, SOC, JOUR)).toMatchObject({ etat: 'incomplet', manquants: ['siren'] });
    expect(fecEtDeclarationsPermis(propose(tout(['siren']), 'siren', VALEURS['siren']), SOC, JOUR)).toEqual({ permis: false, motif: 'siren_absent' });
  });

  it('etat-lu-a-la-date', () => {
    const h = confirme(tout(['tenue']), 'tenue', 'partie_double', APRES);
    expect(etatProfil(h, SOC, JOUR)).toMatchObject({ etat: 'incomplet', manquants: ['tenue'] });
    expect(etatProfil(h, SOC, APRES)).toMatchObject({ etat: 'complet', manquants: [] });
    const tva = confirme(tout(['regime_tva']), 'regime_tva', 'reel_normal', APRES);
    expect(tvaCalculable(tva, SOC, JOUR).calculable).toBe(false);
    expect(tvaCalculable(tva, SOC, APRES).calculable).toBe(true);
    const siren = confirme(tout(['siren']), 'siren', VALEURS['siren'], APRES);
    expect(fecEtDeclarationsPermis(siren, SOC, JOUR).permis).toBe(false);
    expect(fecEtDeclarationsPermis(siren, SOC, APRES).permis).toBe(true);
  });

  it('historique-vide-incomplet', () => {
    const e = etatProfil([], SOC, JOUR);
    expect(e.etat).toBe('incomplet');
    expect(e.manquants).toEqual(TRIEES);
    expect(e.aConfirmer).toEqual([]);
    expect(CLES_OBLIGATOIRES).toHaveLength(Object.keys(VALEURS).length);
    expect(tvaCalculable([], SOC, JOUR)).toEqual({ calculable: false, motif: 'regime_tva_absent' });
    expect(fecEtDeclarationsPermis([], SOC, JOUR)).toEqual({ permis: false, motif: 'siren_absent' });
  });

  it('societe-voisine-ignoree', () => {
    const h = tout([], AUTRE);
    expect(etatProfil(h, SOC, JOUR)).toMatchObject({ etat: 'incomplet', manquants: TRIEES });
    expect(etatProfil(h, AUTRE, JOUR).etat).toBe('complet');
    expect(tvaCalculable(h, SOC, JOUR).calculable).toBe(false);
    expect(fecEtDeclarationsPermis(h, SOC, JOUR).permis).toBe(false);
    const formation = confirme([], 'en_formation', true, JOUR, AUTRE);
    expect(etatProfil(formation, SOC, JOUR).manquants).toContain('siren');
  });
});
