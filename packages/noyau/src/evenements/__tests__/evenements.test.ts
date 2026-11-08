import { describe, expect, it } from 'vitest';
import { creerEnveloppe, ErreurEvenement } from '../enveloppe.js';
import { creerBoiteEnvoiMemoire, creerFauxPublieur } from '../memoire.js';
import { relayer } from '../publication.js';
import { brut, suitePublication } from './suite-publication.js';

suitePublication('boîte d’envoi en mémoire', () => {
  const b = creerBoiteEnvoiMemoire();
  return { unite: b, stock: b };
});

const code = (b: unknown): string | undefined => {
  try {
    creerEnveloppe(b);
  } catch (e) {
    return e instanceof ErreurEvenement ? e.code : 'autre';
  }
  return undefined;
};
const avecCharge = (charge: Record<string, unknown>) => brut('a', { charge });

describe('enveloppe', () => {
  it('enveloppe-valide-acceptee', () => {
    const e = creerEnveloppe(brut('a', { exercice_id: 'exo-1' }));
    expect(e.type).toBe('compta.frais.propose');
    expect(Object.isFrozen(e) && Object.isFrozen(e.charge) && Object.isFrozen(e.acteur)).toBe(true);
    expect(code(brut('a', { type: 'compta.a.b.c' }))).toBeUndefined();
  });
  it('type-sans-prefixe-compta-refuse', () => {
    for (const t of ['frais.propose', 'compta.frais', 'compta.Frais.x', 'compta..x', 'compta.a.b-c']) expect(code(brut('a', { type: t }))).toBe('type_invalide');
    expect(code(brut('a', { type: 3 }))).toBe('champ_manquant');
  });
  it('horodatage-avec-decalage-refuse', () => {
    for (const h of ['2026-11-08T10:00:00+01:00', '2026-11-08T10:00:00', 'pasunedateZ']) expect(code(brut('a', { horodatage: h }))).toBe('horodatage_non_utc');
  });
  it('montant-nombre-refuse', () => {
    for (const n of [120, 0, Number.NaN, Number.POSITIVE_INFINITY]) expect(code(avecCharge({ quantite: n }))).toBe('montant_interdit');
  });
  it('montant-en-texte-refuse', () => {
    for (const t of ['120', '120,50', '-3.5']) expect(code(avecCharge({ valeur: t }))).toBe('montant_interdit');
    expect(code(avecCharge({ valeur: 'statut 12' }))).toBeUndefined();
  });
  it('annee-a-quatre-chiffres-acceptee', () => {
    expect(code(avecCharge({ annee: '2026' }))).toBeUndefined();
    expect(code(avecCharge({ exercice: '2026' }))).toBeUndefined();
    expect(code(avecCharge({ montant: '2026' }))).toBe('montant_interdit');
    expect(code(avecCharge({ annee: '20261' }))).toBe('montant_interdit');
  });
  it('cle-montant-refusee', () => {
    expect(code(avecCharge({ total_ttc: 'x' }))).toBe('champ_interdit');
    for (const k of ['montant', 'solde', 'prix', 'tarif', 'centime', 'nom', 'iban', 'adresse', 'telephone', 'email_client']) expect(code(avecCharge({ [k]: 'x' }))).toBe('champ_interdit');
    expect(code(avecCharge({ nombre_pieces: 'x', denomination: 'x', subtotal_x: 'x' }))).toBeUndefined();
  });
  it('email-refuse', () => {
    expect(code(avecCharge({ contact: 'marie@exemple.fr' }))).toBe('champ_interdit');
  });
  it('champ-inconnu-refuse', () => {
    expect(code(brut('a', { montant: 'x' }))).toBe('champ_interdit');
    expect(code(avecCharge({ objet: { a: 'x' } }))).toBe('champ_interdit');
    expect(code(brut('a', { acteur: { type: 'systeme', id: 'x', nom: 'y' } }))).toBe('champ_interdit');
  });
  it('version-zero-refusee', () => {
    for (const v of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1']) expect(code(brut('a', { version: v }))).toBe('version_invalide');
    expect(code(brut('a', { version: undefined }))).toBe('champ_manquant');
  });
  it('champs-manquants-ou-invalides', () => {
    expect(code(null)).toBe('champ_manquant');
    expect(code(brut('a', { id: '' }))).toBe('champ_manquant');
    expect(code(brut('a', { canal: 'radio' }))).toBe('champ_manquant');
    expect(code(brut('a', { acteur: { type: 'robot', id: 'x' } }))).toBe('champ_manquant');
    expect(code(brut('a', { charge: null }))).toBe('champ_manquant');
  });
});

describe('faux publieur', () => {
  it('enregistre-et-echoue-selon-la-regle', async () => {
    const b = creerBoiteEnvoiMemoire();
    const faux = creerFauxPublieur({ echouer: (e) => e.id === 'b' });
    await b.executer(async (tx) => (tx.boite.deposer(creerEnveloppe(brut('a'))), tx.boite.deposer(creerEnveloppe(brut('b')))));
    expect(await relayer(b, faux.publieur, 9)).toEqual({ publiees: 1, arret: 'echec' });
    expect(faux.recus.map((e) => e.id)).toEqual(['a']);
  });
});
