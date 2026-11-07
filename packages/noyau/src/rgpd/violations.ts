import { aDepasse, ajouterSecondes, ecartMillisecondes, verifierHorodatage } from '../exploitation/types.js';
import { ErreurRgpd, donneesPermises, verifierMotif } from './types.js';

const SECONDES_PAR_HEURE = 3600;
const HEURES_PAR_JOUR = 24;

export type EcheancesViolation = {
  qualifierAvant: string;
  informerSocietesAvant: string;
  autoriteAvant: string;
  retourExperienceAvant: string;
};
export type EcheancesFaille = { qualifierAvant: string; premiereAlerteAvant: string };
export type EtatEcheance = 'faite_a_temps' | 'faite_en_retard' | 'a_faire' | 'depassee';

function horodatage(h: string): void {
  try {
    verifierHorodatage(h);
  } catch {
    throw new ErreurRgpd('horodatage_invalide');
  }
}

function heuresValides(n: number): number {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) throw new ErreurRgpd('delai_invalide');
  return n;
}

function apres(depart: string, heures: number): string {
  const secondes = heuresValides(heures) * SECONDES_PAR_HEURE;
  try {
    return ajouterSecondes(depart, secondes);
  } catch {
    throw new ErreurRgpd('horodatage_invalide');
  }
}

export function echeancesViolation(
  detecteeLe: string,
  r: { qualificationHeures: number; informationSocieteHeures: number; autoriteHeures: number; retourExperienceJours: number },
): EcheancesViolation {
  horodatage(detecteeLe);
  return {
    qualifierAvant: apres(detecteeLe, r.qualificationHeures),
    informerSocietesAvant: apres(detecteeLe, r.informationSocieteHeures),
    autoriteAvant: apres(detecteeLe, r.autoriteHeures),
    retourExperienceAvant: apres(detecteeLe, heuresValides(r.retourExperienceJours) * HEURES_PAR_JOUR),
  };
}

export function echeancesFaille(
  recueLe: string,
  r: { qualificationHeures: number; premiereAlerteHeures: number },
): EcheancesFaille {
  horodatage(recueLe);
  return {
    qualifierAvant: apres(recueLe, r.qualificationHeures),
    premiereAlerteAvant: apres(recueLe, r.premiereAlerteHeures),
  };
}

export function etatEcheances<K extends string>(
  echeances: Readonly<Record<K, string>>,
  faits: Partial<Record<K, string>>,
  maintenant: string,
): Record<K, EtatEcheance> {
  horodatage(maintenant);
  const etat = {} as Record<K, EtatEcheance>;
  for (const k of Object.keys(echeances) as K[]) {
    const limite = echeances[k];
    const fait = faits[k];
    if (fait !== undefined) {
      horodatage(fait);
      etat[k] = aDepasse(limite, fait, 0) ? 'faite_en_retard' : 'faite_a_temps';
    } else {
      etat[k] = aDepasse(limite, maintenant, 0) ? 'depassee' : 'a_faire';
    }
  }
  return etat;
}

export type NotificationAutorite = { faite: true; le: string } | { faite: false; motif: string };
export type LigneRegistre = {
  detecteeLe: string;
  faitsLe: string;
  nature: string;
  donneesConcernees: string;
  personnesConcernees: string;
  consequences: string;
  mesures: string;
  societesInformees: { societeRef: string; le: string }[];
  notificationAutorite: NotificationAutorite;
  clotureLe: string | null;
};

export function validerLigneRegistre(ligne: LigneRegistre): void {
  donneesPermises(ligne);
  horodatage(ligne.detecteeLe);
  horodatage(ligne.faitsLe);
  if (ecartMillisecondes(ligne.faitsLe, ligne.detecteeLe) < 0) throw new ErreurRgpd('ordre_invalide');
  if (ligne.clotureLe !== null) {
    horodatage(ligne.clotureLe);
    if (ecartMillisecondes(ligne.detecteeLe, ligne.clotureLe) < 0) throw new ErreurRgpd('ordre_invalide');
  }
  for (const s of ligne.societesInformees) {
    donneesPermises(s);
    if (typeof s.societeRef !== 'string' || s.societeRef === '') throw new ErreurRgpd('objet_inconnu');
    horodatage(s.le);
  }
  const n = ligne.notificationAutorite;
  if (n.faite) horodatage(n.le);
  else verifierMotif(n.motif);
}

export type RaisonExercice =
  | 'message_en_retard' | 'dossier_en_retard' | 'arret_non_essaye' | 'arret_plus_d_une_action';

export function resultatExercice(
  e: {
    debutLe: string;
    messageSocietePretLe: string | null;
    dossierAutoritePretLe: string | null;
    arretUrgenceActions: number | null;
  },
  r: { limiteHeures: number },
): { reussi: boolean; raisons: RaisonExercice[] } {
  horodatage(e.debutLe);
  const limiteSecondes = heuresValides(r.limiteHeures) * SECONDES_PAR_HEURE;
  const enRetard = (pret: string | null): boolean => {
    if (pret === null) return true;
    horodatage(pret);
    if (ecartMillisecondes(e.debutLe, pret) < 0) throw new ErreurRgpd('ordre_invalide');
    return aDepasse(e.debutLe, pret, limiteSecondes);
  };
  const raisons: RaisonExercice[] = [];
  if (enRetard(e.messageSocietePretLe)) raisons.push('message_en_retard');
  if (enRetard(e.dossierAutoritePretLe)) raisons.push('dossier_en_retard');
  const actions = e.arretUrgenceActions;
  if (actions === null) raisons.push('arret_non_essaye');
  else if (!Number.isSafeInteger(actions) || actions < 1) throw new ErreurRgpd('entier_invalide');
  else if (actions > 1) raisons.push('arret_plus_d_une_action');
  return { reussi: raisons.length === 0, raisons };
}
