// Double lecture des états critiques : deux lectures indépendantes ; sans accord, aucune valeur n'est choisie.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { ConventionPays } from '../pieces/lecture/conventions.js';
import { lireMontant } from '../pieces/lecture/formats.js';

/** Valeur telle qu'écrite sur l'état, avec l'usage d'écriture du pays de l'état. */
export interface ValeurLue { texte: string; convention: ConventionPays }
export type Lecture = Readonly<Record<string, ValeurLue>>;
export type ResultatChamp =
  | { champ: string; statut: 'retenue'; valeur: Centimes }
  | { champ: string; statut: 'a_arbitrer'; valeurA?: Centimes; valeurB?: Centimes };

function lire(l: Lecture, champ: string): Centimes | undefined {
  const v = Object.hasOwn(l, champ) ? l[champ] : undefined;
  if (v === undefined) return undefined;
  const r = lireMontant(v.texte, v.convention);
  return 'centimes' in r ? r.centimes : undefined;
}

/** Valeur retenue seulement si les deux lectures concordent au centime ; sinon `a_arbitrer`, sans valeur choisie ni moyenne. */
export function comparerEtats(lectureA: Lecture, lectureB: Lecture): ResultatChamp[] {
  const champs = [...new Set([...Object.keys(lectureA), ...Object.keys(lectureB)])].sort();
  return champs.map((champ): ResultatChamp => {
    const [valeurA, valeurB] = [lire(lectureA, champ), lire(lectureB, champ)];
    if (valeurA !== undefined && valeurA === valeurB) return { champ, statut: 'retenue', valeur: valeurA };
    return { champ, statut: 'a_arbitrer', ...(valeurA === undefined ? {} : { valeurA }), ...(valeurB === undefined ? {} : { valeurB }) };
  });
}

/** Contrôle de pied : somme des postes égale au total au centime ; `ecart` = somme − total. */
export function controlerPied(etat: { postes: readonly Centimes[]; total: Centimes }): { coherent: boolean; ecart: Centimes } {
  const somme = etat.postes.reduce((s, p) => ajouter(s, centimes(p)), centimes(0));
  const ecart = soustraire(somme, centimes(etat.total));
  return { coherent: ecart === 0, ecart };
}

/** Pages à relire : seulement celles en échec, une fois chacune, dans l'ordre. */
export function pagesARelire(resultats: readonly { page: number; statut: 'ok' | 'echec' }[]): number[] {
  return [...new Set(resultats.filter((r) => r.statut === 'echec').map((r) => r.page))].sort((a, b) => a - b);
}
