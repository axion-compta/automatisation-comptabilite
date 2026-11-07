// Analyse sûre d'un XML : pas de DOCTYPE, pas d'entité, longueur bornée, toutes les valeurs restent des chaînes.
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type ArbreXml = Record<string, unknown>;
export type ResultatXmlSur = { arbre: ArbreXml } | { erreur: 'xml_invalide' };

const INVALIDE = { erreur: 'xml_invalide' } as const;
const INTERDIT = /<!doctype|<!entity/i;

export function analyserXmlSur(texte: string, longueurMax: number): ResultatXmlSur {
  if (typeof texte !== 'string' || !Number.isSafeInteger(longueurMax) || longueurMax < 0) return INVALIDE;
  if (texte.length === 0 || texte.length > longueurMax || INTERDIT.test(texte)) return INVALIDE;
  try {
    if (XMLValidator.validate(texte) !== true) return INVALIDE;
    const analyseur = new XMLParser({ processEntities: false, htmlEntities: false, ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false });
    const arbre: unknown = analyseur.parse(texte);
    return typeof arbre === 'object' && arbre !== null && !Array.isArray(arbre) ? { arbre: arbre as ArbreXml } : INVALIDE;
  } catch {
    return INVALIDE;
  }
}
