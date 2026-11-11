// Mise en service : opérations pures appelées par la console (créer, inviter, suspendre, geler, supprimer).
// Aucune entrée-sortie, aucun envoi. Chaque appel porte une clé d'idempotence.
import { peutDemanderEffacement, type ParametresFinContrat } from '../abonnement/fin-contrat.js';
import { poserGel } from '../abonnement/gel.js';
import { recevoirEtatVoulu, type EtatAccesCourant } from '../abonnement/transitions.js';
import type { EtatVoulu, EvenementJournal, FinContrat } from '../abonnement/types.js';
import { contenuCanonique, sha256Hex } from '../journal/canonique.js';
import { estRole } from '../securite/types.js';
import type { Session } from '../session/port.js';

export type CodeMiseEnService =
  | 'compte_de_personne' | 'cle_invalide' | 'cle_reutilisee' | 'deja_existant' | 'identifiant_invalide'
  | 'espace_inconnu' | 'role_invalide' | 'personne_invalide';

export class ErreurMiseEnService extends Error {
  readonly code: CodeMiseEnService;
  constructor(code: CodeMiseEnService) { super(code); this.name = 'ErreurMiseEnService'; this.code = code; }
}

export type EvenementMiseEnService =
  | EvenementJournal
  | { type: `mise_en_service.${'espace_cree' | 'invitation_enregistree' | 'suspension_demandee' | 'effacement_demande'}`;
      horodatage: string; donnees: Readonly<Record<string, string | null>> };
export type Invitation = { personne: string; role: string };
export type Espace = {
  base: string; acces: EtatAccesCourant | null; voulu: EtatVoulu | null; fin: FinContrat;
  invitations: readonly Invitation[]; effacementDemandeLe: string | null;
};
export type Retour = Readonly<Record<string, string | number | boolean | null>>;
export type EtatMiseEnService = {
  organisations: Readonly<Record<string, Espace>>;
  cles: Readonly<Record<string, { empreinte: string; retour: Retour }>>;
};
export type Resultat = { etat: EtatMiseEnService; evenements: EvenementMiseEnService[]; rejoue: boolean; retour: Retour };
export type Contexte = { horodatage: string; aujourdhui: string; longueurMaxMotif: number; parametresFin: ParametresFinContrat };

const FORME_CLE = /^[A-Za-z0-9_-]{8,128}$/;
const FORME_IDENTIFIANT = /^[a-z0-9]{1,40}$/;
const SANS_GEL = { actif: false, motif: null, posePar: null, poseLe: null } as const;
const erreur = (c: CodeMiseEnService): never => { throw new ErreurMiseEnService(c); };
const a = (o: object, k: string): boolean => Object.hasOwn(o, k);

type Calcul = { etat: EtatMiseEnService; evenements: EvenementMiseEnService[]; retour: Retour; memoriser: boolean };

function executer(operation: string, demande: { cle: string }, etat: EtatMiseEnService, appelant: Session, calcul: () => Calcul): Resultat {
  if (appelant.nature !== 'service') erreur('compte_de_personne');
  if (typeof demande.cle !== 'string' || !FORME_CLE.test(demande.cle)) erreur('cle_invalide');
  const empreinte = sha256Hex(contenuCanonique({ operation, ...demande }));
  if (a(etat.cles, demande.cle)) {
    const connue = etat.cles[demande.cle] as { empreinte: string; retour: Retour };
    if (connue.empreinte !== empreinte) erreur('cle_reutilisee');
    return { etat, evenements: [], rejoue: true, retour: connue.retour };
  }
  const c = calcul();
  const cles = c.memoriser ? { ...c.etat.cles, [demande.cle]: { empreinte, retour: c.retour } } : c.etat.cles;
  return { etat: { ...c.etat, cles }, evenements: c.evenements, rejoue: false, retour: c.retour };
}

function trouver(etat: EtatMiseEnService, id: string): Espace {
  return a(etat.organisations, id) ? (etat.organisations[id] as Espace) : erreur('espace_inconnu');
}
const remplacer = (etat: EtatMiseEnService, id: string, e: Espace): EtatMiseEnService => ({ ...etat, organisations: { ...etat.organisations, [id]: e } });

