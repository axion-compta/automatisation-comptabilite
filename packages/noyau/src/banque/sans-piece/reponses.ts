// Réponses aux demandes sans pièce : décisions tracées, jamais prises par l'IA ; résolution automatique à l'arrivée d'une pièce.
import { centimes, soustraire, type Centimes } from '../../argent/index.js';
import { estDateValide } from '../../dates/civiles.js';
import type { Demande, Reponse } from './demandes.js';

export type CodeReponses =
  | 'deja_repondue' | 'horodatage_invalide' | 'reponse_inconnue' | 'reponse_reservee_a_une_personne' | 'motif_invalide' | 'compte_associe_invalide' | 'montant_invalide';
export class ErreurReponses extends Error {
  override name = 'ErreurReponses';
  constructor(readonly code: CodeReponses) {
    super(code);
  }
}

export type EtatDemande = 'ouverte' | 'repondue' | 'auto_resolue';
export type DemandeSuivie = Demande & { readonly etat: EtatDemande; readonly codeMessage?: string; readonly reponse?: Reponse; readonly motif?: string };
export type ReponseDonnee = { type: Reponse; motif?: string };
export type Contexte = { motifsPermis: readonly string[]; compteAssocie: string; acteur: { type: 'personne' | 'ia'; id: string }; horodatage: string };
export type Effet =
  | { type: 'proposer_associe'; ligneIds: string[]; comptePropose: string }
  | { type: 'decision_sans_justificatif'; ligneIds: string[]; motif: string; par: string; le: string }
  | { type: 'attendre_depot' }
  | { type: 'brouillon_a_preparer' };

const HORODATAGE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}/;
const RESERVEES: readonly Reponse[] = ['pas_de_facture', 'c_est_personnel'];

export function repondre(demande: DemandeSuivie, reponse: ReponseDonnee, contexte: Contexte): { demande: DemandeSuivie; effets: Effet[] } {
  if (demande.etat !== 'ouverte') throw new ErreurReponses('deja_repondue');
  const date = typeof contexte.horodatage === 'string' ? HORODATAGE.exec(contexte.horodatage)?.[1] : undefined;
  if (date === undefined || !estDateValide(date)) throw new ErreurReponses('horodatage_invalide');
  if (!demande.reponsesPretes.includes(reponse.type)) throw new ErreurReponses('reponse_inconnue');
  if (contexte.acteur.type === 'ia' && RESERVEES.includes(reponse.type)) throw new ErreurReponses('reponse_reservee_a_une_personne');
  const ligneIds = [...demande.ligneIds];
  let effet: Effet;
  let motif: string | undefined;
  if (reponse.type === 'pas_de_facture') {
    motif = reponse.motif;
    if (motif === undefined || motif === '' || !contexte.motifsPermis.includes(motif)) throw new ErreurReponses('motif_invalide');
    effet = { type: 'decision_sans_justificatif', ligneIds, motif, par: contexte.acteur.id, le: contexte.horodatage };
  } else if (reponse.type === 'c_est_personnel') {
    if (contexte.compteAssocie === '') throw new ErreurReponses('compte_associe_invalide');
    effet = { type: 'proposer_associe', ligneIds, comptePropose: contexte.compteAssocie };
  } else effet = reponse.type === 'ou_les_trouver' ? { type: 'brouillon_a_preparer' } : { type: 'attendre_depot' };
  return { demande: { ...demande, etat: 'repondue', reponse: reponse.type, ...(motif === undefined ? {} : { motif }) }, effets: [effet] };
}

export type LienNouveau = { ligneId: string; montantLigne: Centimes };

export function resoudreAutomatiquement(demandes: readonly DemandeSuivie[], liensNouveaux: readonly LienNouveau[]): DemandeSuivie[] {
  const montants = new Map<string, Centimes>();
  for (const l of liensNouveaux) {
    if (!Number.isSafeInteger(l.montantLigne)) throw new ErreurReponses('montant_invalide');
    if (!montants.has(l.ligneId)) montants.set(l.ligneId, centimes(Math.abs(l.montantLigne)));
  }
  return demandes.map((d) => {
    const liees = d.etat === 'ouverte' ? d.ligneIds.filter((id) => montants.has(id)) : [];
    if (liees.length === 0) return d;
    const restantes = d.ligneIds.filter((id) => !montants.has(id));
    if (restantes.length === 0) return { ...d, etat: 'auto_resolue', codeMessage: 'piece_arrivee' };
    const impact = liees.reduce((reste, id) => soustraire(reste, montants.get(id) as Centimes), d.impact);
    return { ...d, ligneIds: restantes, nombre: restantes.length, impact };
  });
}
