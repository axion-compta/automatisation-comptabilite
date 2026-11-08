// Catalogue daté : TVA, franchise, exigibilité, option pour les débits, plafonds micro et réel simplifié.
// Valeurs relevées le 06/11/2026 (spec 09 §03), toutes « à vérifier » ou « non vérifié » : aucune n'est validée.
import type { ParametreSource } from '../source.js';

const RELEVE = '2026-11-06';
const NOTE_DEBUT = 'date de début non donnée par la spec : à confirmer à la vérification, ne pas présenter comme date légale';
const SERVICE_PUBLIC = 'https://entreprendre.service-public.gouv.fr/vosdroits/';
const LEGIFRANCE = 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577';
const ECONOMIE = 'https://www.economie.gouv.fr/entreprises';
const BOFIP = 'https://bofip.impots.gouv.fr/';
const DEBUT = '2026-01-01';
const FIN_2026 = '2027-01-01';
const FIN_2028 = '2029-01-01';

type Champs = Pick<ParametreSource, 'cle' | 'source_url' | 'source_titre' | 'source_maj' | 'statut'> & {
  valeur: unknown;
  fin: string | null;
  note?: string;
};

function ligne(c: Champs): ParametreSource {
  return {
    cle: c.cle,
    pays: 'FR',
    valeur: JSON.stringify(c.valeur),
    effet_debut: DEBUT,
    effet_fin: c.fin,
    statut: c.statut,
    source: c.note === undefined ? c.source_titre : `${c.source_titre} (${c.note})`,
    source_url: c.source_url,
    source_titre: c.source_titre,
    source_maj: c.source_maj,
    date_releve: RELEVE,
  };
}

const taux = (cle: string, pointsDeBase: number, titre: string): Champs => ({
  cle,
  valeur: pointsDeBase,
  fin: null,
  statut: 'a_verifier',
  source_url: ECONOMIE,
  source_titre: titre,
  source_maj: null,
  note: NOTE_DEBUT,
});

const TITRE_FRANCHISE = 'Franchise en base de TVA (service-public.gouv.fr, F21746)';
const TITRE_MICRO = 'Régime micro-entreprise (service-public.gouv.fr, F23267)';
const TITRE_CGI = 'CGI art. 269 (Légifrance)';
const franchise = (cle: string, valeur: unknown, statut: Champs['statut']): Champs => ({
  cle,
  valeur,
  fin: FIN_2026,
  statut,
  source_url: `${SERVICE_PUBLIC}F21746`,
  source_titre: TITRE_FRANCHISE,
  source_maj: cle.endsWith('ventes') ? '2026-01-01' : null,
});
const micro = (cle: string, valeur: number): Champs => ({
  cle,
  valeur,
  fin: FIN_2028,
  statut: 'non_verifie',
  source_url: `${SERVICE_PUBLIC}F23267`,
  source_titre: TITRE_MICRO,
  source_maj: '2026-05-13',
});

const LIGNES: Champs[] = [
  taux('tva.taux.normal', 2000, 'Taux de TVA (economie.gouv.fr, CGI art. 278)'),
  taux('tva.taux.intermediaire', 1000, 'Taux de TVA (economie.gouv.fr, CGI art. 278-0 bis, 279, 281 quater)'),
  taux('tva.taux.reduit', 550, 'Taux de TVA (economie.gouv.fr, CGI art. 278-0 bis, 279, 281 quater)'),
  taux('tva.taux.particulier', 210, 'Taux de TVA (economie.gouv.fr, CGI art. 278-0 bis, 279, 281 quater)'),
  franchise('tva.franchise.seuil.ventes', { base: 8500000, majore: 9350000 }, 'non_verifie'),
  franchise('tva.franchise.seuil.services', { base: 3750000, majore: 4125000 }, 'non_verifie'),
  franchise('tva.franchise.prorata_creation', { joursAnnee: 365, finIncluse: true }, 'a_verifier'),
  franchise(
    'tva.franchise.seuil.avocats_auteurs',
    { base: 5000000, majore: 5500000, base_autres: 3500000, majore_autres: 3850000 },
    'a_verifier',
  ),
  {
    cle: 'tva.exigibilite.services',
    valeur: 'encaissement',
    fin: FIN_2026,
    statut: 'a_verifier',
    source_url: LEGIFRANCE,
    source_titre: `${TITRE_CGI}, 2 c, version au 06/11/2026`,
    source_maj: null,
    note: NOTE_DEBUT,
  },
  {
    cle: 'tva.exigibilite.acompte_bien',
    valeur: 'encaissement_acompte',
    fin: FIN_2026,
    statut: 'a_verifier',
    source_url: LEGIFRANCE,
    source_titre: `${TITRE_CGI}, 2 a`,
    source_maj: null,
    note: NOTE_DEBUT,
  },
  {
    cle: 'tva.option_debits.effet',
    valeur: { regle: 'premier_jour_mois_suivant' },
    fin: null,
    statut: 'a_verifier',
    source_url: BOFIP,
    source_titre: 'BOI-TVA-BASE-20-40-20210224 (bofip.impots.gouv.fr)',
    source_maj: null,
    note: NOTE_DEBUT,
  },
  micro('micro.plafond.ventes', 20310000),
  micro('micro.plafond.services', 8360000),
  {
    cle: 'reel_simplifie.plafond',
    valeur: { ventes: 94500000, autres: 28600000 },
    fin: FIN_2028,
    statut: 'a_verifier',
    source_url: 'https://entreprendre.service-public.gouv.fr/actualites/A18813',
    source_titre: 'Arrêté du 27/01/2026 et BOI-BAREME-000044-20260819',
    source_maj: null,
    note: 'seuils du régime simplifié de TVA à vérifier ; relecture par l’expert-comptable avant le premier client',
  },
  {
    cle: 'alerte.seuil_pct',
    valeur: 9000,
    fin: null,
    statut: 'a_verifier',
    source_url: '',
    source_titre: 'réglage du produit',
    source_maj: null,
    note: `spec 09, 02-regimes-fiscaux règle 6 ; ${NOTE_DEBUT}`,
  },
];

export const CATALOGUE_TVA_MICRO: ParametreSource[] = LIGNES.map(ligne);
