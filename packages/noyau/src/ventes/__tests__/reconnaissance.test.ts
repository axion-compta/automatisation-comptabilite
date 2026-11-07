import { describe, expect, it } from 'vitest';
import { effetSiJeChange, natureProposee, sensDeLaPiece, typeProbable } from '../reconnaissance.js';

const SOC = { siren: '987654324', tva: 'FR00987654324', nom: 'Atelier Marceau' };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('reconnaissance des ventes', () => {
  it('vente-par-siren', () => {
    expect(sensDeLaPiece({ siren: '987 654 324', nom: 'Autre' }, SOC)).toBe('vente');
  });
  it('vente-par-tva', () => {
    expect(sensDeLaPiece({ tva: 'FR00 9876 54324', siren: '111111111' }, SOC)).toBe('vente');
  });
  it('nom-seul-a-verifier', () => {
    expect(sensDeLaPiece({ nom: '  ATELIER  marceau ' }, SOC)).toBe('a_verifier');
    expect(sensDeLaPiece({ nom: 'Atelier Marceau', siren: '111111111' }, SOC)).toBe('a_verifier');
  });
  it('achat-sinon', () => {
    expect(sensDeLaPiece({ siren: '111111111', tva: 'FR1', nom: 'Rivoire' }, SOC)).toBe('achat');
    expect(sensDeLaPiece({}, SOC)).toBe('achat');
    expect(sensDeLaPiece({ siren: '', tva: '', nom: '' }, { siren: '', tva: '', nom: '' })).toBe('achat');
    expect(sensDeLaPiece({ siren: '  ', nom: '--' }, { siren: ' ', nom: '..' })).toBe('achat');
  });
  it('negatif-sans-mot-avoir-a-confirmer', () => {
    expect(typeProbable({ ttc: -1200, texteContientAvoir: false, texteContientAcompte: false })).toEqual({ type: 'avoir', aConfirmer: true });
    expect(typeProbable({ ttc: -1, texteContientAvoir: false, texteContientAcompte: true })).toEqual({ type: 'avoir', aConfirmer: true });
    expect(typeProbable({ ttc: -5, texteContientAvoir: true, texteContientAcompte: false })).toEqual({ type: 'avoir', aConfirmer: false });
    expect(typeProbable({ ttc: 5, texteContientAvoir: true, texteContientAcompte: true })).toEqual({ type: 'avoir', aConfirmer: false });
    expect(typeProbable({ ttc: 5, texteContientAvoir: false, texteContientAcompte: true })).toEqual({ type: 'facture_acompte', aConfirmer: false });
    expect(typeProbable({ ttc: 0, texteContientAvoir: false, texteContientAcompte: false })).toEqual({ type: 'facture', aConfirmer: false });
    expect(typeProbable({ ttc: 900, texteContientAvoir: false, texteContientAcompte: false })).toEqual({ type: 'facture', aConfirmer: false });
    for (const ttc of [Number.NaN, Infinity, -Infinity, 1.5]) {
      expect(code(() => typeProbable({ ttc, texteContientAvoir: false, texteContientAcompte: false }))).toBe('montant_invalide');
    }
  });
  const CAT = [
    { motCle: 'service', nature: 'service' as const, compteProduit: 'P2' },
    { motCle: 'serviette', nature: 'bien' as const, compteProduit: 'P1' },
    { motCle: '', nature: 'bien' as const, compteProduit: 'P0' },
  ];
  it('habitude-avant-catalogue', () => {
    expect(natureProposee('Serviette bain', { nature: 'service', compteProduit: 'H1' }, CAT)).toEqual({ nature: 'service', compteProduit: 'H1' });
    expect(natureProposee('Serviette bain', undefined, CAT)).toEqual({ nature: 'bien', compteProduit: 'P1' });
    expect(natureProposee('Serviette service', undefined, CAT)).toEqual({ nature: 'service', compteProduit: 'P2' });
    expect(natureProposee('Truc', { nature: 'a_confirmer', compteProduit: 'H1' }, CAT)).toEqual({ nature: 'a_confirmer' });
  });
  it('mot-cle-entier-seulement', () => {
    const cat = [{ motCle: 'service', nature: 'service' as const, compteProduit: 'P2' }];
    expect(natureProposee('Serviette', undefined, cat)).toEqual({ nature: 'a_confirmer' });
    expect(natureProposee('Mon SERVICE, annuel', undefined, cat)).toEqual({ nature: 'service', compteProduit: 'P2' });
    expect(natureProposee('Prestation de Sérvice', undefined, cat)).toEqual({ nature: 'service', compteProduit: 'P2' });
    expect(natureProposee('Aservice', undefined, cat)).toEqual({ nature: 'a_confirmer' });
  });
  it('sans-indice-a-confirmer', () => {
    expect(natureProposee('Truc', undefined, [])).toEqual({ nature: 'a_confirmer' });
    expect(natureProposee('', undefined, CAT)).toEqual({ nature: 'a_confirmer' });
  });
  it('effet-si-je-change-ignore-les-validees', () => {
    const p = (id: string, statut: string, clientId: string) => ({ id, statut: statut as 'lue', clientId });
    const pieces = [
      p('d', 'rejetee', 'C1'), p('c', 'proposee', 'C1'), p('a', 'validee', 'C1'), p('b', 'lue', 'C1'),
      p('e', 'doublon', 'C1'), p('f', 'a_verifier', 'C1'), p('g', 'lue', 'C2'),
    ];
    expect(effetSiJeChange(pieces, 'C1')).toEqual(['c', 'b', 'f']);
    expect(effetSiJeChange([...pieces].reverse(), 'C1')).toEqual(['f', 'b', 'c']);
    expect(effetSiJeChange([], 'C1')).toEqual([]);
    expect(effetSiJeChange([p('x', 'lue', '')], '')).toEqual([]);
  });
});
