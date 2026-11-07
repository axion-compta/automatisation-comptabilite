// Contrôle XML contre visuel : le XML fait foi, tout écart passe la pièce à vérifier.
import { type ChampLu } from '../types.js';

export interface ContexteXmlVisuel { sirenEmetteurXml?: string; sirenSociete: string; sirenDestinataireXml?: string }
export interface EcartXmlVisuel { nom: string; valeurXml: string; valeurVisuelle: string }
export interface ResultatXmlVisuel {
  decision: 'accord' | 'a_verifier' | 'refus';
  motif?: 'xml_different_du_visuel' | 'destinataire_different';
  ecarts: EcartXmlVisuel[];
  valeursRetenues: ChampLu[];
}

const alnum = (v: string): string => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
const chiffres = (v: string): string => v.replace(/\D/g, '');
const cle = (nom: string, c: ChampLu): string => {
  if (nom === 'ttc') return c.valeurCentimes === undefined ? c.valeur.trim() : 'c' + String(c.valeurCentimes);
  if (nom === 'numero') return alnum(c.valeur);
  if (nom === 'fournisseur_siren') return chiffres(c.valeur);
  return c.valeur.trim();
};

export function comparerXmlVisuel(champsXml: ChampLu[], champsVisuels: ChampLu[], ctx: ContexteXmlVisuel): ResultatXmlVisuel {
  const valeursRetenues = [...champsXml];
  const dest = chiffres(ctx.sirenDestinataireXml ?? '');
  if (dest !== '' && dest !== chiffres(ctx.sirenSociete)) return { decision: 'refus', motif: 'destinataire_different', ecarts: [], valeursRetenues };
  const ecarts: EcartXmlVisuel[] = [];
  for (const nom of ['ttc', 'numero', 'date_piece', 'fournisseur_siren']) {
    const v = champsVisuels.find((c) => c.nom === nom && c.valeur.trim() !== '');
    if (v === undefined) continue;
    const x = champsXml.find((c) => c.nom === nom) ?? (nom === 'fournisseur_siren' && ctx.sirenEmetteurXml ? ({ nom, valeur: ctx.sirenEmetteurXml, source: 'xml', lecteur: 'xml' } as ChampLu) : undefined);
    if (x !== undefined && cle(nom, x) !== cle(nom, v)) ecarts.push({ nom, valeurXml: x.valeur, valeurVisuelle: v.valeur });
  }
  return ecarts.length > 0 ? { decision: 'a_verifier', motif: 'xml_different_du_visuel', ecarts, valeursRetenues } : { decision: 'accord', ecarts, valeursRetenues };
}
