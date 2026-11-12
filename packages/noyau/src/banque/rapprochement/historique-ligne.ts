// Historique des états d'une ligne bancaire, reconstitué depuis les entrées de journal des liens.
import type { Lien } from '../types.js';

export type EtatHistorique = 'importee' | 'proposee' | 'rapprochee' | 'defaite';
export type EntreeHistorique = { action: 'proposer' | 'valider' | 'defaire'; apres: Lien; horodatage: string };
export type EtapeHistorique = { etat: EtatHistorique; lienId?: string; horodatage?: string };

export class ErreurHistorique extends Error {
  override name = 'ErreurHistorique';
  constructor(readonly code: 'horodatage_invalide') {
    super(code);
  }
}

const ETAT_PAR_ACTION: Record<EntreeHistorique['action'], EtatHistorique> = {
  proposer: 'proposee', valider: 'rapprochee', defaire: 'defaite',
};
const ETAT_PAR_LIEN: Record<Lien['etat'], EtatHistorique> = {
  propose: 'proposee', valide: 'rapprochee', defait: 'defaite', refuse: 'defaite',
};

export function etatDuLien(lien: Lien): EtatHistorique {
  return ETAT_PAR_LIEN[lien.etat];
}

/** États successifs d'une ligne : « importée » d'abord, puis une étape par entrée, par horodatage croissant (ordre d'arrivée à égalité). */
export function historiqueLigne(entrees: readonly EntreeHistorique[], idLigne: string): EtapeHistorique[] {
  const retenues = entrees
    .map((e, rang) => ({ e, rang, t: Date.parse(e.horodatage) }))
    .filter((x) => x.e.apres.ligneId === idLigne);
  if (retenues.some((x) => Number.isNaN(x.t))) throw new ErreurHistorique('horodatage_invalide');
  retenues.sort((a, b) => a.t - b.t || a.rang - b.rang);
  return [
    { etat: 'importee' },
    ...retenues.map((x) => ({ etat: ETAT_PAR_ACTION[x.e.action], lienId: x.e.apres.id, horodatage: x.e.horodatage })),
  ];
}
