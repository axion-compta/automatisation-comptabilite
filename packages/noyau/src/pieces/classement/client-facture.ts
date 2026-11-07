// Client facturé lu sur la pièce, comparé à la société. Écart ou absence : TVA « sous réserve ».
import type { TypePiece } from '../types.js';

export type StatutClient = 'concorde' | 'douteux' | 'ticket_sans_client' | 'absent';
export interface ClientLu { nom?: string; tva?: string; siren?: string; email?: string }
export interface SocieteRef { nom: string; tva?: string; siren?: string; emails: string[] }
export interface ResultatClient { statut: StatutClient; tvaSousReserve: boolean; raison: string }

const FORMES = new Set(['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'SCI', 'EI']);

export function nomNormaliseSociete(nom: string): string {
  const sansAccents = nom.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  return sansAccents.replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter((m) => m !== '' && !FORMES.has(m)).join(' ');
}

const identifiant = (v: string | undefined): string => (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function comparerClientFacture(lu: ClientLu | null, societe: SocieteRef, typePiece: TypePiece): ResultatClient {
  const nom = (lu?.nom ?? '').trim();
  const email = (lu?.email ?? '').trim().toLowerCase();
  const ids = [[identifiant(lu?.tva), identifiant(societe.tva)], [identifiant(lu?.siren), identifiant(societe.siren)]] as const;
  const luIds = ids.filter(([a]) => a !== '');
  if (nom === '' && email === '' && luIds.length === 0) {
    return typePiece === 'ticket'
      ? { statut: 'ticket_sans_client', tvaSousReserve: false, raison: 'Ticket sans client : accepté.' }
      : { statut: 'absent', tvaSousReserve: true, raison: 'Aucun client lu sur la pièce.' };
  }
  const comparables = luIds.filter(([, b]) => b !== '');
  if (comparables.some(([a, b]) => a !== b)) return { statut: 'douteux', tvaSousReserve: true, raison: 'Numéro de TVA ou SIREN différent de la société.' };
  if (comparables.length > 0) return { statut: 'concorde', tvaSousReserve: false, raison: 'Numéro de TVA ou SIREN identique.' };
  const nomLu = nomNormaliseSociete(nom);
  if (nomLu !== '') {
    return nomLu === nomNormaliseSociete(societe.nom)
      ? { statut: 'concorde', tvaSousReserve: false, raison: 'Nom identique.' }
      : { statut: 'douteux', tvaSousReserve: true, raison: 'Client lu différent de la société.' };
  }
  if (email !== '' && societe.emails.some((e) => e.trim().toLowerCase() === email)) return { statut: 'concorde', tvaSousReserve: false, raison: 'E-mail identique.' };
  return { statut: 'douteux', tvaSousReserve: true, raison: 'Client lu différent de la société.' };
}
