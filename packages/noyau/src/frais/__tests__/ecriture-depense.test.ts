import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { proposerEcritureDepense } from '../ecriture-depense.js';
import type { ResultatTvaFrais } from '../tva-frais.js';
import { ErreurFrais, type ComptesFrais, type Frais } from '../types.js';

const c = centimes;
const brut = (n: number) => n as Centimes;
const comptes: ComptesFrais = {
  chargeParNature: { repas_affaires: 'C-REPAS', parking: 'C-PARK' },
  chargeIk: 'C-IK',
  tvaDeductible: 'C-TVA',
  comptePersonne: 'C-PERS',
  banque: 'C-BQ',
};
const entete = { id: 'e1', journal: 'OD', date: '2026-03-15' };

function frais(p: Partial<Frais> = {}): Frais {
  return {
    id: 'f1', personneId: 'p-fictif', nature: 'depense', categorieDepense: 'repas_affaires', dateDepense: '2026-03-14',
    libelle: 'Repas fictif', montantTtc: c(6600), tva: c(600), payeur: 'personne', statut: 'propose',
    justificatifPerdu: false, partPersoTtc: c(0), version: 1, ...p,
  };
}
function tva(deductible: number, nonDeductible: number, code: ResultatTvaFrais['code'] = 'DEDUCTIBLE'): ResultatTvaFrais {
  return { code, deductible: brut(deductible), nonDeductible: brut(nonDeductible), bloquePreparationTva: false };
}
const lignes = (f: Frais, t: ResultatTvaFrais) =>
  proposerEcritureDepense(f, t, comptes, entete).lignes.map((l) => [l.compte, l.debit, l.credit]);
const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return e instanceof ErreurFrais ? e.code : 'autre'; }
  return 'aucune';
};

