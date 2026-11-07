import { describe, expect, it } from 'vitest';
import { lireAvecRegles } from '../lecteur-b.js';

const FR = { decimal: ',', ordreDate: 'JMA' } as const;
const EN = { decimal: '.', ordreDate: 'MJA' } as const;
const lire = (texte: string, tauxConnusPdb: number[], convention: typeof FR | typeof EN = FR) => lireAvecRegles({ texte, source: 'texte_pdf', convention, tauxConnusPdb });
const val = (r: ReturnType<typeof lire>, nom: string) => r.champs.find((c) => c.nom === nom);
const luhn = (p: string): string => { for (let d = 0; d < 10; d++) { const c = p + d; let s = 0; [...c].reverse().forEach((ch, i) => { const v = Number(ch) * (i % 2 === 1 ? 2 : 1); s += v > 9 ? v - 9 : v; }); if (s % 10 === 0) return c; } throw new Error('x'); };
const SIREN = luhn('12345678');
const cleFr = (s: string): string => String((12 + 3 * (Number(s) % 97)) % 97).padStart(2, '0');

describe('lecteur-b', () => {
  it('facture-fr-un-taux', () => {
    const r = lire('Facture n° FA-2025-001\nBase HT 19 % 1 000,00\nTVA 19 % 190,00\nTotal TTC 1 190,00', [1900]);
    expect(r.champs.map((c) => c.nom).sort()).toEqual(['ht@1900', 'numero', 'ttc', 'tva@1900']);
    expect(val(r, 'ttc')?.valeurCentimes).toBe(119000);
    expect(val(r, 'ht@1900')?.valeurCentimes).toBe(100000);
    expect(val(r, 'tva@1900')?.valeurCentimes).toBe(19000);
    expect(val(r, 'numero')?.valeur).toBe('FA-2025-001');
    expect(r.champs.every((c) => c.lecteur === 'B' && c.source === 'texte_pdf')).toBe(true);
    expect(r.ambigus).toEqual([]);
  });
  it('facture-trois-taux', () => {
    const t = 'Base HT 5,5 % 100,00\nTVA 5,5 % 5,50\nBase HT 5.5% 200,00\nBase HT 12 % 200,00\nTVA 12 % 24,00\nBase HT 7 % 50,00\nTVA 7 % 3,50';
    const r = lire(t, [550, 1200, 700]);
    expect(r.ambigus).toEqual(['ht@550']);
    expect(val(r, 'tva@550')?.valeurCentimes).toBe(550);
    expect(val(r, 'ht@1200')?.valeurCentimes).toBe(20000);
    expect(val(r, 'tva@1200')?.valeurCentimes).toBe(2400);
    expect(val(r, 'ht@700')?.valeurCentimes).toBe(5000);
    expect(val(r, 'tva@700')?.valeurCentimes).toBe(350);
  });
  it('taux-inconnu-ignore', () => {
    const r = lire('TVA 19 % 190,00\nBase HT 19 % 1 000,00\nTVA 7 % 70,00', [700]);
    expect(r.champs.map((c) => c.nom)).toEqual(['tva@700']);
  });
  it('facture-en-convention-point', () => {
    const r = lire('Invoice number INV-0042\nInvoice date 03/15/2025\nVAT 19 % 190.00\nAmount due 1,190.00 USD', [1900], EN);
    expect(val(r, 'ttc')?.valeurCentimes).toBe(119000);
    expect(val(r, 'tva@1900')?.valeurCentimes).toBe(19000);
    expect(val(r, 'numero')?.valeur).toBe('INV-0042');
    expect(val(r, 'date_piece')?.valeur).toBe('2025-03-15');
  });
  it('ttc-ambigu-omis', () => {
    const r = lire('Total TTC 100,00\nNet à payer 120,00', []);
    expect(val(r, 'ttc')).toBeUndefined();
    expect(r.ambigus).toEqual(['ttc']);
    expect(lire('Total TTC 100,00\nNet à payer 100,00', []).champs).toHaveLength(1);
    expect(lire('Total TTC 100,00\nNet à payer 100,00', []).ambigus).toEqual([]);
  });
  it('citation-exacte', () => {
    const texte = 'Date de facture : 15/03/2025\nTotal TTC : 1 190,00 €\nFacture n° FA-7/B';
    const r = lire(texte, []);
    expect(r.champs.length).toBe(3);
    for (const c of r.champs) expect(texte.includes(c.citation ?? '\0')).toBe(true);
    expect(val(r, 'ttc')?.citation).toBe('1 190,00');
    expect(val(r, 'date_piece')?.citation).toBe('15/03/2025');
    expect(val(r, 'date_piece')?.valeur).toBe('2025-03-15');
  });
  it('siren-et-tva-lus', () => {
    const tva = `FR${cleFr(SIREN)}${SIREN}`;
    const faux = `FR00${SIREN}`;
    const r = lire(`Fournisseur Exemple SARL\nSIREN ${SIREN.slice(0, 3)} ${SIREN.slice(3, 6)} ${SIREN.slice(6)}\nTVA ${faux}\nTVA ${tva}`, []);
    expect(val(r, 'fournisseur_siren')?.valeur).toBe(SIREN);
    expect(val(r, 'fournisseur_tva')?.valeur).toBe(tva);
    expect(lire('SIREN 123 456 780', []).champs).toEqual([]);
    expect(val(lire(`SIRET ${luhn(SIREN + "0001")}`, []), 'fournisseur_siren')?.valeur).toBe(SIREN);
  });
  it('texte-vide-aucun-champ', () => {
    expect(lire('', [1900])).toEqual({ champs: [], ambigus: [] });
    expect(lire('Merci de votre confiance\n\n', [1900])).toEqual({ champs: [], ambigus: [] });
  });
  it('tauxconnus-vide-aucune-tva', () => {
    const r = lire('Base HT 19 % 1 000,00\nTVA 19 % 190,00\nTotal TTC 1 190,00', []);
    expect(r.champs.map((c) => c.nom)).toEqual(['ttc']);
  });
  it('echeance-et-mot-colle-ignores', () => {
    const r = lire('Date d\'échéance : 15/04/2025\nDue date 15/04/2025\nChat 12,00\nFacture nette ABC', []);
    expect(r).toEqual({ champs: [], ambigus: [] });
  });
});
