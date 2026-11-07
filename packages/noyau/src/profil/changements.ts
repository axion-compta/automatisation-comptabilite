import { ajouterJours, ErreurProfil, estDateIso, exigerDate } from './types.js';

export type Periode = { debut: string; fin: string };
export type Objets = {
  brouillons: { id: string; date: string }[];
  declarations: { periode: Periode; deposee: boolean }[];
  echeances: { id: string; date: string; dependDe: string[] }[];
  ecrituresValidees: { id: string; date: string }[];
};
export type Apercu = {
  brouillonsRecalcules: number;
  declarationsRecalculees: Periode[];
  echeancesDeplacees: string[];
  ecrituresValideesTouchees: 0;
  refus?: 'periode_deposee';
  regularisationProposee?: true;
};

const MOIS_PAR_AN = 12;

function liste<T>(v: unknown): T[] {
  if (!Array.isArray(v)) throw new ErreurProfil('objets_invalides');
  return v as T[];
}

/** Aperçu chiffré, sans rien enregistrer : les écritures validées ne sont jamais touchées. */
export function apercuChangement(changement: { cle: string; effetDebut: string }, objets: Objets): Apercu {
  const { cle, effetDebut } = changement ?? {};
  exigerDate(effetDebut, 'effetDebut');
  if (typeof cle !== 'string' || cle.trim() === '') throw new ErreurProfil('cle_invalide');
  if (objets === null || typeof objets !== 'object') throw new ErreurProfil('objets_invalides');
  const brouillons = liste<Objets['brouillons'][number]>(objets.brouillons);
  const declarations = liste<Objets['declarations'][number]>(objets.declarations);
  const echeances = liste<Objets['echeances'][number]>(objets.echeances);
  liste<{ date: string }>(objets.ecrituresValidees).forEach((e) => exigerDate(e?.date, 'ecriture'));
  brouillons.forEach((b) => exigerDate(b?.date, 'brouillon'));
  echeances.forEach((e) => exigerDate(e?.date, 'echeance'));
  declarations.forEach((d) => {
    exigerDate(d?.periode?.debut, 'debut');
    exigerDate(d.periode.fin, 'fin');
    if (d.periode.fin < d.periode.debut) throw new ErreurProfil('ordre_inverse');
  });
  const concernees = declarations.filter((d) => d.periode.fin >= effetDebut);
  if (concernees.some((d) => d.deposee)) {
    return {
      brouillonsRecalcules: 0,
      declarationsRecalculees: [],
      echeancesDeplacees: [],
      ecrituresValideesTouchees: 0,
      refus: 'periode_deposee',
      regularisationProposee: true,
    };
  }
  return {
    brouillonsRecalcules: brouillons.filter((b) => b.date >= effetDebut).length,
    declarationsRecalculees: concernees.map((d) => ({ debut: d.periode.debut, fin: d.periode.fin })),
    echeancesDeplacees: echeances.filter((e) => e.date >= effetDebut && e.dependDe.includes(cle)).map((e) => e.id),
    ecrituresValideesTouchees: 0,
  };
}

function finDeMois(annee: number, mois: number): string {
  const suivant = mois === MOIS_PAR_AN ? `${String(annee + 1).padStart(4, '0')}-01-01` : `${String(annee).padStart(4, '0')}-${String(mois + 1).padStart(2, '0')}-01`;
  return ajouterJours(suivant, -1);
}

/** Première date « mois-jour » au plus tôt à `depuis` (le 29 février retombe sur le dernier jour du mois). */
function prochaineFin(depuis: string, jourMois: string): string {
  const m = /^(\d{2})-(\d{2})$/.exec(jourMois ?? '');
  if (m === null || !estDateIso('2024-' + jourMois)) throw new ErreurProfil('date_invalide', 'date_invalide: jourMois');
  const mois = Number(m[1]);
  const jour = Number(m[2]);
  const annee0 = Number(depuis.slice(0, 4));
  for (const annee of [annee0, annee0 + 1]) {
    const fin = finDeMois(annee, mois);
    const candidate = Number(fin.slice(8)) < jour ? fin : `${String(annee).padStart(4, '0')}-${m[1]}-${m[2]}`;
    if (candidate >= depuis) return candidate;
  }
  throw new ErreurProfil('date_invalide', 'date_invalide: resultat');
}

/** Durée en mois : arrondie au mois inférieur (borne min) ou au mois supérieur si un mois est entamé (borne max). */
function dureeMois(debut: string, fin: string, entame: boolean): number {
  const apres = ajouterJours(fin, 1);
  const mois = (Number(apres.slice(0, 4)) - Number(debut.slice(0, 4))) * MOIS_PAR_AN + Number(apres.slice(5, 7)) - Number(debut.slice(5, 7));
  const jourApres = Number(apres.slice(8));
  const jourDebut = Number(debut.slice(8));
  if (jourApres < jourDebut) return entame ? mois : mois - 1;
  return entame && jourApres > jourDebut ? mois + 1 : mois;
}

type Exercice = { debut: string; fin: string };

/** Exercice en cours inchangé s'il est figé (nouvel exercice proposé) ; sinon sa fin est déplacée. */
export function changerDateCloture(p: {
  exerciceEnCours: Exercice & { datesFigees: boolean };
  nouvelleFinJourMois: string;
  dureeMinMois: number;
  dureeMaxMois: number;
}): { exerciceEnCours: Exercice; exerciceSuivant: Exercice | null } {
  const { exerciceEnCours: ex, nouvelleFinJourMois, dureeMinMois: min, dureeMaxMois: max } = p;
  exigerDate(ex?.debut, 'debut');
  exigerDate(ex.fin, 'fin');
  if (ex.fin < ex.debut) throw new ErreurProfil('ordre_inverse');
  const entier = (n: unknown): boolean => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
  if (!entier(min) || !entier(max) || min > max) throw new ErreurProfil('bornes_invalides');
  const controler = (e: Exercice): Exercice => {
    if (dureeMois(e.debut, e.fin, false) < min || dureeMois(e.debut, e.fin, true) > max) throw new ErreurProfil('duree_exercice_hors_bornes');
    return e;
  };
  if (ex.datesFigees) {
    const debut = ajouterJours(ex.fin, 1);
    const suivant = controler({ debut, fin: prochaineFin(debut, nouvelleFinJourMois) });
    return { exerciceEnCours: { debut: ex.debut, fin: ex.fin }, exerciceSuivant: suivant };
  }
  return { exerciceEnCours: controler({ debut: ex.debut, fin: prochaineFin(ex.debut, nouvelleFinJourMois) }), exerciceSuivant: null };
}
