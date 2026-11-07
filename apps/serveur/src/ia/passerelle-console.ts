// Adaptateur de la passerelle d'IA de la console : texte en entrée, texte en sortie.
// Liste fermée lue dans la configuration ; alias absent = refus avant l'appel ; aucun contenu journalisé.
import { ErreurModele, type ModeleTexte, type ReponseModele } from './appel.js';

export type DemandeConsole = { alias: string; entree: string; signal: AbortSignal };
export type CompleterConsole = (demande: DemandeConsole) => Promise<ReponseModele>;
export type EvenementConsole =
  | { type: 'ia.console.alias_refuse'; alias: string }
  | { type: 'ia.console.ok'; alias: string; jetons: number; coutMicroCentimes: number }
  | { type: 'ia.console.echec'; alias: string; sorte: 'serveur' | 'delai' | 'client' };

const DEBUT_ERREUR_CLIENT = 400;
const FIN_ERREUR_CLIENT = 500;

export function lireListeFermee(configuration: unknown): readonly string[] {
  if (!Array.isArray(configuration) || configuration.length === 0) throw new Error('liste_fermee_invalide');
  const alias: string[] = [];
  for (const a of configuration as unknown[]) {
    if (typeof a !== 'string' || a.trim() === '') throw new Error('liste_fermee_invalide');
    alias.push(a);
  }
  return alias;
}

function classer(e: unknown): 'serveur' | 'delai' | 'client' {
  if (e instanceof ErreurModele) return e.sorte;
  if (typeof e === 'object' && e !== null) {
    const { name, statut } = e as { name?: unknown; statut?: unknown };
    if (name === 'AbortError') return 'delai';
    if (typeof statut === 'number' && statut >= DEBUT_ERREUR_CLIENT && statut < FIN_ERREUR_CLIENT) return 'client';
  }
  return 'serveur';
}

function valide(r: unknown): r is ReponseModele {
  if (typeof r !== 'object' || r === null) return false;
  const { texte, jetons, coutMicroCentimes, modele, version } = r as Record<string, unknown>;
  return (
    typeof texte === 'string' &&
    typeof modele === 'string' &&
    typeof version === 'string' &&
    Number.isSafeInteger(jetons) &&
    (jetons as number) >= 0 &&
    Number.isSafeInteger(coutMicroCentimes) &&
    (coutMicroCentimes as number) >= 0
  );
}

export function creerModeleConsole(deps: {
  completer: CompleterConsole;
  listeFermee: readonly string[];
  journaliser: (e: EvenementConsole) => void;
}): ModeleTexte {
  return {
    async completer(alias, entree, signal) {
      if (!deps.listeFermee.includes(alias)) {
        deps.journaliser({ type: 'ia.console.alias_refuse', alias });
        throw new ErreurModele('client');
      }
      let reponse: unknown;
      try {
        reponse = await deps.completer({ alias, entree, signal });
      } catch (e) {
        const sorte = classer(e);
        deps.journaliser({ type: 'ia.console.echec', alias, sorte });
        throw new ErreurModele(sorte);
      }
      if (!valide(reponse)) {
        deps.journaliser({ type: 'ia.console.echec', alias, sorte: 'serveur' });
        throw new ErreurModele('serveur');
      }
      const { texte, jetons, coutMicroCentimes, modele, version } = reponse;
      deps.journaliser({ type: 'ia.console.ok', alias, jetons, coutMicroCentimes });
      return { texte, jetons, coutMicroCentimes, modele, version };
    },
  };
}