export function creerEspace(d: { cle: string; identifiant: string }, etat: EtatMiseEnService, appelant: Session, ctx: Contexte): Resultat {
  return executer('creer_espace', d, etat, appelant, () => {
    if (typeof d.identifiant !== 'string' || !FORME_IDENTIFIANT.test(d.identifiant)) erreur('identifiant_invalide');
    if (a(etat.organisations, d.identifiant)) erreur('deja_existant');
    const base = `cli_${d.identifiant}`;
    const fin: FinContrat = { dateFin: null, remisLe: null, manifesteEmpreinte: null, accuseLe: null, accusePar: null, gelModule: { ...SANS_GEL }, gelConsole: false };
    const espace: Espace = { base, acces: null, voulu: null, fin, invitations: [], effacementDemandeLe: null };
    return {
      etat: remplacer(etat, d.identifiant, espace), memoriser: true, retour: { organisationId: d.identifiant, base },
      evenements: [{ type: 'mise_en_service.espace_cree', horodatage: ctx.horodatage, donnees: { organisationId: d.identifiant, base } }],
    };
  });
}

export function inviter(
  d: { cle: string; organisationId: string; personne: string; role: string }, etat: EtatMiseEnService, appelant: Session, ctx: Contexte,
): Resultat {
  return executer('inviter', d, etat, appelant, () => {
    const e = trouver(etat, d.organisationId);
    if (typeof d.personne !== 'string' || d.personne.trim() === '') erreur('personne_invalide');
    if (!estRole(d.role)) erreur('role_invalide');
    const invitations = [...e.invitations, { personne: d.personne, role: d.role }];
    return {
      etat: remplacer(etat, d.organisationId, { ...e, invitations }), memoriser: true, retour: { organisationId: d.organisationId, role: d.role },
      evenements: [{ type: 'mise_en_service.invitation_enregistree', horodatage: ctx.horodatage, donnees: { organisationId: d.organisationId, personne: d.personne, role: d.role } }],
    };
  });
}

export function suspendre(d: { cle: string; organisationId: string }, etat: EtatMiseEnService, appelant: Session, ctx: Contexte): Resultat {
  return executer('suspendre', d, etat, appelant, () => {
    const e = trouver(etat, d.organisationId);
    const voulu: EtatVoulu = { etat: 'pause', version: (e.acces?.version ?? 0) + 1, arretEnvois: true };
    const r = recevoirEtatVoulu(e.acces, voulu, { ...ctx, source: 'console', auteur: appelant.personneId, branche: false });
    const demande: EvenementMiseEnService = { type: 'mise_en_service.suspension_demandee', horodatage: ctx.horodatage, donnees: { organisationId: d.organisationId } };
    return {
      etat: remplacer(etat, d.organisationId, { ...e, acces: r.courant, voulu }), memoriser: true,
      retour: { organisationId: d.organisationId, etat: r.courant === null ? null : r.courant.etat },
      evenements: [...r.evenements, demande],
    };
  });
}

export function geler(d: { cle: string; organisationId: string; motif: string }, etat: EtatMiseEnService, appelant: Session, ctx: Contexte): Resultat {
  return executer('geler', d, etat, appelant, () => {
    const e = trouver(etat, d.organisationId);
    const r = poserGel(e.fin, { motif: d.motif, par: 'axion', auteur: appelant.personneId, ...ctx });
    return { etat: remplacer(etat, d.organisationId, { ...e, fin: r.fin }), memoriser: true, retour: { organisationId: d.organisationId, gel: true }, evenements: [r.evenement] };
  });
}

export function supprimer(d: { cle: string; organisationId: string }, etat: EtatMiseEnService, appelant: Session, ctx: Contexte): Resultat {
  return executer('supprimer', d, etat, appelant, () => {
    const e = trouver(etat, d.organisationId);
    const p = peutDemanderEffacement(e.fin, ctx.aujourdhui, ctx.parametresFin);
    if (!p.permis) return { etat, evenements: [], memoriser: false, retour: { permis: false, raison: p.raison } };
    return {
      etat: remplacer(etat, d.organisationId, { ...e, effacementDemandeLe: ctx.horodatage }), memoriser: true,
      retour: { permis: true, raison: null },
      evenements: [{ type: 'mise_en_service.effacement_demande', horodatage: ctx.horodatage, donnees: { organisationId: d.organisationId } }],
    };
  });
}
