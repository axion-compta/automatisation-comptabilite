// Fusion des préférences : la dernière écriture gagne, clé par clé (spec 15, PR-R1, PR-R2).
// Aucune horloge interne : `maintenant` et la tolérance sont fournis par l'appelant.
import type { Appareil } from './valider.js';

export class ErreurFusion extends Error {
  override name = 'ErreurFusion';
  constructor(readonly code: 'horodatage_invalide') {
    super(code);
  }
}

export type Origine = 'defaut' | 'personne' | 'systeme';
export type Ligne = { cle: string; appareil: Appareil; valeur: unknown; origine: Origine; modifieLe: number };
export type Ecriture = { cle: string; appareil: Appareil; valeur: unknown; modifieLeClient?: number };
export type Lecture = Record<string, { valeur: unknown; origine: Origine }>;

const entier = (n: number): number => {
  if (!Number.isSafeInteger(n)) throw new ErreurFusion('horodatage_invalide');
  return n;
};

const meme = (l: Ligne, cle: string, appareil: Appareil): boolean => l.cle === cle && l.appareil === appareil;

export function appliquerEcriture(
  lignes: readonly Ligne[],
  ecriture: Ecriture,
  options: { maintenant: number; toleranceMs: number },
): Ligne[] {
  const maintenant = entier(options.maintenant);
  const tolerance = entier(options.toleranceMs);
  if (tolerance < 0) throw new ErreurFusion('horodatage_invalide');
  const client = ecriture.modifieLeClient === undefined ? maintenant : entier(ecriture.modifieLeClient);
  const retenu = Math.min(maintenant + tolerance, Math.max(maintenant - tolerance, client));
  const { cle, appareil, valeur } = ecriture;
  const nouvelle: Ligne = { cle, appareil, valeur, origine: 'personne', modifieLe: retenu };
  const en_place = lignes.find((l) => meme(l, cle, appareil));
  if (en_place === undefined) return [...lignes, nouvelle];
  if (retenu < en_place.modifieLe) return [...lignes];
  return lignes.map((l) => (l === en_place ? nouvelle : l));
}

const termine = (v: unknown): boolean => (v as { termine?: unknown } | null)?.termine === true;

export function lirePreferences(lignes: readonly Ligne[], appareil: Appareil, defauts: Record<string, unknown>): Lecture {
  const lecture: Lecture = {};
  for (const [cle, valeur] of Object.entries(defauts)) lecture[cle] = { valeur, origine: 'defaut' };
  for (const l of lignes) {
    if (l.appareil === 'tous' && !lignes.some((o) => meme(o, l.cle, appareil))) {
      lecture[l.cle] = { valeur: l.valeur, origine: l.origine };
    }
  }
  for (const l of lignes) if (l.appareil === appareil) lecture[l.cle] = { valeur: l.valeur, origine: l.origine };
  const choisi = lecture['chat_etat']?.origine === 'personne';
  if (!choisi && !termine(lecture['premier_lancement']?.valeur)) {
    lecture['chat_etat'] = { valeur: 'elargi', origine: 'defaut' };
  }
  return lecture;
}

export function terminerInstallation(lignes: readonly Ligne[], maintenant: number): Ligne[] {
  const modifieLe = entier(maintenant);
  const systeme = (cle: string, valeur: unknown): Ligne => ({ cle, appareil: 'tous', valeur, origine: 'systeme', modifieLe });
  const choisi = lignes.some((l) => l.cle === 'chat_etat' && l.origine === 'personne');
  const retire = (l: Ligne): boolean =>
    meme(l, 'premier_lancement', 'tous') || (!choisi && meme(l, 'chat_etat', 'tous') && l.origine !== 'personne');
  const ajouts = [systeme('premier_lancement', { termine: true })];
  if (!choisi) ajouts.push(systeme('chat_etat', 'normal'));
  return [...lignes.filter((l) => !retire(l)), ...ajouts];
}
