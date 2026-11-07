import { describe, expect, it } from 'vitest';
import { TYPES_CARTE } from '../../../../noyau/src/chat/types.js';
import { validerCarte } from '../cartes.js';

const IND = { type: 'indisponible' };
const base = { id: 'c1', titre_code: 'carte.titre', source: { type: 'ecriture', id: 'e1' } };
const montant = { montant_centimes: 12000, devise: 'EUR' };
const CARTES: Record<string, Record<string, unknown>> = {
  ecriture: { ...base, type: 'ecriture', libelle: 'Achat fournitures', ...montant },
  piece: { ...base, type: 'piece', libelle: 'Facture Atelier Dupré', ...montant },
  liste: { ...base, type: 'liste', elements: [{ libelle: 'Ligne A' }, { libelle: 'Ligne B' }] },
  proposition: { ...base, type: 'proposition', libelle: 'Classer en 606', ...montant },
  rapprochement: { ...base, type: 'rapprochement', libelle: 'Virement reçu', ...montant },
  tva: { ...base, type: 'tva', ...montant },
  telechargement: { ...base, type: 'telechargement', lien_interne: '/export/fec.csv', expire_le: '2030-01-01T00:00:00Z' },
};
const avec = (type: string, patch: Record<string, unknown>) => validerCarte({ ...CARTES[type], ...patch });

describe('cartes du chat', () => {
  it('sept-types-acceptes', () => {
    expect(Object.keys(CARTES).sort()).toEqual([...TYPES_CARTE].sort());
    for (const t of TYPES_CARTE) expect(validerCarte(CARTES[t])).toEqual(CARTES[t]);
  });

  it('champ-en-trop-indisponible', () => {
    for (const t of TYPES_CARTE) expect(avec(t, { en_trop: 1 })).toEqual(IND);
    expect(avec('ecriture', { source: { type: 'ecriture', id: 'e1', x: 1 } })).toEqual(IND);
    expect(avec('liste', { elements: [{ libelle: 'A', x: 1 }] })).toEqual(IND);
  });

  it('type-inconnu-indisponible', () => {
    expect(avec('ecriture', { type: 'inconnu' })).toEqual(IND);
    expect(avec('ecriture', { type: undefined })).toEqual(IND);
    expect(avec('ecriture', { type: 5 })).toEqual(IND);
  });

  it('html-dans-un-libelle-indisponible', () => {
    const mauvais = ['<b>x</b>', 'a>b', 'http://x.fr', 'HTTPS://x.fr', 'voir www.x.fr', 'Data:text/html', 'JavaScript:alert(1)'];
    for (const m of mauvais) {
      expect(avec('ecriture', { libelle: m })).toEqual(IND);
      expect(avec('liste', { elements: [{ libelle: m }] })).toEqual(IND);
    }
  });

  it('lien-externe-indisponible', () => {
    for (const m of ['https://x.fr/a', 'http://x.fr', 'www.x.fr', 'javascript:alert(1)', 'data:text/plain,a']) {
      expect(avec('piece', { libelle: m })).toEqual(IND);
    }
    expect(avec('ecriture', { source: { type: 'ecriture', id: 'https://x.fr' } })).toEqual(IND);
    expect(avec('ecriture', { titre_code: 'Texte libre <b>' })).toEqual(IND);
  });

  it('montant-non-entier-indisponible', () => {
    for (const m of [1.5, NaN, Infinity, -Infinity, '100', null, 2 ** 53]) {
      expect(avec('ecriture', { montant_centimes: m })).toEqual(IND);
      expect(avec('tva', { montant_centimes: m })).toEqual(IND);
    }
  });

  it('devise-minuscule-indisponible', () => {
    for (const d of ['eur', 'Eur', 'EU', 'EURO', '', 5]) expect(avec('ecriture', { devise: d })).toEqual(IND);
  });

  it('lien-telechargement-absolu-refuse', () => {
    for (const l of ['https://x.fr/a', '//x.fr/a', 'export/fec.csv', '', 'http://x.fr']) {
      expect(avec('telechargement', { lien_interne: l })).toEqual(IND);
    }
    expect(avec('telechargement', { expire_le: 'demain' })).toEqual(IND);
  });

  it('entree-vide-ou-null-indisponible', () => {
    for (const v of [undefined, null, {}, [], '', 0, 'carte', true]) expect(validerCarte(v)).toEqual(IND);
  });
});
