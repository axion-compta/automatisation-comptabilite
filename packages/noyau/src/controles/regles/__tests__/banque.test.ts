import { describe, expect, it } from 'vitest';
import { executerControles } from '../../moteur.js';
import { regleBQ01, regleBQ02, regleBQ03, type ObjetBQ01, type ObjetBQ02, type ObjetBQ03 } from '../banque.js';

const exercice = { debut: '2026-01-01', fin: '2026-12-31' };
const bq01 = (trous: ObjetBQ01['trous']): ObjetBQ01 => ({ exercice, trous });
const trou = (debut: string, fin: string, etat: ObjetBQ01['trous'][number]['etat'] = 'ouvert') => ({ debut, fin, etat });
const decision = { motif: 'frais personnels', par: 'Camille Test', le: '2026-03-02' };
const paiement = (ligneId: string, montant: number, justificatif: 'present' | 'absent', d?: typeof decision) => ({
  ligneId, montant, justificatif, ...(d ? { decision: d } : {}),
});
const lien = (ligneId: string, pieceId: string, montantAffecte: number) =>
  ({ ligneId, pieceId, montantAffecte, etat: 'valide' }) as ObjetBQ03['liens'][number];

describe('CC-BQ01 trou de relevé ouvert', () => {
  it('bq01-trou-ouvert-alerte', () => {
    expect(regleBQ01.evaluer(bq01([trou('2026-09-01', '2026-09-30'), trou('2026-11-01', '2027-01-10', 'demande'), trou('2026-05-01', '2026-05-31', 'comble')])))
      .toEqual({ resultat: 'ALERTE', valeur: 2 });
    expect(regleBQ01).toMatchObject({ id: 'CC-BQ01', gravite: 'B', bloque: ['cloture'], declencheurs: ['avant_cloture', 'continu'], actif: true });
  });
  it('bq01-trou-hors-exercice-ok', () => {
    expect(regleBQ01.evaluer(bq01([trou('2025-11-01', '2025-12-31')]))).toEqual({ resultat: 'OK' });
    expect(regleBQ01.evaluer(bq01([trou('2027-01-01', '2027-01-31')]))).toEqual({ resultat: 'OK' });
    expect(regleBQ01.evaluer(bq01([trou('2026-09-01', '2026-09-30', 'accepte_vide')]))).toEqual({ resultat: 'OK' });
    expect(regleBQ01.evaluer(bq01([trou('2025-12-01', '2026-01-01')]))).toMatchObject({ resultat: 'ALERTE' });
    expect(regleBQ01.evaluer(bq01([trou('2026-12-31', '2027-01-05')]))).toMatchObject({ resultat: 'ALERTE' });
    expect(regleBQ01.evaluer(bq01([]))).toEqual({ resultat: 'OK' });
  });
  it('bq01-donnees-absentes-impossible', () => {
    expect(regleBQ01.evaluer({} as ObjetBQ01)).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer({ exercice } as ObjetBQ01)).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer({ trous: [] } as unknown as ObjetBQ01)).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer({ exercice: { debut: '2026-13-01', fin: '2026-12-31' }, trous: [] })).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer({ exercice: { debut: '2026-12-31', fin: '2026-01-01' }, trous: [] })).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer(bq01([trou('2026-09-30', '2026-09-01')]))).toEqual({ resultat: 'IMPOSSIBLE' });
    expect(regleBQ01.evaluer(bq01([trou('x', '2026-09-01')]))).toEqual({ resultat: 'IMPOSSIBLE' });
  });
});

describe('CC-BQ02 paiement sans justificatif', () => {
  const o = (paiements: ObjetBQ02['paiements']): ObjetBQ02 => ({ paiements });
  it('bq02-sans-decision-alerte-et-somme', () => {
    expect(regleBQ02.evaluer(o([paiement('L1', 1200, 'absent'), paiement('L2', 800, 'absent'), paiement('L3', 500, 'present'), paiement('L4', 900, 'absent', decision)])))
      .toEqual({ resultat: 'ALERTE', ecartCentimes: 2000 });
    expect(regleBQ02.evaluer(o([paiement('L1', -1200, 'absent'), paiement('L2', -800, 'absent')]))).toEqual({ resultat: 'ALERTE', ecartCentimes: 2000 });
    expect(regleBQ02).toMatchObject({ id: 'CC-BQ02', gravite: 'B', bloque: ['export'], declencheurs: ['avant_export', 'continu'], actif: true });
  });
  it('bq02-decision-tracee-ok', () => {
    expect(regleBQ02.evaluer(o([paiement('L1', 900, 'absent', decision), paiement('L2', 50, 'present')]))).toEqual({ resultat: 'OK' });
    expect(regleBQ02.evaluer(o([paiement('L1', 900, 'absent', { ...decision, par: '' })]))).toMatchObject({ resultat: 'ALERTE' });
    expect(regleBQ02.evaluer(o([paiement('L1', 900, 'absent', { ...decision, motif: ' ' })]))).toMatchObject({ resultat: 'ALERTE' });
    expect(regleBQ02.evaluer(o([paiement('L1', 900, 'absent', { ...decision, le: '' })]))).toMatchObject({ resultat: 'ALERTE' });
  });
  it('bq02-listes-vides-et-montants-invalides', () => {
    expect(regleBQ02.evaluer(o([]))).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(regleBQ02.evaluer({} as ObjetBQ02)).toEqual({ resultat: 'IMPOSSIBLE' });
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(regleBQ02.evaluer(o([paiement('L1', m, 'absent')]))).toEqual({ resultat: 'IMPOSSIBLE' });
      expect(regleBQ02.evaluer(o([paiement('L1', m, 'present')]))).toEqual({ resultat: 'IMPOSSIBLE' });
    }
  });
});

