// Actions sur le plan comptable : fonctions pures sur un plan immuable. Aucune action ne modifie une écriture.
import type { Ecriture } from '../ecritures/modele.js';
import { normaliserCompte, verifierCompteMvp } from './comptes.js';

export interface CompteDuPlan {
  numero: string;
  nom: string;
  /** Libellé officiel, s'il diffère du nom simple. */
  nomOfficiel?: string;
  actif: boolean;
}

export type Plan = readonly CompteDuPlan[];

export type CodeErreurPlan =
  | 'compte_existant'
  | 'compte_inconnu'
  | 'compte_mouvemente'
  | 'nom_vide'
  | 'fusion_meme_compte'
  | 'cible_inactive'
  | 'apercu_perime';

export class ErreurPlan extends Error {
  override name = 'ErreurPlan';
  readonly code: CodeErreurPlan;
  constructor(code: CodeErreurPlan) {
    super(code);
    this.code = code;
  }
}

export type Avertissement = 'hors_plan_reference';

export interface ApercuFusion {
  source: string;
  cible: string;
  nbEcritures: number;
}

export interface Reaffectation {
  ecritureId: string;
  ligne: number;
  de: string;
  vers: string;
}

function nomPropre(nom: string): string {
  const net = nom.trim();
  if (net === '') throw new ErreurPlan('nom_vide');
  return net;
}

function trouver(plan: Plan, numero: string): CompteDuPlan {
  const compte = plan.find((c) => c.numero === numero);
  if (compte === undefined) throw new ErreurPlan('compte_inconnu');
  return compte;
}

function remplacer(plan: Plan, numero: string, change: Partial<CompteDuPlan>): Plan {
  trouver(plan, numero);
  return plan.map((c) => (c.numero === numero ? { ...c, ...change } : c));
}

/** Nombre d'écritures distinctes qui touchent le compte. */
function ecrituresDuCompte(ecritures: readonly Ecriture[], numero: string): Ecriture[] {
  return ecritures.filter((e) => e.lignes.some((l) => l.compte === numero));
}

/** Ajoute un compte. Un numéro hors de la liste de référence est accepté avec un avertissement. */
export function ajouterCompte(
  plan: Plan,
  saisie: { numero: string; nom: string },
  reference: readonly string[],
): { plan: Plan; avertissements: Avertissement[] } {
  const { numero } = normaliserCompte(saisie.numero);
  verifierCompteMvp(numero);
  const nom = nomPropre(saisie.nom);
  if (plan.some((c) => c.numero === numero)) throw new ErreurPlan('compte_existant');
  const connu = reference.some((r) => numero.startsWith(r));
  return {
    plan: [...plan, { numero, nom, actif: true }],
    avertissements: connu ? [] : ['hors_plan_reference'],
  };
}

/** Renomme (nom simple, nom officiel ou les deux) ; le numéro ne change jamais. */
export function renommerCompte(
  plan: Plan,
  numero: string,
  noms: { nom?: string; nomOfficiel?: string },
): Plan {
  const change: Partial<CompteDuPlan> = {};
  if (noms.nom !== undefined) change.nom = nomPropre(noms.nom);
  if (noms.nomOfficiel !== undefined) change.nomOfficiel = nomPropre(noms.nomOfficiel);
  return remplacer(plan, numero, change);
}

export function desactiverCompte(plan: Plan, numero: string): Plan {
  return remplacer(plan, numero, { actif: false });
}

/** Refus codé `compte_mouvemente` dès qu'une écriture touche le compte. */
export function supprimerCompte(plan: Plan, numero: string, ecritures: readonly Ecriture[]): Plan {
  trouver(plan, numero);
  if (ecrituresDuCompte(ecritures, numero).length > 0) throw new ErreurPlan('compte_mouvemente');
  return plan.filter((c) => c.numero !== numero);
}

export function apercuFusion(
  plan: Plan,
  ecritures: readonly Ecriture[],
  source: string,
  cible: string,
): ApercuFusion {
  if (source === cible) throw new ErreurPlan('fusion_meme_compte');
  trouver(plan, source);
  if (!trouver(plan, cible).actif) throw new ErreurPlan('cible_inactive');
  return { source, cible, nbEcritures: ecrituresDuCompte(ecritures, source).length };
}

/**
 * Sans confirmation, rend l'aperçu et rien d'autre. Confirmée, désactive le compte source et liste les
 * réaffectations de lignes à faire ; les écritures elles-mêmes ne sont pas modifiées.
 */
export function fusionner(
  plan: Plan,
  ecritures: readonly Ecriture[],
  apercu: ApercuFusion,
  confirmation: boolean,
): { applique: boolean; plan: Plan; apercu: ApercuFusion; reaffectations: Reaffectation[] } {
  if (!confirmation) return { applique: false, plan, apercu, reaffectations: [] };
  const courant = apercuFusion(plan, ecritures, apercu.source, apercu.cible);
  if (courant.nbEcritures !== apercu.nbEcritures) throw new ErreurPlan('apercu_perime');
  const reaffectations: Reaffectation[] = [];
  for (const e of ecrituresDuCompte(ecritures, apercu.source)) {
    e.lignes.forEach((l, ligne) => {
      if (l.compte === apercu.source) {
        reaffectations.push({ ecritureId: e.id, ligne, de: apercu.source, vers: apercu.cible });
      }
    });
  }
  return { applique: true, plan: desactiverCompte(plan, apercu.source), apercu: courant, reaffectations };
}

/** Compte actif correspondant à une catégorie de dépense ; jamais un compte désactivé ou absent du plan. */
export function categorieVersCompte(
  categorie: string,
  plan: Plan,
  correspondances: Readonly<Record<string, string>>,
): string | undefined {
  if (!Object.hasOwn(correspondances, categorie)) return undefined;
  const numero = correspondances[categorie];
  const compte = plan.find((c) => c.numero === numero);
  return compte?.actif === true ? compte.numero : undefined;
}
