import { describe, expect, it } from 'vitest';
import { lireCii } from '../lire-cii.js';
import { analyserXmlSur } from '../xml-sur.js';

const MAX = 100_000;
const GUIDE = 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:';

interface Options { profil?: string; date?: string; taxes?: string; entete?: string; vendeur?: string; acheteur?: string }

function taxe(taux: string, base: string, tva: string): string {
  return `<ram:ApplicableTradeTax><ram:CalculatedAmount>${tva}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>${base}</ram:BasisAmount><ram:RateApplicablePercent>${taux}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`;
}

function cii(o: Options = {}): string {
  const date = o.date ?? '20260115';
  return `${o.entete ?? ''}<rsm:CrossIndustryInvoice xmlns:rsm="urn:exemple:rsm" xmlns:ram="urn:exemple:ram" xmlns:udt="urn:exemple:udt">
<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${GUIDE}${o.profil ?? 'basic'}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument><ram:ID>FA-2026-001</ram:ID><ram:IssueDateTime><udt:DateTimeString format="102">${date}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction>
<ram:ApplicableHeaderTradeAgreement>
<ram:SellerTradeParty><ram:Name>Atelier Fictif</ram:Name>${o.vendeur ?? '<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">123456782</ram:ID></ram:SpecifiedLegalOrganization>'}</ram:SellerTradeParty>
<ram:BuyerTradeParty><ram:Name>Client Fictif</ram:Name>${o.acheteur ?? '<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">987654321</ram:ID></ram:SpecifiedLegalOrganization>'}</ram:BuyerTradeParty>
</ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
${o.taxes ?? taxe('20.00', '100.00', '20.00')}
<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:GrandTotalAmount>120.00</ram:GrandTotalAmount><ram:DuePayableAmount>120.00</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
</ram:ApplicableHeaderTradeSettlement>
</rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;
}

function lire(texte: string) {
  const r = lireCii(texte, MAX);
  if ('erreur' in r) throw new Error('XML refusé : ' + r.erreur);
  return r;
}

function champ(r: ReturnType<typeof lire>, nom: string) {
  return r.champs.find((c) => c.nom === nom);
}

describe('lireCii', () => {
  it('cii-un-taux', () => {
    const r = lire(cii());
    expect(r.profil).toBe('basic');
    expect(champ(r, 'numero')?.valeur).toBe('FA-2026-001');
    expect(champ(r, 'devise')?.valeur).toBe('EUR');
    expect(champ(r, 'ttc')?.valeurCentimes).toBe(12000);
    expect(champ(r, 'montant_du')?.valeurCentimes).toBe(12000);
    expect(champ(r, 'ht@2000')?.valeurCentimes).toBe(10000);
    expect(champ(r, 'tva@2000')?.valeurCentimes).toBe(2000);
    expect(r.champs.every((c) => c.source === 'xml' && c.lecteur === 'xml')).toBe(true);
  });

  it('cii-trois-taux', () => {
    const taxes = taxe('20.00', '100.00', '20.00') + taxe('10', '50.00', '5.00') + taxe('5.5', '200.00', '11.00');
    const r = lire(cii({ taxes }));
    expect(champ(r, 'ht@2000')?.valeurCentimes).toBe(10000);
    expect(champ(r, 'ht@1000')?.valeurCentimes).toBe(5000);
    expect(champ(r, 'tva@1000')?.valeurCentimes).toBe(500);
    expect(champ(r, 'ht@550')?.valeurCentimes).toBe(20000);
    expect(champ(r, 'tva@550')?.valeurCentimes).toBe(1100);
    expect(r.champs.filter((c) => c.nom.startsWith('ht@'))).toHaveLength(3);
  });

  it('cii-meme-taux-additionne', () => {
    const r = lire(cii({ taxes: taxe('0', '100.00', '0.00') + taxe('0.00', '50.50', '0.00') }));
    expect(champ(r, 'ht@0')?.valeurCentimes).toBe(15050);
    expect(champ(r, 'ht@0')?.valeur).toBe('150.50');
    expect(champ(r, 'tva@0')?.valeurCentimes).toBe(0);
    expect(r.champs.filter((c) => c.nom.startsWith('ht@'))).toHaveLength(1);
  });

  it('profil-minimum-sans-lignes', () => {
    const r = lire(cii({ profil: 'minimum', taxes: '' }));
    expect(r.profil).toBe('minimum');
    expect(champ(r, 'ttc')?.valeurCentimes).toBe(12000);
    expect(r.champs.some((c) => c.nom.startsWith('ht@') || c.nom.startsWith('tva@'))).toBe(false);
    expect(lire(cii({ profil: 'basicwl' })).profil).toBe('basicwl');
    expect(lire(cii({ profil: 'extended' })).profil).toBe('extended');
    expect(lire(cii({ profil: 'en16931' })).profil).toBe('en16931');
  });

  it('doctype-refuse', () => {
    expect(lireCii(cii({ entete: '<!DOCTYPE rsm>' }), MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii(cii({ entete: '<!doctype rsm>' }), MAX)).toEqual({ erreur: 'xml_invalide' });
  });

  it('entite-refusee', () => {
    const entete = '<!ENTITY x "valeur">';
    expect(lireCii(cii({ entete }), MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(analyserXmlSur('<a>&lt;</a>' + entete, MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(analyserXmlSur('<a>&lt;b&gt;</a>', MAX)).toEqual({ arbre: { a: '&lt;b&gt;' } });
    expect(analyserXmlSur('<a><!-- <!ENTITY x "y"> --></a>', MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(analyserXmlSur(cii(), 10)).toEqual({ erreur: 'xml_invalide' });
    for (const max of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(analyserXmlSur('<a/>', max)).toEqual({ erreur: 'xml_invalide' });
    }
  });

  it('xml-mal-forme-invalide', () => {
    expect(lireCii('', MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii('pas du xml', MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii(cii().replace('</ram:ID></ram:Guideline', '</ram:X></ram:Guideline'), MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii(cii().slice(0, -30), MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii(cii({ taxes: taxe('20.00', '1,0', '2.00') }), MAX)).toEqual({ erreur: 'xml_invalide' });
  });

  it('racine-inconnue-invalide', () => {
    expect(lireCii('<Facture><ID>1</ID></Facture>', MAX)).toEqual({ erreur: 'xml_invalide' });
    expect(lireCii('<a/>', MAX)).toEqual({ erreur: 'xml_invalide' });
  });

  it('date-format-102', () => {
    expect(champ(lire(cii({ date: '20261231' })), 'date_piece')?.valeur).toBe('2026-12-31');
    for (const date of ['2026-12-31', '20261331', '20260230', '2026123']) {
      expect(lireCii(cii({ date }), MAX)).toEqual({ erreur: 'xml_invalide' });
    }
  });

  it('siren-emetteur-et-destinataire', () => {
    const r = lire(cii());
    expect(r.emetteurSiren).toBe('123456782');
    expect(r.destinataireSiren).toBe('987654321');
    const autre = '<ram:SpecifiedLegalOrganization><ram:ID schemeID="0009">555555555</ram:ID></ram:SpecifiedLegalOrganization>';
    const sansSiren = lire(cii({ vendeur: autre, acheteur: '' }));
    expect(sansSiren.emetteurSiren).toBeUndefined();
    expect(sansSiren.destinataireSiren).toBeUndefined();
  });
});
