// Contrats JSON stricts des sept agents de reprise du MVP : champ inconnu, champ manquant ou type faux = rejet.
import { centimes, type Centimes } from '../argent/index.js';

type Schema =
  | { t: 'texte' }
  | { t: 'entier' }
  | { t: 'booleen' }
  | { t: 'choix'; valeurs: readonly string[] }
  | { t: 'liste'; item: Schema }
  | { t: 'objet'; champs: Readonly<Record<string, Schema>> };

const texte: Schema = { t: 'texte' };
const entier: Schema = { t: 'entier' };
const booleen: Schema = { t: 'booleen' };
const choix = (...valeurs: string[]): Schema => ({ t: 'choix', valeurs });
const liste = (item: Schema): Schema => ({ t: 'liste', item });
const objet = (champs: Record<string, Schema>): Schema => ({ t: 'objet', champs });

const CONTRATS: Readonly<Record<string, Schema>> = {
  verificateur_arithmetique: objet({ controles: liste(objet({ piece: texte, ecartCentimes: entier, signale: booleen })) }),
  plan: objet({ comptes: liste(objet({ numero: texte, libelle: texte, sens: choix('debit', 'credit') })) }),
  soldes: objet({ soldes: liste(objet({ compte: texte, soldeCentimes: entier })) }),
  inter_documents: objet({ rapprochements: liste(objet({ pieceA: texte, pieceB: texte, concordent: booleen })) }),
  relecteur: objet({ remarques: liste(objet({ cible: texte, gravite: choix('mineure', 'majeure', 'bloquante'), texte })), bloquant: booleen }),
  chef_dossier: objet({ decision: choix('continuer', 'arbitrer', 'arreter'), motifs: liste(texte) }),
  redacteur: objet({ sections: liste(objet({ titre: texte, contenu: texte })) }),
};
export const AGENTS_REPRISE: readonly string[] = Object.keys(CONTRATS);

export type ResultatContrat = { ok: true; sortie: unknown } | { ok: false; code: 'hors_contrat'; chemin: string };

/** Premier chemin en défaut, ou `null` si la valeur respecte le schéma. */
function defaut(v: unknown, s: Schema, chemin: string): string | null {
  switch (s.t) {
    case 'texte': return typeof v === 'string' ? null : chemin;
    case 'entier': return typeof v === 'number' && Number.isSafeInteger(v) ? null : chemin;
    case 'booleen': return typeof v === 'boolean' ? null : chemin;
    case 'choix': return typeof v === 'string' && s.valeurs.includes(v) ? null : chemin;
    case 'liste': {
      if (!Array.isArray(v)) return chemin;
      for (const [i, element] of v.entries()) {
        const d = defaut(element, s.item, `${chemin}[${i}]`);
        if (d !== null) return d;
      }
      return null;
    }
    case 'objet': {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return chemin === '' ? '$' : chemin;
      const point = (nom: string): string => (chemin === '' ? nom : `${chemin}.${nom}`);
      for (const nom of Object.keys(v)) if (!Object.hasOwn(s.champs, nom)) return point(nom);
      for (const [nom, sousSchema] of Object.entries(s.champs)) { // champ manquant : undefined échoue au type
        const d = defaut((v as Record<string, unknown>)[nom], sousSchema, point(nom));
        if (d !== null) return d;
      }
      return null;
    }
  }
}

export function validerSortie(agent: string, json: unknown): ResultatContrat {
  const schema = Object.hasOwn(CONTRATS, agent) ? CONTRATS[agent] : undefined;
  if (schema === undefined) return { ok: false, code: 'hors_contrat', chemin: '$agent' };
  const d = defaut(json, schema, '');
  return d === null ? { ok: true, sortie: json } : { ok: false, code: 'hors_contrat', chemin: d };
}

/** Un chiffre contesté est tranché par le recalcul du code, jamais par un vote ; `accord` dit si les agents l'avaient trouvé. */
export function trancherChiffre(
  propositions: readonly { agent: string; valeur: Centimes }[],
  recalculer: () => Centimes,
): { valeur: Centimes; source: 'recalcul'; accord: boolean } {
  const valeur = centimes(recalculer());
  return { valeur, source: 'recalcul', accord: propositions.every((p) => p.valeur === valeur) };
}
