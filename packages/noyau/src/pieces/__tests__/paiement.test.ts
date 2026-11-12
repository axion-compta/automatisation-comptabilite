import { describe, expect, it } from 'vitest';
import { estCasSur, type ContexteCasSur, type Proposition } from '../../validation/cas-sur.js';
import { completerParRapprochement, estProvisoire, paiementInitial, type LigneBanquePaiement, type PaiementPiece } from '../paiement.js';

const ctx: ContexteCasSur = { validationsParFournisseurEtCompte: new Map([['f1|606', 5]]), anomaliesOuvertes: new Set(), fournisseurHorsUnion: new Set() };
const params = { montantMaxCentimes: 50000, validationsMinFournisseur: 3 };
const sure: Proposition = { id: 'p1', nature: 'piece', confiance: 'sur', champsDouteux: 0, fournisseurId: 'f1', compteCharge: '606', montantTtcCentimes: 1200, tvaEnDoute: false };
const debit = (moyen: LigneBanquePaiement['moyen'], montantDebitCentimes = 1200): LigneBanquePaiement => ({ moyen, montantDebitCentimes });

describe('paiement d’une pièce', () => {
  it('lecture-seule-suppose', () => {
    for (const moyen of ['carte_societe', 'autre_carte', 'especes', 'virement', 'prelevement', 'solde_prepaye', 'mixte', 'inconnu'] as const) {
      const p = paiementInitial({ moyen });
      expect(p.certitude, moyen).toBe('suppose');
      expect(p.moyen, moyen).toBe(moyen);
    }
  });

  it('rapprochement-rend-prouve', () => {
    const p = completerParRapprochement(paiementInitial({ moyen: 'inconnu' }), debit('virement'));
    expect(p).toEqual({ payeur: 'societe', moyen: 'virement', certitude: 'prouve' });
    expect(estProvisoire(p)).toBe(false);
  });

  it('prouve-jamais-retrograde', () => {
    const prouve: PaiementPiece = { payeur: 'societe', moyen: 'carte_societe', certitude: 'prouve' };
    expect(completerParRapprochement(prouve, debit('prelevement'))).toEqual(prouve);
    expect(completerParRapprochement(prouve, debit('prelevement', 0))).toEqual(prouve);
    expect(estProvisoire(prouve)).toBe(false);
  });

  it('carte-autre-que-societe-payeur-dirigeant', () => {
    expect(paiementInitial({ moyen: 'autre_carte' }).payeur).toBe('dirigeant');
    expect(paiementInitial({ moyen: 'carte_societe' }).payeur).toBe('societe');
    expect(paiementInitial({ moyen: 'especes' }).payeur).toBe('inconnu');
    // Le payeur lu l'emporte sur le moyen.
    expect(paiementInitial({ moyen: 'autre_carte', payeur: 'tiers' }).payeur).toBe('tiers');
    // Un rapprochement ne change pas un payeur déjà connu.
    expect(completerParRapprochement(paiementInitial({ moyen: 'autre_carte' }), debit('virement')).payeur).toBe('dirigeant');
  });

  it('mixte-reste-suppose-sans-ligne', () => {
    const p = paiementInitial({ moyen: 'mixte' });
    expect(p.certitude).toBe('suppose');
    expect(completerParRapprochement(p, null)).toEqual(p);
    expect(estProvisoire(completerParRapprochement(p, null))).toBe(true);
    expect(completerParRapprochement(p, debit('carte_societe')).moyen).toBe('carte_societe');
  });

  it('sans-debit-provisoire', () => {
    const p = paiementInitial({ moyen: 'virement' });
    expect(estProvisoire(p)).toBe(true);
    // Une ligne sans débit (0, négatif, NaN) ne prouve rien.
    for (const m of [0, -1, Number.NaN, 1.5]) expect(estProvisoire(completerParRapprochement(p, debit('virement', m))), String(m)).toBe(true);
    // Frontière : un centime de débit suffit.
    expect(estProvisoire(completerParRapprochement(p, debit('virement', 1)))).toBe(false);
  });

  it('sans-debit-jamais-cas-sur', () => {
    const p = paiementInitial({ moyen: 'carte_societe' });
    const sans = estCasSur({ ...sure, paiementProuve: !estProvisoire(p) }, ctx, params);
    expect(sans.sur).toBe(false);
    expect(sans.raisons).toEqual(['paiement_non_prouve']);
    const avec = estCasSur({ ...sure, paiementProuve: !estProvisoire(completerParRapprochement(p, debit('carte_societe'))) }, ctx, params);
    expect(avec).toEqual({ sur: true, raisons: [] });
  });
});
