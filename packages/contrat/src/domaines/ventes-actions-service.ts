import { genererVentes, type JeuVentes, type PieceVenteFictive } from '../../../donnees-fictives/src/ventes.js';
import { demanderValidation } from '../../../noyau/src/ecritures/etats.js';
import { peutValiderFacture } from '../../../noyau/src/ventes/clients.js';
import type { CorpsCorrection, VenteCorrigee, VenteValidee } from './ventes-actions.js';

export type CodeActions = 'VENTE_INCONNUE' | 'VERSION_PERIMEE' | 'VALIDATION_REFUSEE' | 'VENTE_VALIDEE' | 'CLE_REUTILISEE' | 'ENTREE_INVALIDE';
export type MotifRefus = 'doublon' | 'a_relire' | 'client_absent' | 'ecriture_non_proposee';
export class ErreurActions extends Error {
  override name = 'ErreurActions';
  constructor(readonly code: CodeActions, readonly motif?: MotifRefus) { super(code); }
}

/** Réglages lus dans la configuration du serveur (jamais écrits dans le contrat). */
export interface ConfigActions {
  delaiAnnulationMs: number;
  maintenant: () => number;
}

interface Vente {
  piece: PieceVenteFictive;
  version: number;
  natures: { ligne: number; nature: string }[];
}

const refuser = (code: CodeActions, motif?: MotifRefus): never => { throw new ErreurActions(code, motif); };

/** Service en mémoire (par instance) : corrige et valide une vente. La validation est un geste humain, jamais automatique. */
export function creerServiceVentesActions(jeu: JeuVentes = genererVentes(), config: ConfigActions) {
  const societe = jeu.societes.find((s) => s.profil === 'pleine') ?? jeu.societes[0];
  const ventes = new Map((societe?.pieces ?? []).map((p) => [p.id, { piece: structuredClone(p), version: 1, natures: [] } as Vente]));
  const clients = new Set((societe?.clients ?? []).map((c) => c.code));
  const rejeux = new Map<string, { empreinte: string; reponse: unknown }>();

  const unefois = <T>(cle: string, empreinte: string, calcul: () => T): T => {
    const vu = rejeux.get(cle);
    if (vu !== undefined) return vu.empreinte === empreinte ? (vu.reponse as T) : refuser('CLE_REUTILISEE');
    const reponse = calcul();
    rejeux.set(cle, { empreinte, reponse });
    return reponse;
  };
  const trouver = (id: string, version: number): Vente => {
    const v = ventes.get(id) ?? refuser('VENTE_INCONNUE');
    return v.version === version ? v : refuser('VERSION_PERIMEE');
  };
  const vue = (v: Vente): VenteCorrigee => ({
    id: v.piece.id,
    version: v.version,
    ...(v.piece.clientCode !== undefined ? { clientCode: v.piece.clientCode } : {}),
    ...(v.piece.dateOperation !== undefined ? { dateOperation: v.piece.dateOperation } : {}),
    natures: v.natures.map((n) => ({ ...n })),
    ...(v.piece.factureOrigineId !== undefined ? { factureOrigineId: v.piece.factureOrigineId } : {}),
  });

  return {
    lireVersion: (id: string): number | undefined => ventes.get(id)?.version,
    corriger(id: string, corps: CorpsCorrection, version: number, personne: string, cle: string): VenteCorrigee {
      return unefois(cle, JSON.stringify(['corriger', id, version, personne, corps]), () => {
        const v = trouver(id, version);
        if (v.piece.statutEcriture === 'valide' || v.piece.statut === 'validee') refuser('VENTE_VALIDEE');
        if (corps.clientCode !== undefined && !clients.has(corps.clientCode)) refuser('ENTREE_INVALIDE');
        if (corps.natures?.some((n) => n.ligne >= v.piece.lignes.length)) refuser('ENTREE_INVALIDE');
        if (corps.factureOrigineId !== undefined && (corps.factureOrigineId === id || !ventes.has(corps.factureOrigineId))) refuser('ENTREE_INVALIDE');
        for (const k of ['clientCode', 'dateOperation', 'factureOrigineId'] as const) if (corps[k] !== undefined) v.piece[k] = corps[k];
        for (const n of corps.natures ?? []) v.natures = [...v.natures.filter((x) => x.ligne !== n.ligne), n].sort((a, b) => a.ligne - b.ligne);
        v.version += 1;
        return vue(v);
      });
    },
    valider(id: string, version: number, personne: string, cle: string): VenteValidee {
      return unefois(cle, JSON.stringify(['valider', id, version, personne]), () => {
        const v = trouver(id, version);
        const p = v.piece;
        if (p.statut === 'doublon') refuser('VALIDATION_REFUSEE', 'doublon');
        if (p.statut === 'a_verifier') refuser('VALIDATION_REFUSEE', 'a_relire');
        if (!peutValiderFacture({ clientId: p.clientCode } as Parameters<typeof peutValiderFacture>[0])) refuser('VALIDATION_REFUSEE', 'client_absent');
        if (p.statutEcriture !== 'propose') refuser('VALIDATION_REFUSEE', 'ecriture_non_proposee');
        const demande = demanderValidation({ id: `E-${p.id}`, journal: 'VE', date: p.dateFacture, statut: 'propose', lignes: [] }, config.maintenant(), config.delaiAnnulationMs);
        p.statutEcriture = 'valide';
        p.statut = 'validee';
        v.version += 1;
        return { id: p.id, version: v.version, ecriture: { statut: 'valide' as const }, annulableJusqua: demande.echeance };
      });
    },
  };
}
