// Protection du dernier administrateur (V3-ROL-012). Fonctions pures, non branchées.
// Le module ne crée aucun rôle : il refuse seulement un changement reçu de la console.
import { ErreurSecurite, estCanal, estRole, type Canal, type Raison, type Role } from './types.js';

export type MembreRole = { personneId: string; role: Role; actif: boolean };
export type ChangementRole = { personneId: string; role?: Role; actif?: boolean };
export type ResultatRoles =
  | { ok: true; etat: MembreRole[] }
  | { ok: false; raison: 'dernier_administrateur' };

const aUnAdmin = (etat: readonly MembreRole[]): boolean =>
  etat.some((x) => x.actif && x.role === 'administrateur');

const invalide = (): never => {
  throw new ErreurSecurite('argument_invalide');
};

export function appliquerRoles(etat: readonly MembreRole[], changements: readonly ChangementRole[]): ResultatRoles {
  if (!Array.isArray(etat) || !Array.isArray(changements)) invalide();
  const copie = etat.map((x) => ({ ...x }));
  for (const c of changements) {
    const cible = copie.find((x) => x.personneId === c?.personneId);
    if (cible === undefined) return invalide();
    if (c.role !== undefined) {
      if (!estRole(c.role)) invalide();
      cible.role = c.role;
    }
    if (c.actif !== undefined) {
      if (typeof c.actif !== 'boolean') invalide();
      cible.actif = c.actif;
    }
  }
  return aUnAdmin(copie) ? { ok: true, etat: copie } : { ok: false, raison: 'dernier_administrateur' };
}

export type DemandeRecuperation = {
  demandeur: string;
  role: Role;
  beneficiaire: string;
  motif: string;
  reference: string;
  canal: Canal;
  horodatage: string;
};
export type LigneAdministrateurRecupere = {
  evenement: 'securite.administrateur_recupere';
  demandeur: string;
  beneficiaire: string;
  motif: string;
  reference: string;
  horodatage: string;
};
export type ResultatRecuperation =
  | { permis: true; etat: MembreRole[]; ligne: LigneAdministrateurRecupere }
  | { permis: false; raison: Extract<Raison, 'role_insuffisant' | 'entree_invalide'> };

const vide = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

/** Récupération par le personnel Axion : motif et référence écrits, jamais par le chat ni la voix. */
export function recupererAdministrateur(demande: DemandeRecuperation, etat: readonly MembreRole[]): ResultatRecuperation {
  if (demande === null || typeof demande !== 'object' || !Array.isArray(etat) || !estRole(demande.role)
    || !estCanal(demande.canal)) {
    return invalide();
  }
  if (demande.role !== 'personnel_axion') return { permis: false, raison: 'role_insuffisant' };
  if (demande.canal === 'chat' || demande.canal === 'voix') return { permis: false, raison: 'role_insuffisant' };
  if (vide(demande.motif) || vide(demande.reference)) return { permis: false, raison: 'entree_invalide' };
  const nouvel = etat.map((x) => ({ ...x }));
  const cible = nouvel.find((x) => x.personneId === demande.beneficiaire);
  if (cible === undefined) return invalide();
  cible.role = 'administrateur';
  cible.actif = true;
  return {
    permis: true,
    etat: nouvel,
    ligne: {
      evenement: 'securite.administrateur_recupere', demandeur: demande.demandeur,
      beneficiaire: demande.beneficiaire, motif: demande.motif, reference: demande.reference,
      horodatage: demande.horodatage,
    },
  };
}
