// Réception d'un courriel de dépôt : adresse à jeton révocable, SPF/DKIM, quarantaine, puis pièces jointes déposées une à une (L04-T36).
import { etapeEntree, type ContexteEntree, type ResultatEntree } from '../etape-entree.js';

export type ResultatAuth = 'pass' | 'fail' | 'none';
export interface PieceJointe { nom: string; octets: Uint8Array }
export interface MessageAnalyse {
  messageId: string; destinataire: string; expediteur: string; spf: ResultatAuth; dkim: ResultatAuth; corps: string; pieces: PieceJointe[];
}
/** Lecture réelle des formats .eml et .msg : injectée (aucune dépendance ici), fausse dans les tests. Renvoie null si illisible. */
export interface AnalyseurMessage { analyser(octets: Uint8Array, format: string): Promise<MessageAnalyse | null> }
export interface RegistreJetons { resoudre(jeton: string): Promise<{ societeId: string; revoque: boolean } | null> }
export interface QuarantaineCourriel { garder(societeId: string, message: MessageAnalyse): Promise<void> }

export interface ContexteCourriel {
  domaine: string; analyseur: AnalyseurMessage; jetons: RegistreJetons; quarantaine: QuarantaineCourriel;
  expediteurConnu(societeId: string, adresse: string): Promise<boolean>;
  corpsEstFacture(corps: string): boolean;
  entree(societeId: string): ContexteEntree;
}
export interface ResultatCourriel {
  statut: 'recu' | 'quarantaine' | 'refuse'; code?: string; societeId?: string; messageId?: string;
  origine: 'verifiee' | 'origine_non_verifiee'; pieces: ResultatEntree[]; motifs: string[]; aVerifier: boolean; contexteCorps: string;
}

const BITS_JETON = 128;
const BITS_PAR_CHIFFRE_HEX = 4;
const LONGUEUR_JETON = BITS_JETON / BITS_PAR_CHIFFRE_HEX;
const PREFIXE = 'pieces+';

const vide: ResultatCourriel = { statut: 'refuse', origine: 'verifiee', pieces: [], motifs: [], aVerifier: false, contexteCorps: '' };

function extraireJeton(adresse: string, domaine: string): string | null {
  const [local, hote, ...reste] = adresse.trim().toLowerCase().split('@');
  if (local === undefined || hote !== domaine.toLowerCase() || reste.length > 0 || !local.startsWith(PREFIXE)) return null;
  const jeton = local.slice(PREFIXE.length);
  return jeton.length === LONGUEUR_JETON && /^[0-9a-f]+$/.test(jeton) ? jeton : null;
}

export async function recevoir(brut: Uint8Array, format: string, ctx: ContexteCourriel): Promise<ResultatCourriel> {
  const message = await ctx.analyseur.analyser(brut, format);
  if (message === null) return { ...vide, code: 'message_illisible' };
  const jeton = extraireJeton(message.destinataire, ctx.domaine);
  const cible = jeton === null ? null : await ctx.jetons.resoudre(jeton);
  if (cible === null || cible.revoque) return { ...vide, code: 'jeton_invalide', messageId: message.messageId };
  const { societeId } = cible;
  const base = { ...vide, societeId, messageId: message.messageId, contexteCorps: message.corps };
  if (message.spf === 'fail' || message.dkim === 'fail') {
    await ctx.quarantaine.garder(societeId, message);
    return { ...base, statut: 'quarantaine', code: 'authentification_en_echec' };
  }
  const origine = (await ctx.expediteurConnu(societeId, message.expediteur.toLowerCase())) ? 'verifiee' : 'origine_non_verifiee';
  const entree = ctx.entree(societeId);
  const pieces: ResultatEntree[] = [];
  for (const jointe of message.pieces) pieces.push(await etapeEntree(jointe.octets, entree));
  const factureDansCorps = ctx.corpsEstFacture(message.corps);
  return { ...base, statut: 'recu', origine, pieces, motifs: factureDansCorps ? ['facture_dans_corps'] : [], aVerifier: factureDansCorps };
}
