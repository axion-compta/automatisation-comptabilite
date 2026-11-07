import { CANAUX, type Canal } from '../securite/types.js';
import { empreinteChainee, empreinteInitiale, ErreurJournal as ErreurContenu, FORMAT_CANONIQUE } from './canonique.js';
import { verifierSansSecret } from './filtre.js';

export type CodeJournal =
  | 'societe_differente' | 'canal_invalide' | 'evenement_invalide' | 'acteur_absent'
  | 'horodatage_invalide' | 'tete_invalide' | 'lot_invalide' | 'contenu_invalide'
  | 'secret_dans_le_journal';

export class ErreurJournal extends Error {
  override name = 'ErreurJournal';
  readonly code: CodeJournal;
  readonly chemins: readonly string[];
  constructor(code: CodeJournal, chemins: readonly string[] = []) {
    super(code);
    this.code = code;
    this.chemins = chemins;
  }
}

export type Tete = { societeId: string; sequence: number; empreinte: string };
export type Brouillon = {
  societeId: string; horodatage: string; acteur: string; canal: Canal; evenement: string;
  motif?: string; avant?: unknown; apres?: unknown;
};
export type EntreeJournal = Brouillon & {
  sequence: number; formatCanonique: number; empreintePrecedente: string; empreinte: string;
};

const FORME_EVENEMENT = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const refuser = (c: CodeJournal): never => {
  throw new ErreurJournal(c);
};
const texte = (v: unknown): v is string => typeof v === 'string' && v !== '';

export function teteInitiale(societeId: string, creeLe: string): Tete {
  return { societeId, sequence: 0, empreinte: empreinteInitiale(societeId, creeLe) };
}

export function ajouterEntree(tete: Tete, b: Brouillon): { entree: EntreeJournal; tete: Tete } {
  if (!tete || !texte(tete.societeId) || !Number.isSafeInteger(tete.sequence) || tete.sequence < 0 || !texte(tete.empreinte)) {
    refuser('tete_invalide');
  }
  if (b.societeId !== tete.societeId) refuser('societe_differente');
  if (!(CANAUX as readonly unknown[]).includes(b.canal)) refuser('canal_invalide');
  if (typeof b.evenement !== 'string' || !FORME_EVENEMENT.test(b.evenement)) refuser('evenement_invalide');
  if (!texte(b.acteur)) refuser('acteur_absent');
  if (!texte(b.horodatage) || Number.isNaN(Date.parse(b.horodatage))) refuser('horodatage_invalide');
  const fautes = verifierSansSecret({ acteur: b.acteur, motif: b.motif, avant: b.avant, apres: b.apres });
  if (fautes.length > 0) throw new ErreurJournal('secret_dans_le_journal', fautes);
  const entree: Omit<EntreeJournal, 'empreinte'> = {
    societeId: b.societeId, sequence: tete.sequence + 1, horodatage: b.horodatage, acteur: b.acteur,
    canal: b.canal, evenement: b.evenement, formatCanonique: FORMAT_CANONIQUE, empreintePrecedente: tete.empreinte,
    ...(b.motif === undefined ? {} : { motif: b.motif }),
    ...(b.avant === undefined ? {} : { avant: b.avant }),
    ...(b.apres === undefined ? {} : { apres: b.apres }),
  };
  let empreinte: string;
  try {
    empreinte = empreinteChainee(tete.empreinte, entree);
  } catch (e) {
    if (e instanceof ErreurContenu) return refuser('contenu_invalide');
    throw e;
  }
  return {
    entree: { ...entree, empreinte },
    tete: { societeId: tete.societeId, sequence: entree.sequence, empreinte },
  };
}

export function ajouterLot(tete: Tete, brouillons: readonly Brouillon[]): { entrees: EntreeJournal[]; tete: Tete } {
  if (!Array.isArray(brouillons)) refuser('lot_invalide');
  let courante = tete;
  const entrees: EntreeJournal[] = [];
  for (const b of brouillons) {
    const r = ajouterEntree(courante, b);
    entrees.push(r.entree);
    courante = r.tete;
  }
  return { entrees, tete: courante };
}
