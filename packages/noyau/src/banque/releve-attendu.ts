// Relevé attendu au jour J du mois suivant ; « aucune opération » accepté seulement si les soldes sont égaux.
// Dates ISO, jour civil UTC. `jourAlerte` est un réglage produit passé en argument.
import type { Centimes } from '../argent/index.js';
import type { ReleveResume } from './types.js';

export class ErreurReleveAttendu extends Error {
  override name = 'ErreurReleveAttendu';
  constructor(readonly code: 'jour_invalide' | 'date_invalide' | 'fermeture_avant_ouverture' | 'montant_invalide', message: string) {
    super(message);
  }
}

export type CompteAttendu = { id: string; ouvertLe: string; fermeLe?: string };
export type ReleveManquant = { compteId: string; mois: string };
export type TrouSansOperation = { soldeAvant?: Centimes; soldeApres?: Centimes };
export type DecisionAucuneOperation =
  | { accepte: true }
  | { accepte: false; motif: 'ecart'; ecart: Centimes }
  | { accepte: false; motif: 'soldes_inconnus' };

// Bornes du réglage produit : le jour d'alerte doit exister dans tous les mois.
const JOUR_ALERTE_MIN = 1;
const JOUR_ALERTE_MAX = 28;
const MS_PAR_JOUR = 86_400_000;
const FORME_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const numeroJour = (iso: string): number => {
  const m = FORME_ISO.exec(iso);
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
  if (!m || new Date(t).toISOString().slice(0, 10) !== iso) throw new ErreurReleveAttendu('date_invalide', `date invalide : ${iso}`);
  return t;
};
const debutMois = (jour: number): number => {
  const d = new Date(jour);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const moisSuivant = (debut: number): number => {
  const d = new Date(debut);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
};
const libelleMois = (debut: number): string => new Date(debut).toISOString().slice(0, 7);

export function relevesAttendus(
  comptes: readonly CompteAttendu[],
  releves: readonly ReleveResume[],
  aujourdhui: string,
  jourAlerte: number,
): ReleveManquant[] {
  if (!Number.isInteger(jourAlerte) || jourAlerte < JOUR_ALERTE_MIN || jourAlerte > JOUR_ALERTE_MAX) {
    throw new ErreurReleveAttendu('jour_invalide', 'jour d\'alerte invalide');
  }
  const auJour = numeroJour(aujourdhui);
  const periodes = releves.map((r) => {
    const d = numeroJour(r.periodeDebut);
    const f = numeroJour(r.periodeFin);
    if (d > f) throw new ErreurReleveAttendu('date_invalide', `période inversée : ${r.id}`);
    return { compteId: r.compteId, d, f };
  });
  const manquants: ReleveManquant[] = [];
  for (const compte of comptes) {
    const ouvert = numeroJour(compte.ouvertLe);
    const ferme = compte.fermeLe === undefined ? undefined : numeroJour(compte.fermeLe);
    if (ferme !== undefined && ferme < ouvert) throw new ErreurReleveAttendu('fermeture_avant_ouverture', `fermeture avant ouverture : ${compte.id}`);
    const siens = periodes.filter((p) => p.compteId === compte.id);
    for (let debut = debutMois(ouvert); ; debut = moisSuivant(debut)) {
      const suivant = moisSuivant(debut);
      if (auJour < suivant + (jourAlerte - 1) * MS_PAR_JOUR) break;
      if (ferme !== undefined && debut > ferme) break;
      const premier = Math.max(debut, ouvert);
      const dernier = Math.min(suivant - MS_PAR_JOUR, ferme ?? Number.POSITIVE_INFINITY);
      let couvert = true;
      for (let j = premier; j <= dernier && couvert; j += MS_PAR_JOUR) couvert = siens.some((p) => p.d <= j && j <= p.f);
      if (!couvert) manquants.push({ compteId: compte.id, mois: libelleMois(debut) });
    }
  }
  return manquants.sort((a, b) => (a.compteId < b.compteId ? -1 : a.compteId > b.compteId ? 1 : a.mois < b.mois ? -1 : a.mois > b.mois ? 1 : 0));
}

export function accepterAucuneOperation(trou: TrouSansOperation): DecisionAucuneOperation {
  const { soldeAvant: avant, soldeApres: apres } = trou;
  for (const m of [avant, apres]) {
    if (m !== undefined && !Number.isSafeInteger(m)) throw new ErreurReleveAttendu('montant_invalide', 'montant invalide');
  }
  if (avant === undefined || apres === undefined) return { accepte: false, motif: 'soldes_inconnus' };
  if (avant === apres) return { accepte: true };
  return { accepte: false, motif: 'ecart', ecart: Math.abs(apres - avant) as Centimes };
}
