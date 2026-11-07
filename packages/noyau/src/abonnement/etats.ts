// Priorité choisie par conception : un impayé signalé l'emporte sur la période d'essai.
import { ErreurAbonnement, verifierDate, type EtatAcces, type EtatVoulu } from './types.js';

const ETATS_VOULUS = ['actif', 'pause', 'arrete'];
const invalide = () => new ErreurAbonnement('etat_voulu_invalide');
const present = (x: unknown) => x !== undefined;

export function verifierEtatVoulu(v: EtatVoulu): void {
  if (typeof v !== 'object' || v === null || !ETATS_VOULUS.includes(v.etat)) throw invalide();
  if (!Number.isSafeInteger(v.version) || !(v.version >= 1)) throw invalide();
  if (typeof v.arretEnvois !== 'boolean') throw invalide();
  if (present(v.droitsUsage) && (!Array.isArray(v.droitsUsage) || v.droitsUsage.some((d) => typeof d !== 'string' || d === ''))) throw invalide();
  if (present(v.impayeSignale) && typeof v.impayeSignale !== 'boolean') throw invalide();
  if (present(v.periodeEssaiFin)) verifierDate(v.periodeEssaiFin as string);
  if (present(v.dateFin)) verifierDate(v.dateFin as string);
}

export function etatDuModule(voulu: EtatVoulu, aujourdhui: string): EtatAcces {
  verifierEtatVoulu(voulu);
  verifierDate(aujourdhui);
  if (voulu.etat === 'pause') return 'LECTURE_SEULE';
  if (voulu.etat === 'arrete') {
    return voulu.dateFin !== undefined && voulu.dateFin < aujourdhui ? 'RESILIE' : 'SUSPENDU';
  }
  if (voulu.impayeSignale === true) return 'DELAI_DE_GRACE';
  if (voulu.periodeEssaiFin !== undefined && aujourdhui <= voulu.periodeEssaiFin) return 'ESSAI';
  return 'ACTIF';
}

export type Banniere = {
  etat: EtatAcces; cause: string; consequence: string; prochaineEtapeLe: string | null;
  lien: 'portail_abonnement' | 'contacter_axion';
};

const CAUSES: Record<Exclude<EtatAcces, 'ACTIF'>, [string, string]> = {
  ESSAI: ['periode_essai', 'acces_complet_temporaire'],
  DELAI_DE_GRACE: ['impaye_signale', 'agents_arretes'],
  LECTURE_SEULE: ['pause_demandee', 'lecture_seulement'],
  SUSPENDU: ['contrat_arrete', 'acces_suspendu'],
  RESILIE: ['contrat_resilie', 'acces_ferme'],
};

export function contenuBanniere(etat: EtatAcces, voulu: EtatVoulu, branche: boolean): Banniere | null {
  if (etat === 'ACTIF') return null;
  const [cause, consequence] = CAUSES[etat];
  let prochaine: string | null = null;
  if (etat === 'ESSAI') prochaine = voulu.periodeEssaiFin ?? null;
  else if (etat === 'SUSPENDU') prochaine = voulu.dateFin ?? null;
  return { etat, cause, consequence, prochaineEtapeLe: prochaine, lien: branche ? 'portail_abonnement' : 'contacter_axion' };
}
