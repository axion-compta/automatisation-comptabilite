import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import {
  destinataireEstSociete,
  normaliserNom,
  regleCCK08,
  regleCCK10,
  type PieceDestinataire,
  type Societe,
  type TiersControle,
} from '../destinataire.js';

// SIREN fictifs construits à l'exécution (liste blanche : chiffres répétés).
const SIREN_A = '1'.repeat(9);
const SIREN_B = '2'.repeat(9);
const FORMES = ['SARL', 'S.A.S.', 'sas'];
const societe: Societe = { nom: 'Atelier Fictif SARL', siren: SIREN_A, nomsConnus: ['Lemoine Rénovation'] };

const c = centimes;
function piece(sens: 'achat' | 'vente', tiers?: TiersControle, partie: 'destinataire' | 'emetteur' = 'destinataire', ht = 20000): PieceDestinataire {
  const base: PieceDestinataire = {
    id: 'p1',
    sens,
    date: '2026-10-01',
    lignes: [{ taux: 2000, nature: 'x', ht: c(ht), tva: c(ht / 5), ttc: c(ht + ht / 5) }],
    totaux: { ht: c(ht), tva: c(ht / 5), ttc: c(ht + ht / 5) },
    mentions: [],
  };
  return tiers === undefined ? base : { ...base, [partie]: tiers };
}
const k08 = (p: PieceDestinataire) => regleCCK08.evaluer({ piece: p, societe, formes: FORMES });
const k10 = (p: PieceDestinataire) => regleCCK10.evaluer({ piece: p, societe, formes: FORMES });

describe('CC-K08 et CC-K10 destinataire', () => {
  it('CT-08', () => {
    const p = piece('achat', { nom: 'Claire Lemoine' });
    expect(k08(p)).toEqual({ resultat: 'ALERTE', valeur: 'NON_DEDUCTIBLE_NOM' });
    expect(regleCCK08).toMatchObject({ id: 'CC-K08', version: 1, gravite: 'M', bloque: [], actif: true });
    expect(regleCCK08.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    const traces = executerControles([regleCCK08], [{ type: 'piece', id: 'p1', donnee: { piece: p, societe, formes: FORMES } }], 'arrivee', 't');
    expect(traces[0]?.resultat).toBe('ALERTE');
    expect(k08(piece('achat', { nom: 'Atelier Fictif', siren: SIREN_A }))).toEqual({ resultat: 'OK' });
  });

  it('CT-10', () => {
    const p = piece('vente', { nom: 'Claire Lemoine', personne_physique: true }, 'destinataire', 45000);
    expect(k10(p)).toEqual({ resultat: 'ALERTE' });
    expect(regleCCK10).toMatchObject({ id: 'CC-K10', version: 1, gravite: 'm', bloque: [], actif: true });
    expect(k10(piece('vente', { nom: 'Client', siren: SIREN_B }))).toEqual({ resultat: 'OK' });
    expect(k10(piece('vente', { nom: 'Client', siren: SIREN_B, personne_physique: true }))).toEqual({ resultat: 'ALERTE' });
    expect(k10(piece('vente', { nom: 'Client' }))).toEqual({ resultat: 'ALERTE' });
    expect(k10(piece('vente', { nom: 'Client', siren: '' }))).toEqual({ resultat: 'ALERTE' });
    expect(k10(piece('vente'))).toEqual({ resultat: 'ALERTE' });
  });

  it('siren-egal-l-emporte-sur-le-nom', () => {
    expect(destinataireEstSociete(piece('achat', { nom: 'Autre Nom', siren: SIREN_A }), societe, FORMES)).toBe('oui');
    expect(destinataireEstSociete(piece('achat', { nom: 'Atelier Fictif', siren: SIREN_B }), societe, FORMES)).toBe('non');
    expect(destinataireEstSociete(piece('achat', { nom: 'Atelier Fictif', siren: '' }), societe, FORMES)).toBe('oui');
  });

  it('nom-normalise-reconnu', () => {
    expect(normaliserNom('LEMOINE  Rénovation', FORMES)).toBe('lemoine renovation');
    expect(normaliserNom('Atelier, S.A.S.  Fictif', FORMES)).toBe('atelier fictif');
    expect(normaliserNom('Atelier SARL', [])).toBe('atelier sarl');
    expect(normaliserNom('', FORMES)).toBe('');
    expect(destinataireEstSociete(piece('achat', { nom: 'LEMOINE  Rénovation' }), societe, FORMES)).toBe('oui');
    expect(destinataireEstSociete(piece('achat', { nom: 'atelier fictif sas' }), societe, FORMES)).toBe('oui');
    expect(destinataireEstSociete(piece('achat', { nom: 'Lemoine' }), societe, FORMES)).toBe('non');
  });

  it('destinataire-absent-a-verifier', () => {
    expect(destinataireEstSociete(piece('achat'), societe, FORMES)).toBe('inconnu');
    expect(k08(piece('achat'))).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
    // Un émetteur sur un achat ne compte pas.
    expect(k08(piece('achat', { nom: 'Atelier Fictif' }, 'emetteur'))).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
  });

  it('vente-emetteur-autre', () => {
    expect(k08(piece('vente', { nom: 'Boutique Autre', siren: SIREN_B }, 'emetteur'))).toEqual({ resultat: 'ALERTE', valeur: 'NON_DEDUCTIBLE_NOM' });
    expect(k08(piece('vente', { nom: 'Atelier Fictif', siren: SIREN_A }, 'emetteur'))).toEqual({ resultat: 'OK' });
    // Le destinataire d'une vente est le client : il n'entre pas dans K08.
    expect(k08(piece('vente', { nom: 'Client', siren: SIREN_B }))).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
  });

  it('achat-non-applicable-pour-k10', () => {
    expect(k10(piece('achat', { nom: 'Claire Lemoine', personne_physique: true }))).toEqual({ resultat: 'NON_APPLICABLE' });
  });

  it('siren-fictif-seulement', () => {
    for (const s of [SIREN_A, SIREN_B]) expect(s).toMatch(/^(\d)\1{8}$/);
  });
});
