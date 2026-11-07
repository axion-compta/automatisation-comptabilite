// Correspondance d'un ticket avec une ligne de débit de la société : la fenêtre est toujours un argument.
import type { Centimes } from '../argent/index.js';
import { ajouterJours, estDateValide } from '../dates/civiles.js';
import { ErreurFrais } from './types.js';

export interface LigneBanqueSociete {
  id: string;
  date: string;
  montant: Centimes;
  sens: 'debit' | 'credit';
  libelle: string;
  compte: string;
}

export interface TicketARapprocher {
  montantTtc: Centimes;
  date: string;
  fournisseur?: string;
}

const MOT_MIN = 4;

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function commercantCompatible(fournisseur: string | undefined, libelleBanque: string): boolean {
  if (fournisseur === undefined || fournisseur.trim() === '') return true;
  const libelle = normaliser(libelleBanque);
  return normaliser(fournisseur)
    .split(/[^\p{L}\p{N}]+/u)
    .some((mot) => mot.length >= MOT_MIN && libelle.includes(mot));
}

function refuser(message: string): never {
  throw new ErreurFrais('entree_invalide', message);
}

function jourUtc(date: string): number {
  const [a, m, j] = date.split('-').map(Number);
  return Date.UTC(a as number, (m as number) - 1, j as number);
}

export function lignesCorrespondantes(
  ticket: TicketARapprocher,
  lignes: readonly LigneBanqueSociete[],
  fenetreJours: number,
): LigneBanqueSociete[] {
  if (!Number.isSafeInteger(fenetreJours) || fenetreJours < 0) refuser('Fenêtre en jours entière et positive attendue');
  if (!estDateValide(ticket.date)) refuser('Date du ticket invalide');
  if (!Number.isSafeInteger(ticket.montantTtc)) refuser('Montant entier de centimes attendu');
  const debut = ajouterJours(ticket.date, -fenetreJours);
  const fin = ajouterJours(ticket.date, fenetreJours);
  const repere = jourUtc(ticket.date);
  const ecart = (l: LigneBanqueSociete) => Math.abs(jourUtc(l.date) - repere);
  return lignes
    .filter((l) => {
      if (!estDateValide(l.date)) refuser('Date de ligne bancaire invalide');
      if (!Number.isSafeInteger(l.montant)) refuser('Montant bancaire entier attendu');
      return (
        l.sens === 'debit' &&
        Math.abs(l.montant) === Math.abs(ticket.montantTtc) &&
        l.date >= debut &&
        l.date <= fin &&
        commercantCompatible(ticket.fournisseur, l.libelle)
      );
    })
    .sort((a, b) => ecart(a) - ecart(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
