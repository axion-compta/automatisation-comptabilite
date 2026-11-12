import { describe, expect, it } from 'vitest';
import { correction } from '../domaines/correction.js';
import { creerCorrectionEnMemoire } from '../domaines/correction-service.js';
import type { PieceDetail } from '../domaines/pieces.js';
import { routesEcritureSansEnTete, type Source } from '../openapi.js';

const nouveau = () => {
  const stock = new Map<string, PieceDetail>();
  return { stock, service: creerCorrectionEnMemoire(stock, 180, () => '2026-03-01T09:00:00.000Z') };
};
const ttcDe = (p: PieceDetail) => p.champs.find((c) => c.nom === 'ttc');

describe('correction d un champ lu (contrat et service en mémoire)', () => {
  it('correction-ttc-recalcule-le-nom', () => {
    const { service } = nouveau();
    const r = service.corriger('piece-001', 'ttc', '250,50', 'erreur de lecture') as PieceDetail;
    expect(ttcDe(r)).toMatchObject({ valeurCentimes: 25050, mot: 'sur', source: 'texte_pdf' });
    expect(r.ttcCentimes).toBe(25050);
    expect(r.nomNormalise).toContain('250.50');
    expect(r.nomNormalise).not.toBe('2026-01-01');
  });

  it('correction-date-deplace-le-chemin', () => {
    const { service } = nouveau();
    const r = service.corriger('piece-001', 'date_piece', '05/09/2026', 'mauvaise date') as PieceDetail;
    expect(r.datePiece).toBe('2026-09-05');
    expect(r.cheminVirtuel).toMatch(/^\/pieces\/2026\/09\//);
    expect(r.nomNormalise.startsWith('2026-09-05_')).toBe(true);
  });

  it('historique-garde-l-ancienne-valeur', () => {
    const { service } = nouveau();
    const avant = ttcDe(service.corriger('piece-009', 'ttc', '1,00', 'premier') as PieceDetail)?.valeur;
    service.corriger('piece-009', 'ttc', '2,00', 'second');
    const h = service.historique();
    expect(h).toHaveLength(2);
    expect(h[0]).toMatchObject({ champ: 'ttc', ancienneValeur: '11900', nouvelleValeur: '100', corrigePar: 'utilisateur-fictif-001', corrigeLe: '2026-03-01T09:00:00.000Z', pourquoi: 'premier' });
    expect(h[1]?.ancienneValeur).toBe(avant);
  });

  it('champ-inconnu-404', () => {
    const { service } = nouveau();
    expect(service.corriger('piece-001', 'inexistant', 'x', 'p')).toBe('CHAMP_INCONNU');
    expect(service.corriger('piece-001', 'ht@abc', '1', 'p')).toBe('CHAMP_INCONNU');
    expect(service.corriger('inconnue', 'ttc', '1', 'p')).toBe('PIECE_INCONNUE');
    expect(typeof service.corriger('piece-001', 'ht@1900', '10,00', 'p')).toBe('object');
  });

  it.each(['abc', 'NaN', 'Infinity', ''])('montant-illisible-400 %j', (v) => {
    const { service, stock } = nouveau();
    expect(service.corriger('piece-001', 'ttc', v, 'p')).toBe('VALEUR_ILLISIBLE');
    expect(stock.size).toBe(0);
    expect(service.historique()).toHaveLength(0);
  });

  it('date illisible refusée', () => {
    expect(nouveau().service.corriger('piece-001', 'date_piece', '31/02/2026', 'p')).toBe('VALEUR_ILLISIBLE');
  });

  it('piece-sensible-409', () => {
    const { service } = nouveau();
    expect(service.corriger('piece-010', 'ttc', '1,00', 'p')).toBe('PIECE_SENSIBLE');
  });

  it('en-tete-absent-400', () => {
    const route = correction.corrigerChamp['~orpc'].inputSchema as unknown as { safeParse: (v: unknown) => { success: boolean } };
    const corps = { valeur: '1,00', pourquoi: 'p' };
    const params = { id: 'piece-001', nom: 'ttc' };
    expect(route.safeParse({ headers: {}, params, body: corps }).success).toBe(false);
    expect(route.safeParse({ headers: { 'idempotency-key': 'cle-fictive-001' }, params, body: corps }).success).toBe(true);
    expect(route.safeParse({ headers: { 'idempotency-key': 'cle-fictive-001' }, params, body: { valeur: '', pourquoi: 'p' } }).success).toBe(false);
    expect(routesEcritureSansEnTete({ correction } as unknown as Source)).toEqual([]);
  });
});
