// Catalogue daté : règle des taux de la BCE (heure de publication en UTC, arrondi d'une conversion isolée, jour sans cotation).
// Valeurs relevées le 12/11/2026, toutes « à vérifier » : aucune n'est validée.
import type { ParametreSource } from '../source.js';

export const CATALOGUE_CHANGE_BCE: ParametreSource[] = [
  {
    cle: 'change.bce.regle',
    pays: 'FR',
    valeur: JSON.stringify({
      heurePublicationUtc: '15:00',
      arrondi: 'demi_loin_de_zero',
      jourSansCotation: 'veille_ouvree',
    }),
    effet_debut: '2026-01-01',
    effet_fin: null,
    statut: 'a_verifier',
    source:
      'Taux de référence publiés par la BCE (heure, jour sans cotation et arrondi à confirmer à la vérification, ne pas présenter comme règle légale)',
    source_url: 'https://bofip.impots.gouv.fr/',
    source_titre: 'Conversion des montants en devises (bofip.impots.gouv.fr), taux de la BCE',
    source_maj: null,
    date_releve: '2026-11-12',
  },
];