describe('CC-BQ03 sommes affectées', () => {
  const o = (pieces: ObjetBQ03['pieces'], lignes: ObjetBQ03['lignes'], liens: ObjetBQ03['liens']): ObjetBQ03 => ({ pieces, lignes, liens });
  it('bq03-depassement-piece-alerte', () => {
    const r = regleBQ03.evaluer(o([{ id: 'P1', montant: 1000 }], [{ id: 'L1', montant: -2000 }, { id: 'L2', montant: -2000 }], [lien('L1', 'P1', 600), lien('L2', 'P1', 600)]));
    expect(r).toMatchObject({ resultat: 'ALERTE' });
    expect(regleBQ03).toMatchObject({ id: 'CC-BQ03', gravite: 'B', bloque: ['validation'], actif: true });
    const piece = (a: number, b: number) => regleBQ03.evaluer(o([{ id: 'P1', montant: 1000 }], [{ id: 'L1', montant: -5000 }, { id: 'L2', montant: -5000 }], [lien('L1', 'P1', a), lien('L2', 'P1', b)]));
    expect(piece(600, 401)).toEqual({ resultat: 'ALERTE' });
    expect(piece(600, 400)).toEqual({ resultat: 'OK' });
  });
  it('bq03-depassement-ligne-alerte', () => {
    const r = regleBQ03.evaluer(o([{ id: 'P1', montant: 5000 }, { id: 'P2', montant: 5000 }], [{ id: 'L1', montant: -1000 }], [lien('L1', 'P1', 600), lien('L1', 'P2', 600)]));
    expect(r).toMatchObject({ resultat: 'ALERTE' });
    const ligne = (b: number) => regleBQ03.evaluer(o([{ id: 'P1', montant: 5000 }, { id: 'P2', montant: 5000 }], [{ id: 'L1', montant: -1000 }], [lien('L1', 'P1', 600), lien('L1', 'P2', b)]));
    expect(ligne(401)).toEqual({ resultat: 'ALERTE' });
    expect(ligne(400)).toEqual({ resultat: 'OK' });
  });
  it('bq03-sommes-justes-ok', () => {
    const pieces = [{ id: 'P1', montant: 1000 }];
    const lignes = [{ id: 'L1', montant: -600 }, { id: 'L2', montant: 400 }];
    expect(regleBQ03.evaluer(o(pieces, lignes, [lien('L1', 'P1', 600), lien('L2', 'P1', 400)]))).toEqual({ resultat: 'OK' });
    expect(regleBQ03.evaluer(o(pieces, lignes, [{ ...lien('L1', 'P1', 9999), etat: 'refuse' }]))).toEqual({ resultat: 'OK' });
  });
  it('bq03-vide-et-invalide', () => {
    expect(regleBQ03.evaluer(o([], [], []))).toEqual({ resultat: 'NON_APPLICABLE' });
    expect(regleBQ03.evaluer({} as ObjetBQ03)).toEqual({ resultat: 'IMPOSSIBLE' });
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(regleBQ03.evaluer(o([{ id: 'P1', montant: m }], [], []))).toEqual({ resultat: 'IMPOSSIBLE' });
      expect(regleBQ03.evaluer(o([], [{ id: 'L1', montant: m }], []))).toEqual({ resultat: 'IMPOSSIBLE' });
      expect(regleBQ03.evaluer(o([{ id: 'P1', montant: 5 }], [{ id: 'L1', montant: 5 }], [lien('L1', 'P1', m)]))).toEqual({ resultat: 'IMPOSSIBLE' });
    }
  });
});

describe('moteur', () => {
  it('ok-aussi-trace', () => {
    const traces = executerControles([regleBQ01], [{ type: 'exercice', id: 'E2026', donnee: bq01([]) }], 'avant_cloture', '2026-12-31T00:00:00Z');
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({ regleId: 'CC-BQ01', resultat: 'OK', objetId: 'E2026' });
    const alerte = executerControles([regleBQ01], [{ type: 'exercice', id: 'E2026', donnee: bq01([trou('2026-09-01', '2026-09-30')]) }], 'continu', 'h');
    expect(alerte[0]).toMatchObject({ resultat: 'ALERTE', valeur: 1 });
    expect(executerControles([regleBQ02], [{ type: 'x', id: 'p', donnee: { paiements: [] } }], 'avant_cloture', 'h')).toEqual([]);
  });
});
