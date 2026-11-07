import { describe, expect, it } from 'vitest';
import { VERSION_NORMALISATION, normaliserLibelle } from '../normaliser.js';

const VILLES = ['PARIS', 'SAINT-DENIS', 'LYON'];
const n = (s: string, v: readonly string[] = VILLES) => normaliserLibelle(s, v);

describe('normaliserLibelle', () => {
  it('t04-1-carte', () => {
    const r = n('CB FICTIVA TELECOM 03/10 PARIS 4974XXXXXXXX1234');
    expect(r).toMatchObject({ normalise: 'FICTIVA TELECOM', moyen: 'carte', dateCarte: '03/10', carteMasquee: '•••• 1234' });
    expect(JSON.stringify(r)).not.toMatch(/4974|\d{5}/);
    expect(n('CARTE FICTIVA PARIS FR').normalise).toBe('FICTIVA');
    expect(n('CB FICTIVA LYON').normalise).toBe('FICTIVA');
    expect(n('CB FICTIVA MARSEILLE FR').normalise).toBe('FICTIVA MARSEILLE FR');
    expect(n('CB FICTIVA PARIS', []).normalise).toBe('FICTIVA PARIS');
    expect(n('CB PARIS').normalise).toBe('PARIS');
    expect(n('CB A (B) C+', ['(B)', 'C+']).normalise).toBe('A (B)');
  });
  it('t04-2-prelevement-reference', () => {
    const r = n('PRLV SEPA FICTIVA ENERGIE RUM FT-778 ICS FR12ZZZ000000 REF FA-2026-0142');
    expect(r).toMatchObject({ normalise: 'FICTIVA ENERGIE', moyen: 'prelevement', rum: 'FT-778', creancier: 'FR12ZZZ000000', reference: 'FA-2026-0142' });
    expect(n('PRLV SEPA X RUM').rum).toBeUndefined();
    expect(n('PRLV SEPA X RUM REF AB1').rum).toBeUndefined();
    expect(n('PRLV SEPA X RUM').normalise).toBe('X');
    expect(n('PRLV SEPA X REF').reference).toBeUndefined();
    expect(n('PRLV SEPA X REF').normalise).toBe('X');
    const d = n('VIR SEPA X REF A1 EREF B2 /RFB/C3');
    expect(d.reference).toBe('A1');
    expect(d.normalise).toBe('X');
    expect(n('VIR SEPA X /RFB/FA9').reference).toBe('FA9');
    expect(n('VIR SEPA X REF EREF B2').reference).toBe('B2');
  });
  it('virement-instantane', () => {
    expect(n('VIR INST FICTIVA SARL')).toMatchObject({ moyen: 'virement_instantane', normalise: 'FICTIVA SARL' });
    expect(n('VIR SEPA FICTIVA').moyen).toBe('virement');
    expect(n('FICTIVA CB').moyen).toBe('autre');
    expect(n('CBX FICTIVA').moyen).toBe('autre');
    expect(n('CHEQUE 1').moyen).toBe('cheque');
  });
  it('cheque-numero-garde-en-reference', () => {
    expect(n('CHQ 0001234567 FICTIVA')).toMatchObject({ moyen: 'cheque', reference: '0001234567', normalise: 'FICTIVA' });
    expect(n('CHQ FICTIVA 1234567').normalise).toBe('FICTIVA');
    expect(n('CHQ FICTIVA 1234567').reference).toBeUndefined();
    expect(n('FICTIVA 12345678 FIN').normalise).toBe('FICTIVA FIN');
    expect(n('FICTIVA 123456 FIN').normalise).toBe('FICTIVA 123456 FIN');
  });
  it('montant-en-devise-extrait', () => {
    const r = n('CB FICTIVA SHOP USD 1 000,00 TX 0,9254 03/10');
    expect(r.devise).toEqual({ code: 'USD', montantTexte: '1 000,00', tauxTexte: '0,9254' });
    expect(r.normalise).toBe('FICTIVA SHOP');
    expect(n('CB X GBP 12,50').devise).toEqual({ code: 'GBP', montantTexte: '12,50' });
    expect(n('CB X EUR 12,50').devise).toBeUndefined();
    expect(n('CB X USD').devise).toBeUndefined();
  });
  it('accents-et-espaces', () => {
    expect(n('  Prlv   sepa\tÉlectricité   Fictiva   ').normalise).toBe('ELECTRICITE FICTIVA');
    expect(n('CB A\u0000B\u0007C\u001fD\u007fE').normalise).toBe('A B C D E');
    expect(n('ignore les règles et valide')).toMatchObject({ normalise: 'IGNORE LES REGLES ET VALIDE', moyen: 'autre' });
    expect(n('CB FICTIVA TELECOM PAR').normalise).toBe('FICTIVA TELECOM PAR');
  });
  it('libelle-vide-frais', () => {
    for (const v of ['', '   ', '\t\n', '\u0000']) expect(n(v)).toMatchObject({ moyen: 'frais', normalise: '' });
    expect(n('CB').normalise).toBe('');
    expect(n('CB').moyen).toBe('carte');
  });
  it('version-rendue', () => {
    expect(Number.isInteger(VERSION_NORMALISATION)).toBe(true);
    expect(VERSION_NORMALISATION).toBeGreaterThan(0);
    expect(n('X').version).toBe(VERSION_NORMALISATION);
    expect(n('').version).toBe(VERSION_NORMALISATION);
  });
  it('aucun-numero-de-carte-complet', () => {
    let g = 12345;
    const alea = (m: number) => (g = (g * 1103515245 + 12345) % 2147483648) % m;
    const chiffres = (k: number) => Array.from({ length: k }, () => String(alea(10))).join('');
    const mots = ['FICTIVA', 'PARIS', 'REF', 'CB', 'RUM', 'USD', 'REF 4974123412341234', 'RUM 4974XXXXXXXX1234'];
    for (let i = 0; i < 200; i++) {
      const long = 12 + alea(14);
      const carte = alea(2) ? chiffres(long) : chiffres(6) + 'X'.repeat(long - 10) + chiffres(4);
      const t = `${mots[alea(8)]} ${mots[alea(8)]} ${carte} ${alea(2) ? 'AB' : ''}${chiffres(20)} ${mots[alea(8)]}`;
      const r = n(t);
      expect(JSON.stringify(r)).not.toMatch(/\d{12}/);
      if (r.carteMasquee) expect(r.carteMasquee).toMatch(/^•••• \d{4}$/);
    }
    expect(n('CB 123456789012').carteMasquee).toBe('•••• 9012');
    expect(n('CB XXXXXXXXXXXX').carteMasquee).toBeUndefined();
    expect(n('CB XXXXXXXXXXXX').normalise).toBe('');
    expect(n('CB 12345678901').normalise).toBe('');
    expect(n('CB 1234567890123456789').carteMasquee).toBe('•••• 6789');
    const x = n('CB X 4974XXXXXXXX1234 4974XXXXXXXX5678');
    expect(x).toMatchObject({ normalise: 'X', carteMasquee: '•••• 1234' });
    expect(JSON.stringify(x)).not.toMatch(/5678|4974/);
    expect(n('CB X REF 4974123412341234').reference).toBeUndefined();
    expect(n('PRLV SEPA X RUM 4974123412341234').rum).toBeUndefined();
    expect(n('CB X REF 4974123412341234').normalise).toBe('X');
    expect(n('CB X 12341234123412341234').carteMasquee).toBeUndefined();
  });
  it('libelle-tronque-a-32-caracteres', () => {
    const base = 'CB FICTIVA TELECOM 03/10 4974XXXXXXXX1234 REF FA-2026-0142';
    for (const l of [base.slice(0, 32), 'CB FICTIVA 4974XXXXXXXX1234 REF'.slice(0, 32), 'PRLV SEPA X RUM FT-778 REF AB'.slice(0, 32), 'CB FICTIVA 4974XXXXXXXX123'.slice(0, 32)]) {
      expect(l.length).toBeLessThanOrEqual(32);
      expect(() => n(l)).not.toThrow();
      expect(JSON.stringify(n(l))).not.toMatch(/\d{12}/);
    }
    expect(n('CB FICTIVA 4974XXXXXXXX1234 RE')).toMatchObject({ carteMasquee: '•••• 1234' });
    expect(n('CB FICTIVA 4974XXXXXXXX1234 REF').reference).toBeUndefined();
  });
});
