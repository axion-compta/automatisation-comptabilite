import { genererFrais, type JeuFrais } from '../../../donnees-fictives/src/frais.js';
import { ErreurParametre, parametreAuJour, type ParametreLegal } from '../../../parametres/src/au-jour.js';
import { lireBaremeIk, lireMajoration } from '../../../noyau/src/frais/bareme-ik.js';
import { ErreurFrais } from '../../../noyau/src/frais/types.js';
import type { LigneBareme, Vehicule } from './vehicules-bareme.js';

const CLE_BAREME = 'bareme_ik_voiture';
const CLE_MAJORATION = 'bareme_ik_majoration_electrique';
const PAYS = 'FR';

export type CodeBareme = 'BAREME_ABSENT' | 'BAREME_AMBIGU' | 'BAREME_ILLISIBLE';

/** Erreur métier du barème : le code est celui du contrat. Jamais de valeur de repli. */
export class ErreurBareme extends Error {
  readonly code: CodeBareme;
  constructor(code: CodeBareme) {
    super(code);
    this.code = code;
  }
}

/** Service en mémoire pur : véhicules de la personne et ligne de barème au jour J. Lecture seule. */
export function creerServiceVehiculesBareme(jeu: JeuFrais = genererFrais()) {
  const parametres: ParametreLegal[] = jeu.parametres;
  const traduire = (e: unknown): never => {
    if (e instanceof ErreurParametre) throw new ErreurBareme(e.code === 'parametre_ambigu' ? 'BAREME_AMBIGU' : 'BAREME_ABSENT');
    if (e instanceof ErreurFrais) throw new ErreurBareme('BAREME_ILLISIBLE');
    throw e;
  };
  return {
    lister(personne: string): Vehicule[] {
      return jeu.vehicules
        .filter((v) => v.personneId === personne)
        .map(({ immatriculation, ...v }) => ({ ...v, carteGrise: immatriculation !== '' }));
    },
    lire(date: string): LigneBareme {
      try {
        const l = parametreAuJour(parametres, CLE_BAREME, PAYS, date);
        const puissances = lireBaremeIk(l.valeur).puissances.map((p) => ({ cleCv: p.cleCv, tranches: p.tranches.map((t) => ({ ...t })) }));
        let majorationPourcent: number | null = null;
        try {
          majorationPourcent = lireMajoration(parametreAuJour(parametres, CLE_MAJORATION, PAYS, date).valeur);
        } catch (e) {
          if (!(e instanceof ErreurParametre) || e.code !== 'parametre_absent') throw e;
        }
        return {
          cle: l.cle, pays: l.pays, effetDebut: l.effet_debut, effetFin: l.effet_fin, statut: l.statut as LigneBareme['statut'],
          source: l.source, dateReleve: l.date_releve, puissances, majorationPourcent,
        };
      } catch (e) {
        return traduire(e);
      }
    },
  };
}
