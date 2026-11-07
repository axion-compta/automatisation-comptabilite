import { describe, expect, it } from 'vitest';
import { extraireNombres, verifierRapport } from '../verificateur-rapport.js';

const OBL = ['mention_ia_a_valider', 'ni_audit_ni_certification'];
const MARQ = { marqueursObligatoires: OBL };
const reg = { nombres: [12000, 1250, -125000, 1250000], dates: ['2026-03-31'] };
const p1 = 'mention_ia_a_valider ni_audit_ni_certification. ';
const rapport = (...pages: string[]) => ({ pages, marqueurs: OBL });
const bruts = (t: string) => extraireNombres(t).nombres.map((n) => n.valeur);

describe('verificateur-rapport', () => {
  it('rapport-valide', () => {
    const r = verifierRapport(rapport(p1 + 'Total 12 000 et 12,5 le 31/03/2026.'), reg, MARQ);
    expect(r).toEqual({ valide: true, inconnus: [], marqueursManquants: [] });
  });
  it('nombre-inconnu', () => {
    const r = verifierRapport(rapport(p1 + 'Total 12 001', 'Suite : 777'), reg, MARQ);
    expect(r.valide).toBe(false);
    expect(r.inconnus).toEqual(['12 001', '777']);
  });
  it('format-francais-avec-espaces-insecables', () => {
    expect(bruts('12 000')).toEqual([12000]);
    expect(bruts('12\u00A0000')).toEqual([12000]);
    expect(bruts('12\u202F000')).toEqual([12000]);
    expect(bruts('12 000,50')).toEqual([1200050]);
    expect(bruts('1 250 €')).toEqual([1250]);
    expect(bruts('1 250,00')).toEqual([125000]);
    expect(bruts('3 puis 4')).toEqual([3, 4]);
  });
  it('negatif', () => {
    expect(bruts('-1 250,00')).toEqual([-125000]);
    expect(bruts('solde -3')).toEqual([-3]);
    expect(verifierRapport(rapport(p1 + 'écart -1 250,00'), reg, MARQ).valide).toBe(true);
    expect(verifierRapport(rapport(p1 + 'écart 1 250,00'), reg, MARQ).valide).toBe(false);
  });
  it('decimale-sur-un-chiffre', () => {
    expect(bruts('12,5')).toEqual([1250]);
    expect(bruts('12,05')).toEqual([1205]);
    expect(bruts('12,')).toEqual([12]);
    expect(bruts('12,505')).toEqual([null]);
  });
  it('date-pas-un-nombre', () => {
    const e = extraireNombres('Le 2026-03-31 et le 31/03/2026.');
    expect(e.nombres).toEqual([]);
    expect(e.dates).toEqual(['2026-03-31', '2026-03-31']);
    const r = verifierRapport(rapport(p1 + 'Le 01/04/2026'), reg, MARQ);
    expect(r.inconnus).toEqual(['2026-04-01']);
  });
  it('marqueur-absent', () => {
    const r = verifierRapport({ pages: [p1], marqueurs: ['mention_ia_a_valider'] }, reg, MARQ);
    expect(r).toEqual({ valide: false, inconnus: [], marqueursManquants: ['ni_audit_ni_certification'] });
    expect(verifierRapport(rapport('rien'), reg, MARQ).marqueursManquants).toEqual(OBL);
  });
  it('marqueur-seulement-en-page-deux', () => {
    const r = verifierRapport(rapport('mention_ia_a_valider', 'ni_audit_ni_certification'), reg, MARQ);
    expect(r.valide).toBe(false);
    expect(r.marqueursManquants).toEqual(['ni_audit_ni_certification']);
  });
  it('rapport-vide', () => {
    expect(verifierRapport({ pages: [], marqueurs: OBL }, reg, MARQ).valide).toBe(false);
    expect(verifierRapport({ pages: [], marqueurs: [] }, reg, { marqueursObligatoires: [] }).valide).toBe(false);
    expect(verifierRapport(rapport(p1), reg, MARQ).valide).toBe(true);
  });
  it('nombre-geant', () => {
    const max = String(Number.MAX_SAFE_INTEGER);
    expect(bruts(max)).toEqual([Number.MAX_SAFE_INTEGER]);
    expect(bruts('9007199254740992')).toEqual([null]);
    expect(bruts('99999999999999999999')).toEqual([null]);
    const r = verifierRapport(rapport(p1 + '9007199254740992'), { nombres: [9007199254740992], dates: [] }, MARQ);
    expect(r.valide).toBe(false);
    expect(r.inconnus).toEqual(['9007199254740992']);
    expect(verifierRapport(rapport(p1 + max), { nombres: [Number.NaN, Infinity], dates: [] }, MARQ).valide).toBe(false);
  });
});
