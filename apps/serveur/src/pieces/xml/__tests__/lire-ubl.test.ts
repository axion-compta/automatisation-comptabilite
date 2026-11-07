import { describe, expect, it } from 'vitest';
import { lireUbl } from '../lire-ubl.js';

const MAX = 100_000;
const INVALIDE = { erreur: 'xml_invalide' };
interface Options { racine?: string; taxes?: string; ttc?: string; entete?: string; vendeur?: string; acheteur?: string }

function sous(taux: string, base: string, tva: string): string {
  return `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${base}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${tva}</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>${taux}</cbc:Percent></cac:TaxCategory></cac:TaxSubtotal>`;
}
const siren = (n: string, schema = '0002'): string => `<cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID="${schema}">${n}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party>`;

function ubl(o: Options = {}): string {
  const r = o.racine ?? 'Invoice';
  return `${o.entete ?? ''}<${r} xmlns="urn:exemple:ubl" xmlns:cac="urn:exemple:cac" xmlns:cbc="urn:exemple:cbc">
<cbc:ID>FA-2026-001</cbc:ID><cbc:IssueDate>2026-01-15</cbc:IssueDate><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty>${o.vendeur ?? siren('123456782')}</cac:AccountingSupplierParty>
<cac:AccountingCustomerParty>${o.acheteur ?? siren('987654321')}</cac:AccountingCustomerParty>
<cac:TaxTotal>${o.taxes ?? sous('20.00', '100.00', '20.00')}</cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:TaxInclusiveAmount currencyID="EUR">${o.ttc ?? '120.00'}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">120.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
</${r}>`;
}

function lire(texte: string) {
  const r = lireUbl(texte, MAX);
  if ('erreur' in r) throw new Error('XML refusé : ' + r.erreur);
  return r;
}
const champ = (r: ReturnType<typeof lire>, nom: string) => r.champs.find((c) => c.nom === nom);

describe('lireUbl', () => {
  it('ubl-facture-un-taux', () => {
    const r = lire(ubl());
    expect(r.profil).toBe('inconnu');
    expect(champ(r, 'numero')?.valeur).toBe('FA-2026-001');
    expect(champ(r, 'date_piece')?.valeur).toBe('2026-01-15');
    expect(champ(r, 'devise')?.valeur).toBe('EUR');
    expect(champ(r, 'ttc')?.valeurCentimes).toBe(12000);
    expect(champ(r, 'montant_du')?.valeurCentimes).toBe(12000);
    expect(champ(r, 'ht@2000')?.valeurCentimes).toBe(10000);
    expect(champ(r, 'tva@2000')?.valeurCentimes).toBe(2000);
    expect(champ(r, 'type_piece')).toBeUndefined();
    expect(r.champs.every((c) => c.source === 'xml' && c.lecteur === 'xml')).toBe(true);
  });

  it('ubl-plusieurs-sous-totaux', () => {
    const r = lire(ubl({ taxes: sous('20.00', '100.00', '20.00') + sous('10', '50.00', '5.00') + sous('5.5', '200.00', '11.00') }));
    expect(champ(r, 'ht@2000')?.valeurCentimes).toBe(10000);
    expect(champ(r, 'tva@1000')?.valeurCentimes).toBe(500);
    expect(champ(r, 'ht@550')?.valeurCentimes).toBe(20000);
    expect(champ(r, 'tva@550')?.valeurCentimes).toBe(1100);
    expect(r.champs.filter((c) => c.nom.startsWith('ht@'))).toHaveLength(3);
  });

  it('ubl-avoir', () => {
    const r = lire(ubl({ racine: 'CreditNote' }));
    expect(champ(r, 'type_piece')).toMatchObject({ valeur: 'avoir', source: 'xml', lecteur: 'xml' });
    expect(champ(r, 'ttc')?.valeurCentimes).toBe(12000);
  });

  it('racine-inconnue-invalide', () => {
    expect(lireUbl(ubl({ racine: 'Facture' }), MAX)).toEqual(INVALIDE);
    expect(lireUbl('<a/>', MAX)).toEqual(INVALIDE);
    expect(lireUbl('', MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl().slice(0, -20), MAX)).toEqual(INVALIDE);
  });

  it('doctype-refuse', () => {
    expect(lireUbl(ubl({ entete: '<!DOCTYPE Invoice>' }), MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl({ entete: '<!ENTITY x "valeur">' }), MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl(), 10)).toEqual(INVALIDE);
  });

  it('montant-illisible-invalide', () => {
    for (const ttc of ['1,200.00', '', 'NaN', 'Infinity']) expect(lireUbl(ubl({ ttc }), MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl({ taxes: sous('20.00', '1,0', '2.00') }), MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl({ taxes: sous('abc', '1.00', '2.00') }), MAX)).toEqual(INVALIDE);
    expect(lireUbl(ubl().replace('2026-01-15', '2026-02-30'), MAX)).toEqual(INVALIDE);
  });

  it('siren-emetteur-et-destinataire', () => {
    const r = lire(ubl());
    expect(r.emetteurSiren).toBe('123456782');
    expect(r.destinataireSiren).toBe('987654321');
    const sans = lire(ubl({ vendeur: siren('555555555', '0009'), acheteur: siren('12345') }));
    expect(sans.emetteurSiren).toBeUndefined();
    expect(sans.destinataireSiren).toBeUndefined();
  });
});