describe('proposerEcritureDepense', () => {
  it('nf01-repas-tva-deductible', () => {
    const e = proposerEcritureDepense(frais(), tva(600, 0), comptes, entete);
    expect(e.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['C-REPAS', 6000, 0], ['C-TVA', 600, 0], ['C-PERS', 0, 6600]]);
    expect(e.lignes[2]?.auxiliaire).toBe('p-fictif');
    expect(verifierEcriture(e).equilibree).toBe(true);
    expect(e.sansPieceMotif).toBeUndefined();
  });

  it('tva-non-deductible-dans-la-charge', () => {
    expect(lignes(frais(), tva(0, 600, 'NON_DEDUCTIBLE'))).toEqual([['C-REPAS', 6600, 0], ['C-PERS', 0, 6600]]);
    expect(lignes(frais(), tva(250, 350, 'PARTIELLE'))).toEqual([['C-REPAS', 6350, 0], ['C-TVA', 250, 0], ['C-PERS', 0, 6600]]);
  });

  it('tva-a-verifier-zero-deduit', () => {
    const t = { ...tva(0, 600, 'A_VERIFIER'), bloquePreparationTva: true };
    expect(lignes(frais(), t)).toEqual([['C-REPAS', 6600, 0], ['C-PERS', 0, 6600]]);
  });

  it('nf14-e7-perdu-une-ligne', () => {
    const f = frais({ justificatifPerdu: true, motifSansJustificatif: 'ticket perdu' });
    const e = proposerEcritureDepense(f, tva(0, 600, 'SANS_PIECE'), comptes, entete);
    expect(e.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['C-REPAS', 6600, 0], ['C-PERS', 0, 6600]]);
    expect(e.lignes[0]?.libelle).toBe('Repas fictif - ticket perdu');
    expect(e.sansPieceMotif).toBe('ticket perdu');
    expect(verifierEcriture(e).equilibree).toBe(true);
    // même si la TVA lue est déductible, E7 ne déduit rien
    expect(lignes(f, tva(600, 0))).toEqual([['C-REPAS', 6600, 0], ['C-PERS', 0, 6600]]);
  });

  it('e7-motif-obligatoire', () => {
    expect(code(() => proposerEcritureDepense(frais({ justificatifPerdu: true }), tva(0, 600), comptes, entete))).toBe('motif_obligatoire');
    expect(code(() => proposerEcritureDepense(frais({ justificatifPerdu: true, motifSansJustificatif: '  ' }), tva(0, 600), comptes, entete))).toBe('motif_obligatoire');
  });

  it('paye-societe-aucune-ecriture', () => {
    expect(code(() => proposerEcritureDepense(frais({ payeur: 'societe' }), tva(600, 0), comptes, entete))).toBe('frais_paye_societe');
    expect(code(() => proposerEcritureDepense(frais({ statut: 'exclu_paye_societe' }), tva(600, 0), comptes, entete))).toBe('frais_paye_societe');
  });

  it('payeur-a-confirmer-aucune-ecriture', () => {
    expect(code(() => proposerEcritureDepense(frais({ payeur: 'a_confirmer' }), tva(600, 0), comptes, entete))).toBe('entree_invalide');
    expect(code(() => proposerEcritureDepense(frais({ statut: 'brouillon' }), tva(600, 0), comptes, entete))).toBe('entree_invalide');
  });

  it('statut-propose-jamais-valide', () => {
    for (const s of ['propose', 'valide', 'a_completer'] as const) {
      expect(proposerEcritureDepense(frais({ statut: s }), tva(600, 0), comptes, entete).statut).toBe('propose');
    }
  });

  it('nature-sans-compte-refusee', () => {
    expect(code(() => proposerEcritureDepense(frais({ categorieDepense: 'inconnue' }), tva(600, 0), comptes, entete))).toBe('entree_invalide');
    expect(code(() => proposerEcritureDepense(Object.fromEntries(Object.entries(frais()).filter(([k]) => k !== 'categorieDepense')) as unknown as Frais, tva(600, 0), comptes, entete))).toBe('entree_invalide');
    expect(code(() => proposerEcritureDepense(frais({ categorieDepense: 'toString' }), tva(600, 0), comptes, entete))).toBe('entree_invalide');
  });

  it('part-perso-reduit-le-credit', () => {
    expect(lignes(frais({ partPersoTtc: c(1100) }), tva(500, 0))).toEqual([['C-REPAS', 5000, 0], ['C-TVA', 500, 0], ['C-PERS', 0, 5500]]);
  });

  it('entrees-invalides-refusees', () => {
    for (const p of [{ montantTtc: brut(Number.NaN) }, { montantTtc: brut(Number.POSITIVE_INFINITY) }, { montantTtc: brut(12.5) }, { montantTtc: c(-100) }, { montantTtc: c(0) }, { nature: 'trajet' as const }, { partPersoTtc: c(6600) }]) {
      expect(code(() => proposerEcritureDepense(frais(p), tva(600, 0), comptes, entete))).toBe('entree_invalide');
    }
    expect(code(() => proposerEcritureDepense(frais(), tva(6600, 1), comptes, entete))).toBe('entree_invalide');
    expect(code(() => proposerEcritureDepense(frais(), tva(Number.NaN, 0), comptes, entete))).toBe('entree_invalide');
  });

  it('tva-egale-au-ttc-pas-de-ligne-nulle', () => {
    expect(lignes(frais({ montantTtc: c(600) }), tva(600, 0))).toEqual([['C-TVA', 600, 0], ['C-PERS', 0, 600]]);
  });

  it('equilibre-boucle', () => {
    let graine = 12345;
    const suivant = (max: number) => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % (max + 1);
    };
    for (let i = 0; i < 500; i++) {
      const ttc = suivant(500000) + 1;
      const perso = suivant(1) === 0 ? 0 : suivant(ttc);
      const societe = ttc - perso;
      const total = suivant(societe);
      const ded = suivant(total);
      const perdu = suivant(4) === 0;
      const f = frais({ montantTtc: c(ttc), partPersoTtc: c(perso), justificatifPerdu: perdu, ...(perdu ? { motifSansJustificatif: 'perdu' } : {}) });
      const e = proposerEcritureDepense(f, tva(ded, total - ded), comptes, entete);
      const r = verifierEcriture(e);
      expect(r.equilibree).toBe(true);
      expect(r.totalCredit).toBe(societe);
    }
  });
});
