import { genererProfils, perimetreFictif, type ChampFictif } from '../../../donnees-fictives/src/profil.js';
import type { ChampProfilV1, ProfilV1 } from './profil.js';

type Perimetre = { formesHorsPerimetre: string[]; prefixesPostauxExclus: string[] };
export type OptionsProfil = { champsSupplementaires?: ChampFictif[]; perimetre?: Perimetre };

const OBLIGATOIRES = ['denomination', 'forme', 'siren', 'exercice_debut', 'exercice_fin', 'regime_tva', 'regime_imposition', 'tenue'] as const;

/** Copie de lecture, la règle fait foi dans le noyau L09-T04 et L09-T07 (listes du jeu fictif). */
export function creerServiceProfil(societeId: string, options: OptionsProfil = {}) {
  const jeu = genererProfils();
  const perimetre = options.perimetre ?? perimetreFictif;
  const imposition: ChampFictif[] = jeu.regimesImposition
    .filter((r) => r.societeId === societeId)
    .map((r, i) => ({ societeId, cle: 'regime_imposition', valeur: r.regime, origine: 'document', confiance: 'sur', source_ref: 'piece-fictive-001#page=1', date_source: '2026-05-01', statut: 'confirme', effet_debut: r.effet_debut, confirme_par: null, confirme_le: null, rang: 1000 + i }));
  const tous = [...jeu.champs.filter((c) => c.societeId === societeId), ...imposition, ...(options.champsSupplementaires ?? []).filter((c) => c.societeId === societeId)];

  /** Valeur en vigueur par clé à la date : effet le plus récent, puis rang le plus haut. */
  const enVigueur = (date: string) => {
    const parCle = new Map<string, ChampFictif>();
    for (const c of tous) {
      if (c.effet_debut > date) continue;
      const cur = parCle.get(c.cle);
      if (!cur || c.effet_debut > cur.effet_debut || (c.effet_debut === cur.effet_debut && c.rang > cur.rang)) parCle.set(c.cle, c);
    }
    return parCle;
  };

  return {
    lire(au: string | undefined, aujourdhui: string): ProfilV1 {
      const vigueur = enVigueur(au ?? aujourdhui);
      const lignes = [...vigueur.values()].sort((a, b) => a.rang - b.rang);
      const champs: ChampProfilV1[] = lignes.map((c) => ({
        cle: c.cle,
        valeur: c.valeur,
        origine: c.origine as ChampProfilV1['origine'],
        confiance: c.confiance as ChampProfilV1['confiance'],
        source: c.source_ref && c.date_source ? { ref: c.source_ref, date: c.date_source } : null,
        statut: c.statut as ChampProfilV1['statut'],
        effetDebut: c.effet_debut,
      }));
      const statut = (cle: string) => vigueur.get(cle)?.statut;
      const formation = vigueur.get('en_formation');
      const sirenOk = (s: string | undefined) => s === 'confirme';
      const manquants: string[] = [];
      const aConfirmer: string[] = [];
      for (const cle of OBLIGATOIRES) {
        let s = statut(cle);
        if (cle === 'siren' && formation?.valeur === 'vrai' && formation.statut === 'confirme') s = 'confirme';
        if (s === undefined || s === 'vide' || s === 'je_ne_sais_pas') manquants.push(cle);
        else if (!sirenOk(s)) aConfirmer.push(cle);
      }
      const blocages: string[] = [];
      if (vigueur.get('a_commissaire_aux_comptes')?.valeur === 'oui') blocages.push('commissaire_aux_comptes');
      const forme = vigueur.get('forme')?.valeur;
      if (typeof forme === 'string' && perimetre.formesHorsPerimetre.includes(forme)) blocages.push('forme_hors_perimetre');
      const cp = vigueur.get('code_postal_siege')?.valeur;
      if (typeof cp === 'string' && perimetre.prefixesPostauxExclus.some((p) => cp.startsWith(p))) blocages.push('siege_exclu');
      const etat = manquants.length > 0 || blocages.length > 0 ? 'incomplet' : aConfirmer.length > 0 ? 'a_confirmer' : 'complet';
      return { version: 'profil.v1', etat, champs, manquants: manquants.sort(), aConfirmer: aConfirmer.sort(), blocages };
    },
  };
}
