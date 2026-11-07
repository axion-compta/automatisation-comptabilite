// Lecture d'un XML CII (Factur-X) déjà extrait : le XML fait foi, source `xml`, aucun OCR, aucun appel d'IA.
import { lireDate, lireMontant } from '../../../../../packages/noyau/src/pieces/lecture/formats.js';
import { nomParTaux, type ChampLu } from '../../../../../packages/noyau/src/pieces/types.js';
import { analyserXmlSur } from './xml-sur.js';

export type ProfilCii = 'minimum' | 'basicwl' | 'basic' | 'en16931' | 'extended' | 'inconnu';
export type ResultatCii =
  | { profil: ProfilCii; champs: ChampLu[]; emetteurSiren?: string; destinataireSiren?: string }
  | { erreur: 'xml_invalide' };

const CONVENTION = { decimal: '.', ordreDate: 'JMA' } as const;
const SCHEMA_SIREN = '0002';
const PROFILS: readonly ProfilCii[] = ['minimum', 'basicwl', 'basic', 'extended'];

class Invalide extends Error {}

function enTableau(n: unknown): unknown[] {
  return n === undefined ? [] : Array.isArray(n) ? n : [n];
}

function fils(n: unknown, ...chemin: string[]): unknown {
  let courant = n;
  for (const nom of chemin) {
    const premier = enTableau(courant)[0];
    if (typeof premier !== 'object' || premier === null) return undefined;
    courant = (premier as Record<string, unknown>)[nom];
  }
  return courant;
}

function texte(n: unknown): string | undefined {
  const premier = enTableau(n)[0];
  const brut = typeof premier === 'object' && premier !== null ? (premier as Record<string, unknown>)['#text'] : premier;
  return typeof brut === 'string' && brut.trim() !== '' ? brut.trim() : undefined;
}

function profilDe(identifiant: string | undefined): ProfilCii {
  if (identifiant === undefined) return 'inconnu';
  const minuscules = identifiant.toLowerCase();
  const fin = minuscules.slice(minuscules.lastIndexOf(':') + 1);
  const trouve = PROFILS.find((p) => p === fin);
  if (trouve !== undefined) return trouve;
  return minuscules.includes('en16931') ? 'en16931' : 'inconnu';
}

function montant(nom: string, brut: string): ChampLu {
  const m = lireMontant(brut, CONVENTION);
  if ('erreur' in m) throw new Invalide();
  return { nom, valeur: brut, valeurCentimes: m.centimes, source: 'xml', lecteur: 'xml' };
}

function sirenDe(partie: unknown): string | undefined {
  for (const id of enTableau(fils(partie, 'SpecifiedLegalOrganization', 'ID'))) {
    const schema = typeof id === 'object' && id !== null ? (id as Record<string, unknown>)['@_schemeID'] : undefined;
    const valeur = texte(id);
    if (schema === SCHEMA_SIREN && valeur !== undefined && /^[0-9]{9}$/.test(valeur)) return valeur;
  }
  return undefined;
}

function dateIso(brut: string): string {
  const m = /^([0-9]{4})([0-9]{2})([0-9]{2})$/.exec(brut);
  const d = m === null ? { erreur: 'illisible' as const } : lireDate(`${m[1]}-${m[2]}-${m[3]}`, CONVENTION);
  if ('erreur' in d) throw new Invalide();
  return d.date;
}

function champsTaxes(reglement: unknown): ChampLu[] {
  const champs: ChampLu[] = [];
  const vus = new Set<string>();
  for (const t of enTableau(fils(reglement, 'ApplicableTradeTax'))) {
    const taux = texte(fils(t, 'RateApplicablePercent'));
    if (taux === undefined) continue;
    const pdb = lireMontant(taux, CONVENTION);
    if ('erreur' in pdb || vus.has(String(pdb.centimes))) throw new Invalide();
    vus.add(String(pdb.centimes));
    const base = texte(fils(t, 'BasisAmount'));
    const tva = texte(fils(t, 'CalculatedAmount'));
    if (base !== undefined) champs.push(montant(nomParTaux('ht', pdb.centimes), base));
    if (tva !== undefined) champs.push(montant(nomParTaux('tva', pdb.centimes), tva));
  }
  return champs;
}

function simple(nom: string, valeur: string | undefined): ChampLu[] {
  return valeur === undefined ? [] : [{ nom, valeur, source: 'xml', lecteur: 'xml' }];
}

export function lireCii(xml: string, longueurMax: number): ResultatCii {
  const analyse = analyserXmlSur(xml, longueurMax);
  if ('erreur' in analyse) return analyse;
  const racine = analyse.arbre['CrossIndustryInvoice'];
  if (typeof racine !== 'object' || racine === null || Array.isArray(racine)) return { erreur: 'xml_invalide' };
  try {
    const profil = profilDe(texte(fils(racine, 'ExchangedDocumentContext', 'GuidelineSpecifiedDocumentContextParameter', 'ID')));
    const document = fils(racine, 'ExchangedDocument');
    const transaction = fils(racine, 'SupplyChainTradeTransaction');
    const accord = fils(transaction, 'ApplicableHeaderTradeAgreement');
    const reglement = fils(transaction, 'ApplicableHeaderTradeSettlement');
    const totaux = fils(reglement, 'SpecifiedTradeSettlementHeaderMonetarySummation');
    const date = texte(fils(document, 'IssueDateTime', 'DateTimeString'));
    const ttc = texte(fils(totaux, 'GrandTotalAmount'));
    const du = texte(fils(totaux, 'DuePayableAmount'));
    const champs: ChampLu[] = [
      ...simple('numero', texte(fils(document, 'ID'))),
      ...simple('date_piece', date === undefined ? undefined : dateIso(date)),
      ...simple('devise', texte(fils(reglement, 'InvoiceCurrencyCode'))),
      ...(ttc === undefined ? [] : [montant('ttc', ttc)]),
      ...(du === undefined ? [] : [montant('montant_du', du)]),
      ...champsTaxes(reglement),
    ];
    const emetteurSiren = sirenDe(fils(accord, 'SellerTradeParty'));
    const destinataireSiren = sirenDe(fils(accord, 'BuyerTradeParty'));
    return {
      profil,
      champs,
      ...(emetteurSiren === undefined ? {} : { emetteurSiren }),
      ...(destinataireSiren === undefined ? {} : { destinataireSiren }),
    };
  } catch (e) {
    if (e instanceof Invalide) return { erreur: 'xml_invalide' };
    throw e;
  }
}
