import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { accepterAucuneOperation, ErreurReleveAttendu, relevesAttendus } from '../releve-attendu.js';

const c = (n: number): Centimes => n as Centimes;
const J = 5;
const rel = (compteId: string, periodeDebut: string, periodeFin: string) => ({ id: `${compteId}${periodeDebut}`, compteId, periodeDebut, periodeFin });
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurReleveAttendu ? e.code : 'autre'; }
  return undefined;
};
const compte = { id: 'c1', ouvertLe: '2026-01-01' };
const janAOct = [
  rel('c1', '2026-01-01', '2026-01-31'), rel('c1', '2026-02-01', '2026-02-28'), rel('c1', '2026-03-01', '2026-03-31'),
  rel('c1', '2026-04-01', '2026-04-30'), rel('c1', '2026-05-01', '2026-05-31'), rel('c1', '2026-06-01', '2026-06-30'),
  rel('c1', '2026-07-01', '2026-07-31'), rel('c1', '2026-08-01', '2026-08-31'), rel('c1', '2026-09-01', '2026-09-30'),
];

describe('relevé attendu', () => {
  it('alerte-au-jour-j', () => {
    expect(relevesAttendus([compte], janAOct, '2026-11-05', J)).toEqual([{ compteId: 'c1', mois: '2026-10' }]);
  });
  it('pas-d-alerte-la-veille', () => {
    expect(relevesAttendus([compte], janAOct, '2026-11-04', J)).toEqual([]);
    expect(relevesAttendus([], janAOct, '2026-11-05', J)).toEqual([]);
    expect(relevesAttendus([compte], janAOct, '2025-12-31', J)).toEqual([]);
  });
  it('compte-ferme-plus-attendu', () => {
    const ferme = { id: 'c1', ouvertLe: '2026-01-01', fermeLe: '2026-08-15' };
    expect(relevesAttendus([ferme], janAOct.slice(0, 7), '2026-11-05', J)).toEqual([{ compteId: 'c1', mois: '2026-08' }]);
    expect(relevesAttendus([ferme], [...janAOct.slice(0, 7), rel('c1', '2026-08-01', '2026-08-15')], '2026-11-05', J)).toEqual([]);
  });
  it('compte-ouvert-en-cours-de-mois', () => {
    const neuf = { id: 'c2', ouvertLe: '2026-09-20' };
    expect(relevesAttendus([neuf], [], '2026-11-05', J)).toEqual([{ compteId: 'c2', mois: '2026-09' }, { compteId: 'c2', mois: '2026-10' }]);
    expect(relevesAttendus([neuf], [rel('c2', '2026-09-20', '2026-10-31')], '2026-11-05', J)).toEqual([]);
    expect(relevesAttendus([neuf], [rel('c2', '2026-09-21', '2026-10-31')], '2026-11-05', J)).toEqual([{ compteId: 'c2', mois: '2026-09' }]);
  });
  it('mois-partiel-non-couvert-et-releve-d-un-autre-compte', () => {
    const partiel = [...janAOct.slice(0, 8), rel('c1', '2026-09-01', '2026-09-29'), rel('c9', '2026-10-01', '2026-10-31')];
    expect(relevesAttendus([compte], partiel, '2026-11-05', J)).toEqual([{ compteId: 'c1', mois: '2026-09' }, { compteId: 'c1', mois: '2026-10' }]);
  });
  it('aucune-operation-acceptee', () => {
    expect(accepterAucuneOperation({ soldeAvant: c(1234567), soldeApres: c(1234567) })).toEqual({ accepte: true });
    expect(accepterAucuneOperation({ soldeAvant: c(0), soldeApres: c(0) })).toEqual({ accepte: true });
  });
  it('aucune-operation-refusee-avec-ecart', () => {
    expect(accepterAucuneOperation({ soldeAvant: c(1234567), soldeApres: c(1100000) })).toEqual({ accepte: false, motif: 'ecart', ecart: 134567 });
    expect(accepterAucuneOperation({ soldeAvant: c(1100000), soldeApres: c(1234567) })).toEqual({ accepte: false, motif: 'ecart', ecart: 134567 });
  });
  it('soldes-inconnus-refuse', () => {
    const inconnu = { accepte: false, motif: 'soldes_inconnus' };
    expect(accepterAucuneOperation({})).toEqual(inconnu);
    expect(accepterAucuneOperation({ soldeAvant: c(5) })).toEqual(inconnu);
    expect(accepterAucuneOperation({ soldeApres: c(5) })).toEqual(inconnu);
  });
  it('erreurs-et-cas-limites', () => {
    for (const j of [0, 29, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) expect(code(() => relevesAttendus([compte], [], '2026-11-05', j))).toBe('jour_invalide');
    expect(code(() => relevesAttendus([compte], [], '2026-02-30', J))).toBe('date_invalide');
    expect(code(() => relevesAttendus([{ id: 'c', ouvertLe: 'x' }], [], '2026-11-05', J))).toBe('date_invalide');
    expect(code(() => relevesAttendus([compte], [rel('c1', '2026-01-31', '2026-01-01')], '2026-11-05', J))).toBe('date_invalide');
    expect(code(() => relevesAttendus([{ ...compte, fermeLe: '2025-12-31' }], [], '2026-11-05', J))).toBe('fermeture_avant_ouverture');
    expect(relevesAttendus([{ ...compte, fermeLe: '2026-01-01' }], [], '2026-11-05', 28)).toEqual([{ compteId: 'c1', mois: '2026-01' }]);
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(code(() => accepterAucuneOperation({ soldeAvant: m as Centimes, soldeApres: c(1) }))).toBe('montant_invalide');
      expect(code(() => accepterAucuneOperation({ soldeAvant: c(1), soldeApres: m as Centimes }))).toBe('montant_invalide');
    }
  });
});
