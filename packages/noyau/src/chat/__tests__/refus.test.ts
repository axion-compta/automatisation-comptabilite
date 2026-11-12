import { describe, expect, it } from 'vitest';
import { refusFixe } from '../refus.js';
import type { DemandeRefus } from '../refus.js';

const base: DemandeRefus = { outil: 'outil_test', niveau: 'B', niveauIOuvert: false };
const avec = (p: Partial<DemandeRefus>): DemandeRefus => ({ ...base, ...p });

describe('refusFixe', () => {
  it('permis-si-rien', () => {
    expect(refusFixe(base)).toBeNull();
    expect(refusFixe(avec({ niveau: 'I', niveauIOuvert: true }))).toBeNull();
  });
  it('ecriture-validee-contre-passation', () => {
    expect(refusFixe(avec({ cibleValidee: true }))).toEqual({ motif: 'ecriture_validee', alternative: 'contre_passation' });
  });
  it('periode-cloturee-periode-ouverte', () => {
    expect(refusFixe(avec({ periodeCloturee: true }))).toEqual({ motif: 'periode_cloturee', alternative: 'periode_ouverte' });
  });
  it('niveau-i-ouvre-l-ecran', () => {
    expect(refusFixe(avec({ niveau: 'I' }))).toEqual({ motif: 'geste_irreversible_requis', alternative: 'ouvrir_ecran' });
    for (const n of ['L', 'B', 'M'] as const) expect(refusFixe(avec({ niveau: n }))).toBeNull();
  });
  it('suppression-definitive-refusee', () => {
    expect(refusFixe(avec({ suppressionDefinitive: true }))).toEqual({ motif: 'suppression_definitive', alternative: 'aucune' });
  });
  it('facture-renvoie-vers-l-outil', () => {
    expect(refusFixe(avec({ creeFacture: true }))).toEqual({ motif: 'facture_hors_produit', alternative: 'outil_facturation' });
  });
  it('consignes-confidentielles', () => {
    expect(refusFixe(avec({ demandeConsignes: true }))).toEqual({ motif: 'consignes_confidentielles', alternative: 'aucune' });
  });
  it('autre-societe', () => {
    expect(refusFixe(avec({ autreSociete: true }))).toEqual({ motif: 'autre_societe', alternative: 'aucune' });
  });
  it('priorite-fixe', () => {
    const tout: Partial<DemandeRefus> = {
      niveau: 'I', autreSociete: true, demandeConsignes: true, suppressionDefinitive: true,
      creeFacture: true, cibleValidee: true, periodeCloturee: true,
    };
    const ordre: (keyof DemandeRefus)[] = [
      'autreSociete', 'demandeConsignes', 'suppressionDefinitive', 'creeFacture', 'cibleValidee', 'periodeCloturee',
    ];
    const motifs = ['autre_societe', 'consignes_confidentielles', 'suppression_definitive', 'facture_hors_produit',
      'ecriture_validee', 'periode_cloturee', 'geste_irreversible_requis'];
    const courant = { ...tout };
    motifs.forEach((motif, i) => {
      expect(refusFixe(avec(courant))?.motif).toBe(motif);
      const cle = ordre[i];
      if (cle !== undefined) delete courant[cle as keyof typeof courant];
    });
  });
  it('drapeaux-absents-ou-faux-equivalents', () => {
    const faux = avec({
      cibleValidee: false, periodeCloturee: false, suppressionDefinitive: false,
      creeFacture: false, demandeConsignes: false, autreSociete: false,
    });
    expect(refusFixe(faux)).toEqual(refusFixe(base));
    expect(refusFixe(avec({ ...faux, niveau: 'I' }))).toEqual(refusFixe(avec({ niveau: 'I' })));
  });
});

describe('refus acte juridique', () => {
  it('chat-redige-acte-refus-avec-renvoi', () => {
    expect(refusFixe(avec({ demandeActeJuridique: true }))).toEqual({ motif: 'acte_juridique', alternative: 'professionnel_choisi' });
    expect(refusFixe(avec({ demandeActeJuridique: false }))).toBeNull();
    // les refus de rang supérieur (autre société, consignes, suppression, facture) restent prioritaires
    expect(refusFixe(avec({ demandeActeJuridique: true, creeFacture: true }))?.motif).toBe('facture_hors_produit');
    expect(refusFixe(avec({ demandeActeJuridique: true, cibleValidee: true }))?.motif).toBe('acte_juridique');
  });
  it('refus-existants-inchanges', () => {
    const tout = { autreSociete: true, demandeConsignes: true, suppressionDefinitive: true, creeFacture: true, cibleValidee: true, periodeCloturee: true };
    expect(refusFixe(avec({ ...tout, demandeActeJuridique: false }))?.motif).toBe('autre_societe');
    expect(refusFixe(avec({ cibleValidee: true, periodeCloturee: true }))).toEqual({ motif: 'ecriture_validee', alternative: 'contre_passation' });
    expect(refusFixe(avec({ niveau: 'I' }))).toEqual({ motif: 'geste_irreversible_requis', alternative: 'ouvrir_ecran' });
  });
});
