// Contrôle CC-T13 : mention de franchise attendue selon la date de la facture.
// Les périodes d'effet viennent d'un paramètre daté : aucune date ici. Aucun texte affiché : seulement des codes.
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';
import type { ParametreLu } from './commun.js';

export interface MentionDatee {
  texte: string;
  /** AAAA-MM-JJ, inclus */
  debut: string;
  /** AAAA-MM-JJ, exclue ; null = sans fin */
  fin: string | null;
  statut: ParametreLu['statut'];
}

export interface ObjetMention {
  dateFacture: string;
  mentionsLues: readonly string[];
  liste: readonly MentionDatee[];
  /** Mentions tolérées après leur remplacement (même forme, fins datées et exclues) ; absente ou vide = aucune. */
  toleree?: readonly MentionDatee[];
}

const FORME_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

function exigerDate(s: string): void {
  const m = FORME_DATE.exec(s);
  const d = m === null ? null : new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (m === null || d === null || d.toISOString().slice(0, 10) !== s) throw new ErreurControle('entree_invalide');
}

function exigerListe(liste: readonly MentionDatee[]): void {
  if (liste.length === 0) throw new ErreurControle('entree_invalide');
  for (const m of liste) {
    exigerDate(m.debut);
    if (m.fin !== null) {
      exigerDate(m.fin);
      if (m.fin <= m.debut) throw new ErreurControle('entree_invalide');
    }
  }
}

/** Mentions en vigueur à la date : début inclus, fin exclue. */
export function mentionsAdmises(liste: readonly MentionDatee[], date: string): MentionDatee[] {
  exigerDate(date);
  exigerListe(liste);
  return liste.filter((m) => m.debut <= date && (m.fin === null || date < m.fin));
}

function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/’/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluerMention(o: ObjetMention): SortieRegle {
  const tolerees = o.toleree === undefined || o.toleree.length === 0 ? [] : mentionsAdmises(o.toleree, o.dateFacture);
  const admises = [...mentionsAdmises(o.liste, o.dateFacture), ...tolerees];
  const lues = o.mentionsLues.map(normaliser).filter((t) => t !== '');
  if (lues.length === 0) return alerte(undefined, 'absente');
  const sourceAVerifier = admises.length > 0 && admises.every((m) => m.statut !== 'valide');
  const trouvee = admises.some((m) => lues.includes(normaliser(m.texte)));
  if (trouvee) return sourceAVerifier ? { resultat: 'OK', valeur: 'source_a_verifier' } : ok();
  return alerte(undefined, sourceAVerifier ? 'source_a_verifier' : 'non_admise_a_cette_date');
}

export const regleCCT13: RegleControle<ObjetMention> = {
  id: 'CC-T13',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['arrivee', 'a_la_demande'] satisfies Declencheur[],
  actif: true,
  evaluer: evaluerMention,
};
