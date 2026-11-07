// Circuit d'une fiche de changement de la veille : l'IA résume, une personne valide (V3-DEC-003).
// Aucun texte affiché ici : seulement des codes. Les dates sont des chaînes ISO UTC (suffixe Z), comparées comme chaînes.

export type StatutFiche = 'detectee' | 'resumee' | 'validee' | 'testee' | 'signee' | 'publiee' | 'rejetee';
export type ActionVeille = 'resumer' | 'valider' | 'tester' | 'signer' | 'publier' | 'rejeter';

export interface Acteur {
  type: 'personne' | 'ia';
  id: string;
}

export interface PasHistorique {
  de: StatutFiche;
  vers: StatutFiche;
  par: Acteur;
  le: string;
}

export interface FicheChangement {
  id: string;
  sourceId: string;
  detecteeLe: string;
  empreinteAvant: string;
  empreinteApres: string;
  resumeIa: string | null;
  statut: StatutFiche;
  parametresTouches: readonly string[];
  validateur: string | null;
  paquetId: string | null;
  historique: readonly PasHistorique[];
}

export interface DonneesAvance {
  resume?: string;
  parametresTouches?: readonly string[];
  paquetId?: string;
}

export type CodeErreurVeille =
  | 'identifiant_invalide'
  | 'empreinte_invalide'
  | 'empreintes_identiques'
  | 'date_invalide'
  | 'date_anterieure'
  | 'acteur_invalide'
  | 'action_inconnue'
  | 'ia_non_autorisee'
  | 'transition_interdite'
  | 'resume_manquant'
  | 'parametres_invalides'
  | 'paquet_manquant';

export class ErreurVeille extends Error {
  readonly code: CodeErreurVeille;
  constructor(code: CodeErreurVeille) {
    super(code);
    this.name = 'ErreurVeille';
    this.code = code;
  }
}

/** Action → [état de départ, état d'arrivée]. `rejeter` est traité à part. */
const ETAPES: Readonly<Record<Exclude<ActionVeille, 'rejeter'>, readonly [StatutFiche, StatutFiche]>> = {
  resumer: ['detectee', 'resumee'],
  valider: ['resumee', 'validee'],
  tester: ['validee', 'testee'],
  signer: ['testee', 'signee'],
  publier: ['signee', 'publiee'],
};

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function texteNonVide(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function dateValide(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_UTC.test(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 19) + 'Z' === v;
}

export function creerFiche(p: {
  id: string;
  sourceId: string;
  detecteeLe: string;
  empreinteAvant: string;
  empreinteApres: string;
}): FicheChangement {
  if (!texteNonVide(p.id) || !texteNonVide(p.sourceId)) throw new ErreurVeille('identifiant_invalide');
  if (!texteNonVide(p.empreinteAvant) || !texteNonVide(p.empreinteApres)) throw new ErreurVeille('empreinte_invalide');
  if (!dateValide(p.detecteeLe)) throw new ErreurVeille('date_invalide');
  if (p.empreinteAvant === p.empreinteApres) throw new ErreurVeille('empreintes_identiques');
  return Object.freeze({
    id: p.id,
    sourceId: p.sourceId,
    detecteeLe: p.detecteeLe,
    empreinteAvant: p.empreinteAvant,
    empreinteApres: p.empreinteApres,
    resumeIa: null,
    statut: 'detectee',
    parametresTouches: Object.freeze([]),
    validateur: null,
    paquetId: null,
    historique: Object.freeze([]),
  });
}

/**
 * Fait avancer la fiche d'un pas et rend une NOUVELLE fiche ; l'entrée n'est jamais modifiée.
 * L'IA ne peut que résumer. Un état ne saute jamais l'état précédent. `publier` exige `paquetId`.
 */
export function avancer(
  fiche: FicheChangement,
  action: ActionVeille,
  acteur: Acteur,
  le: string,
  donnees: DonneesAvance = {},
): FicheChangement {
  if (!acteur || (acteur.type !== 'personne' && acteur.type !== 'ia') || !texteNonVide(acteur.id)) {
    throw new ErreurVeille('acteur_invalide');
  }
  if (!dateValide(le)) throw new ErreurVeille('date_invalide');
  if (action !== 'rejeter' && !Object.prototype.hasOwnProperty.call(ETAPES, action)) throw new ErreurVeille('action_inconnue');
  if (acteur.type === 'ia' && action !== 'resumer') throw new ErreurVeille('ia_non_autorisee');

  let vers: StatutFiche;
  if (action === 'rejeter') {
    if (fiche.statut === 'publiee' || fiche.statut === 'rejetee') throw new ErreurVeille('transition_interdite');
    vers = 'rejetee';
  } else {
    const [de, arrivee] = ETAPES[action];
    if (fiche.statut !== de) throw new ErreurVeille('transition_interdite');
    vers = arrivee;
  }

  const dernier = fiche.historique.at(-1)?.le ?? fiche.detecteeLe;
  if (le < dernier) throw new ErreurVeille('date_anterieure');

  let resumeIa = fiche.resumeIa;
  let parametresTouches = fiche.parametresTouches;
  let validateur = fiche.validateur;
  let paquetId = fiche.paquetId;
  if (action === 'resumer') {
    if (!texteNonVide(donnees.resume)) throw new ErreurVeille('resume_manquant');
    resumeIa = donnees.resume;
  } else if (action === 'valider') {
    const p = donnees.parametresTouches ?? [];
    if (!Array.isArray(p) || !p.every(texteNonVide)) throw new ErreurVeille('parametres_invalides');
    parametresTouches = Object.freeze([...p]);
    validateur = acteur.id;
  } else if (action === 'publier') {
    if (!texteNonVide(donnees.paquetId)) throw new ErreurVeille('paquet_manquant');
    paquetId = donnees.paquetId;
  }

  const pas: PasHistorique = Object.freeze({ de: fiche.statut, vers, par: Object.freeze({ type: acteur.type, id: acteur.id }), le });
  return Object.freeze({
    ...fiche,
    statut: vers,
    resumeIa,
    parametresTouches,
    validateur,
    paquetId,
    historique: Object.freeze([...fiche.historique, pas]),
  });
}
