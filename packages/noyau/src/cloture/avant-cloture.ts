// Questionnaire bloquant et contrôles chiffrés avant clôture (préfixes passés en argument).
import { centimes, formater, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { balance } from '../livres/balance.js';

export class ErreurCloture extends Error {
  override name = 'ErreurCloture';
}

export interface ReponseQuestionnaire {
  sujet: string;
  reponse: 'oui' | 'non' | 'neant';
  nomRepondant?: string | undefined;
  date?: string | undefined;
}

export interface BloquantQuestionnaire {
  sujet: string;
  code: 'sujet_non_couvert' | 'neant_sans_nom' | 'sans_reponse';
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function evaluerQuestionnaire(
  reponses: readonly ReponseQuestionnaire[],
  config: { sujetsAttendus: readonly string[]; sujetsCouverts: readonly string[] },
): { ok: boolean; bloquants: BloquantQuestionnaire[] } {
  // La dernière réponse d'un sujet est la seule qui compte.
  const derniere = new Map<string, ReponseQuestionnaire>();
  for (const r of reponses) derniere.set(r.sujet, r);
  const bloquants: BloquantQuestionnaire[] = [];
  for (const sujet of config.sujetsAttendus) {
    if (!derniere.has(sujet)) bloquants.push({ sujet, code: 'sans_reponse' });
  }
  for (const [sujet, r] of derniere) {
    if (r.reponse === 'oui' && !config.sujetsCouverts.includes(sujet)) {
      bloquants.push({ sujet, code: 'sujet_non_couvert' });
    } else if (r.reponse === 'neant' && (r.nomRepondant ?? '').trim() === '') {
      bloquants.push({ sujet, code: 'neant_sans_nom' });
    }
  }
  bloquants.sort((a, b) => comparer(a.sujet, b.sujet) || comparer(a.code, b.code));
  return { ok: bloquants.length === 0, bloquants };
}

export interface EntreeControles {
  ecritures: readonly Ecriture[];
  prefixeAttente: string;
  prefixeBanque: string;
  soldeReleve: Centimes;
  immobilisationsRevues: boolean;
}

export interface ControleCloture {
  id: 'CLO-01' | 'CLO-02' | 'CLO-03' | 'CLO-04' | 'CLO-05';
  ok: boolean;
  valeur: string;
  ecartCentimes?: Centimes;
}

export function controlesAvantCloture(entree: EntreeControles): ControleCloture[] {
  if (entree.prefixeAttente.trim() === '' || entree.prefixeBanque.trim() === '') {
    throw new ErreurCloture('Un préfixe de compte vide est refusé.');
  }
  if (!Number.isSafeInteger(entree.soldeReleve)) {
    throw new ErreurCloture('Le solde du relevé doit être un entier de centimes.');
  }
  const brouillons = entree.ecritures.filter((e) => e.statut === 'brouillon').length;
  const b = balance(entree.ecritures);
  let attente = 0;
  let banque = 0;
  for (const l of b.lignes) {
    if (l.compte.startsWith(entree.prefixeAttente)) attente += Math.abs(l.solde);
    if (l.compte.startsWith(entree.prefixeBanque)) banque += l.solde;
  }
  const ecartAttente = centimes(attente);
  const ecartBanque = soustraire(centimes(banque), entree.soldeReleve);
  const ecartBalance = soustraire(b.totaux.debit, b.totaux.credit);
  return [
    { id: 'CLO-01', ok: brouillons === 0, valeur: String(brouillons) },
    { id: 'CLO-02', ok: ecartAttente === 0, valeur: formater(ecartAttente), ecartCentimes: ecartAttente },
    { id: 'CLO-03', ok: ecartBanque === 0, valeur: formater(ecartBanque), ecartCentimes: ecartBanque },
    { id: 'CLO-04', ok: ecartBalance === 0, valeur: formater(ecartBalance), ecartCentimes: ecartBalance },
    { id: 'CLO-05', ok: entree.immobilisationsRevues, valeur: entree.immobilisationsRevues ? 'oui' : 'non' },
  ];
}
