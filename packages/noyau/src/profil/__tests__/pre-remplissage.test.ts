import { describe, expect, it } from 'vitest';
import { preRemplir, extraitEnSource } from '../pre-remplissage.js';
import type { Extrait } from '../pre-remplissage.js';

const ZONE = { x: 0.1, y: 0.2, largeur: 0.5, hauteur: 0.1 };
const ext = (plus: Partial<Extrait> = {}): Extrait => ({
  cle: 'forme', valeur: 'SARL', piece: 'kbis-fictif.pdf', page: 1, zone: ZONE, confiance: 'sur', dateSource: '2026-03-01', ...plus,
});
const reglage = { societeId: 'soc-fictive', dateDuJour: '2026-06-01', fraicheurMois: 12 };

describe('pré-remplissage depuis les pièces', () => {
  it('extrait-devient-source', () => {
    const s = extraitEnSource(ext({ valeur: '  SARL ' }));
    expect(s).toMatchObject({ origine: 'document', valeur: 'SARL', confiance: 'sur', dateSource: '2026-03-01' });
    expect(s?.ref).toContain('kbis-fictif.pdf');
    expect(extraitEnSource(ext({ confiance: 'douteux' }))?.confiance).toBe('douteux');
  });

  it('lien-page-et-zone-garde', () => {
    const r = preRemplir([ext({ page: 3, zone: { x: 0.25, y: 0.5, largeur: 0.5, hauteur: 0.25 } })], reglage);
    expect(r.champs).toHaveLength(1);
    expect(r.champs[0]?.liens).toEqual([{ piece: 'kbis-fictif.pdf', page: 3, zone: { x: 0.25, y: 0.5, largeur: 0.5, hauteur: 0.25 } }]);
    expect(r.champs[0]?.nouvelle.sourceRef).toBe(extraitEnSource(ext({ page: 3, zone: { x: 0.25, y: 0.5, largeur: 0.5, hauteur: 0.25 } }))?.ref);
  });

  it('deux-sources-concordantes-confirmees', () => {
    const r = preRemplir([ext(), ext({ piece: 'statuts-fictifs.pdf', page: 2, valeur: 'sarl' })], reglage);
    const c = r.champs[0];
    expect(c?.decision).toBe('confirme_sans_question');
    expect(c?.nouvelle.origine).toBe('document');
    expect(c?.nouvelle.valeur).toBe('SARL');
    expect(c?.liens).toHaveLength(2);
    expect(c?.nouvelle.statut).toBe('a_confirmer');
  });

  it('une-seule-source-a-confirmer', () => {
    const c = preRemplir([ext()], reglage).champs[0];
    expect(c?.decision).toBe('a_confirmer');
    expect(c?.evaluation.motifs).toEqual(['une_seule_source']);
    expect(c?.nouvelle.origine).toBe('proposition_ia');
    expect(c?.nouvelle.statut).toBe('a_confirmer');
  });

  it('contradiction-deux-valeurs', () => {
    const c = preRemplir([ext(), ext({ valeur: 'SAS', piece: 'statuts-fictifs.pdf' })], reglage).champs[0];
    expect(c?.decision).toBe('a_confirmer');
    expect(c?.evaluation.motifs).toEqual(['contradiction']);
    expect(c?.candidats).toEqual(['SARL', 'SAS']);
    expect(c?.nouvelle.valeur).toBeNull();
    expect(c?.nouvelle.origine).toBe('proposition_ia');
  });

  it('confiance-douteuse-a-confirmer', () => {
    for (const confiance of ['a_verifier', 'douteux'] as const) {
      const c = preRemplir([ext(), ext({ piece: 'avis-fictif.pdf', confiance })], reglage).champs[0];
      expect(c?.decision).toBe('a_confirmer');
      expect(c?.evaluation.motifs).toEqual(['confiance_insuffisante']);
      expect(c?.nouvelle.confiance).toBe(confiance);
    }
  });

  it('extrait-incomplet-ignore', () => {
    const mauvais: [Partial<Extrait>, string][] = [
      [{ cle: '' }, 'cle_vide'],
      [{ cle: '   ' }, 'cle_vide'],
      [{ valeur: ' ' }, 'valeur_vide'],
      [{ piece: '' }, 'piece_vide'],
      [{ page: undefined }, 'page_absente'],
      [{ page: 0 }, 'page_absente'],
      [{ page: 1.5 }, 'page_absente'],
      [{ page: Number.NaN }, 'page_absente'],
      [{ page: Infinity }, 'page_absente'],
      [{ zone: undefined }, 'zone_hors_page'],
      [{ zone: { ...ZONE, x: -0.1 } }, 'zone_hors_page'],
      [{ zone: { ...ZONE, x: 0.6 } }, 'zone_hors_page'],
      [{ zone: { ...ZONE, y: 0.95 } }, 'zone_hors_page'],
      [{ zone: { ...ZONE, largeur: 0 } }, 'zone_hors_page'],
      [{ zone: { ...ZONE, hauteur: Number.NaN } }, 'zone_hors_page'],
      [{ zone: { ...ZONE, largeur: Infinity } }, 'zone_hors_page'],
      [{ confiance: 'certain' as never }, 'confiance_inconnue'],
      [{ dateSource: '2026-13-01' }, 'date_invalide'],
      [{ dateSource: '2027-01-01' }, 'date_future'],
      [{ calcule: true }, 'montant_calcule'],
    ];
    for (const [plus, motif] of mauvais) {
      const r = preRemplir([ext(plus)], reglage);
      expect(r.champs, motif).toEqual([]);
      expect(r.ignores, motif).toEqual([{ index: 0, motif }]);
      expect(extraitEnSource(ext(plus), reglage.dateDuJour), motif).toBeNull();
    }
    const m = preRemplir([ext({ cle: '' }), ext(), ext({ page: 0 })], reglage);
    expect(m.champs).toHaveLength(1);
    expect(m.ignores.map((i) => i.index)).toEqual([0, 2]);
  });

  it('bord-zone-pleine-page-acceptee', () => {
    const r = preRemplir([ext({ zone: { x: 0, y: 0, largeur: 1, hauteur: 1 } })], reglage);
    expect(r.champs).toHaveLength(1);
    expect(r.ignores).toEqual([]);
  });

  it('jamais-confirme-et-un-champ-par-cle', () => {
    const r = preRemplir([ext(), ext({ cle: 'tva', valeur: 'reel_normal' }), ext({ piece: 'b.pdf' })], reglage);
    expect(r.champs.map((c) => c.nouvelle.cle)).toEqual(['forme', 'tva']);
    for (const c of r.champs) {
      expect(c.nouvelle.statut).toBe('a_confirmer');
      expect(c.nouvelle.societeId).toBe('soc-fictive');
    }
  });
});
