import { genererProfils, type ParametreFictif } from '../../../donnees-fictives/src/profil.js';
import type { ParametreLu } from './parametres.js';

export type OptionsParametres = { supplementaires?: ParametreFictif[] };

/** Lecture fictive sur les paramètres inventés de genererProfils ; fin exclue, `retire` ignoré, jamais de défaut. */
export function creerServiceParametres(options: OptionsParametres = {}) {
  const lignes = [...genererProfils().parametres, ...(options.supplementaires ?? [])];
  return {
    lire(cle: string, date: string): ParametreLu | null {
      const p = lignes
        .filter((l) => l.cle === cle && l.statut !== 'retire' && l.effet_debut <= date && (l.effet_fin === null || date < l.effet_fin))
        .sort((a, b) => b.effet_debut.localeCompare(a.effet_debut))[0];
      if (!p) return null;
      return {
        cle: p.cle,
        valeur: p.valeur,
        statut: p.statut,
        effetDebut: p.effet_debut,
        effetFin: p.effet_fin,
        source: { url: p.source_url, titre: p.source_titre, maj: p.source_maj },
        dateReleve: p.date_releve,
        aVerifier: p.statut !== 'valide',
      };
    },
  };
}
