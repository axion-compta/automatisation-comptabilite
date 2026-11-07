// Lecture d'un XML UBL (Invoice, CreditNote) : le XML fait foi, source `xml`, aucun OCR, aucun appel d'IA.
import { lireDate, lireMontant, type ResultatMontant } from '../../../../../packages/noyau/src/pieces/lecture/formats.js';
import { nomParTaux, type ChampLu } from '../../../../../packages/noyau/src/pieces/types.js';
import type { ResultatCii } from './lire-cii.js';
import { analyserXmlSur } from './xml-sur.js';

const CONVENTION = { decimal: '.', ordreDate: 'JMA' } as const;
const SCHEMA_SIREN = '0002';
const CENTIMES_PAR_UNITE = 100;
const DECIMAL_XML = /^-?[0-9]+(\.[0-9]+)?$/; // UBL : point décimal, aucun séparateur de milliers
class Invalide extends Error {}

const enTableau = (n: unknown): unknown[] => (n === undefined ? [] : Array.isArray(n) ? n : [n]);
const objet = (n: unknown): Record<string, unknown> | undefined => (typeof n === 'object' && n !== null ? (n as Record<string, unknown>) : undefined);

function fils(n: unknown, ...chemin: string[]): unknown {
  let courant = n;
  for (const nom of chemin) courant = objet(enTableau(courant)[0])?.[nom];
  return courant;
}

/** Texte d'un élément ; un élément présent mais vide est invalide (jamais ignoré en silence). */
function texte(n: unknown): string | undefined {
  if (n === undefined) return undefined;
  const premier = enTableau(n)[0];
  const brut = objet(premier) === undefined ? premier : objet(premier)?.['#text'];
  if (typeof brut !== 'string' || brut.trim() === '') throw new Invalide();
  return brut.trim();
}

function lireStrict(brut: string): ResultatMontant {
  return DECIMAL_XML.test(brut) ? lireMontant(brut, CONVENTION) : { erreur: 'illisible' };
}

function montant(nom: string, brut: string): ChampLu {
  const m = lireStrict(brut);
  if ('erreur' in m) throw new Invalide();
  return { nom, valeur: brut, valeurCentimes: m.centimes, source: 'xml', lecteur: 'xml' };
}

const optionnel = (nom: string, brut: string | undefined): ChampLu[] => (brut === undefined ? [] : [montant(nom, brut)]);
const simple = (nom: string, valeur: string | undefined): ChampLu[] => (valeur === undefined ? [] : [{ nom, valeur, source: 'xml', lecteur: 'xml' }]);

function sirenDe(partie: unknown): string | undefined {
  for (const id of enTableau(fils(partie, 'Party', 'PartyLegalEntity', 'CompanyID'))) {
    const valeur = objet(id)?.['#text'];
    if (objet(id)?.['@_schemeID'] === SCHEMA_SIREN && typeof valeur === 'string' && /^[0-9]{9}$/.test(valeur.trim())) return valeur.trim();
  }
  return undefined;
}

function dateIso(brut: string): string {
  const d = lireDate(brut, CONVENTION);
  if ('erreur' in d) throw new Invalide();
  return d.date;
}

function champsTaxes(racine: unknown): ChampLu[] {
  const parTaux = new Map<number, { ht: number; tva: number; aHt: boolean; aTva: boolean }>();
  for (const total of enTableau(fils(racine, 'TaxTotal'))) {
    for (const s of enTableau(fils(total, 'TaxSubtotal'))) {
      const taux = texte(fils(s, 'TaxCategory', 'Percent'));
      if (taux === undefined) continue;
      const pdb = lireStrict(taux);
      if ('erreur' in pdb) throw new Invalide();
      const ligne = parTaux.get(pdb.centimes) ?? { ht: 0, tva: 0, aHt: false, aTva: false };
      for (const [cle, source] of [['ht', 'TaxableAmount'], ['tva', 'TaxAmount']] as const) {
        const brut = texte(fils(s, source));
        if (brut === undefined) continue;
        ligne[cle] += Number(montant(cle, brut).valeurCentimes);
        ligne[cle === 'ht' ? 'aHt' : 'aTva'] = true;
      }
      parTaux.set(pdb.centimes, ligne);
    }
  }
  return [...parTaux].flatMap(([taux, l]) => [
    ...(l.aHt ? [montant(nomParTaux('ht', taux), (l.ht / CENTIMES_PAR_UNITE).toFixed(2))] : []),
    ...(l.aTva ? [montant(nomParTaux('tva', taux), (l.tva / CENTIMES_PAR_UNITE).toFixed(2))] : []),
  ]);
}

export function lireUbl(xml: string, longueurMax: number): ResultatCii {
  const analyse = analyserXmlSur(xml, longueurMax);
  if ('erreur' in analyse) return analyse;
  const nomRacine = ['Invoice', 'CreditNote'].find((n) => n in analyse.arbre);
  const racine = nomRacine === undefined ? undefined : analyse.arbre[nomRacine];
  if (nomRacine === undefined || objet(racine) === undefined || Array.isArray(racine)) return { erreur: 'xml_invalide' };
  try {
    const date = texte(fils(racine, 'IssueDate'));
    const totaux = fils(racine, 'LegalMonetaryTotal');
    const champs: ChampLu[] = [
      ...simple('numero', texte(fils(racine, 'ID'))),
      ...simple('date_piece', date === undefined ? undefined : dateIso(date)),
      ...simple('devise', texte(fils(racine, 'DocumentCurrencyCode'))),
      ...(nomRacine === 'CreditNote' ? simple('type_piece', 'avoir') : []),
      ...optionnel('ttc', texte(fils(totaux, 'TaxInclusiveAmount'))),
      ...optionnel('montant_du', texte(fils(totaux, 'PayableAmount'))),
      ...champsTaxes(racine),
    ];
    const emetteurSiren = sirenDe(fils(racine, 'AccountingSupplierParty'));
    const destinataireSiren = sirenDe(fils(racine, 'AccountingCustomerParty'));
    return { profil: 'inconnu', champs, ...(emetteurSiren === undefined ? {} : { emetteurSiren }), ...(destinataireSiren === undefined ? {} : { destinataireSiren }) };
  } catch (e) {
    if (e instanceof Invalide) return { erreur: 'xml_invalide' };
    throw e;
  }
}
