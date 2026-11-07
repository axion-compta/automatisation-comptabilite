// Mode simulé (ia.mode = simule) : réponses enregistrées, retrouvées par l'empreinte de l'entrée normalisée. Zéro réseau.
import { createHash } from 'node:crypto';
import { ErreurModele, type ModeleTexte, type ReponseModele } from './appel.js';

export type ReponseEnregistree = { texte: string; jetons: number; coutMicroCentimes: number };
export type ReponsesSimulees = Record<string, ReponseEnregistree>;

export class ErreurNonEnregistree extends ErreurModele {
  readonly code = 'non_enregistree';
  constructor() {
    super('client');
  }
}

/** NFC, fins de ligne `\n`, espaces de fin de ligne retirés, suites d'espaces réduites à une. */
export function normaliser(entree: string): string {
  return entree
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]+$/, '')
    .replace(/[ \t]{2,}/g, ' ');
}

export function empreinte(entree: string): string {
  return createHash('sha256').update(normaliser(entree), 'utf8').digest('hex');
}

export function creerModeleSimule(reponses: ReponsesSimulees): ModeleTexte {
  const table = new Map(Object.entries(reponses));
  return {
    completer(_alias: string, entree: string): Promise<ReponseModele> {
      const r = table.get(empreinte(entree));
      if (r === undefined) return Promise.reject(new ErreurNonEnregistree());
      return Promise.resolve({ texte: r.texte, jetons: r.jetons, coutMicroCentimes: r.coutMicroCentimes, modele: 'simule', version: 'simule' });
    },
  };
}

/** Copie complétée ; l'original n'est pas modifié. */
export function enregistrer(reponses: ReponsesSimulees, entree: string, reponse: ReponseEnregistree): ReponsesSimulees {
  return { ...reponses, [empreinte(entree)]: { ...reponse } };
}
