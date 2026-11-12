// Catalogue daté : IS, micro-entreprise comptable, commissaire aux comptes, indemnité, mentions, CIBS (spec 09 §03).
// Aucune ligne « valide ». Montants en centimes, taux et détention en points de base, fins EXCLUES.
import type { ParametreSource } from '../source.js';

type Statut = 'non_verifie' | 'a_verifier';
const RELEVE = '2026-11-06';
const NOTE_DEBUT = ' ; date de début non donnée par la spec : à confirmer à la vérification, ne pas présenter comme date légale';
const SERVICE_PUBLIC = 'https://entreprendre.service-public.gouv.fr/vosdroits/';
const BOFIP_IS = 'https://bofip.impots.gouv.fr/bofip/2065-PGP.html/identifiant=BOI-IS-LIQ-20-20-20230621';
const LEGI = 'https://www.legifrance.gouv.fr/codes/article_lc/';

type Def = {
  cle: string;
  valeur: string;
  debut: string;
  fin?: string;
  statut: Statut;
  url: string;
  titre: string;
  source: string;
  maj?: string;
  note?: boolean;
};

function ligne(d: Def): ParametreSource {
  return {
    cle: d.cle,
    pays: 'FR',
    valeur: d.valeur,
    effet_debut: d.debut,
    effet_fin: d.fin ?? null,
    statut: d.statut,
    source: d.source + (d.note === true ? NOTE_DEBUT : ''),
    date_releve: RELEVE,
    source_url: d.url,
    source_titre: d.titre,
    source_maj: d.maj ?? null,
  };
}

const IS = (cle: string, valeur: string): Def => ({
  cle,
  valeur,
  debut: '2022-12-31',
  statut: 'non_verifie',
  url: SERVICE_PUBLIC + 'F23575',
  titre: 'Impôt sur les sociétés : taux (lecture A) ; CGI art. 219 et BOI-IS-LIQ-20-20-20230621 (partielles)',
  source: 'Exercices clos depuis le 31/12/2022 ; 2e lecture complète à faire',
  ...(cle === 'is.taux.normal' ? { maj: '2026-02-17' } : {}),
});

const SEUILS_MICRO = { bilan: 45000000, ca: 90000000, effectif: 10, criteres: 2 };
const SEUILS_CAC = { bilan: 500000000, ca: 1000000000, effectif: 50, criteres: 2 };
const FE = (cle: string, valeur: string): Def => ({
  cle,
  valeur,
  debut: '2026-01-01',
  statut: 'a_verifier',
  url: 'https://www.economie.gouv.fr/',
  titre: 'Facturation électronique : calendrier (pages partielles, chemin exact à compléter)',
  source: 'economie.gouv.fr et impots.gouv.fr FAQ (partielles)',
  note: true,
});

const DEFS: Def[] = [
  IS('is.taux.normal', '2500'),
  IS('is.taux.reduit', '1500'),
  IS('is.plafond_benefice_reduit', '4250000'),
  IS('is.taux_reduit.ca_max', '1000000000'),
  IS('is.taux_reduit.detention_pp', '7500'),
  {
    cle: 'is.plafond.prorata',
    valeur: JSON.stringify({ regle: 'par_periode_d_imposition', a_verifier: true }),
    debut: '2026-01-01',
    statut: 'a_verifier',
    url: BOFIP_IS,
    titre: 'BOI-IS-LIQ-20-20 § 50 et § 60 ; CGI art. 219 (point P5)',
    source: 'Limite appréciée pour chaque période d’imposition ; relecture par l’expert-comptable avant le premier client (D25)',
    note: true,
  },
  {
    cle: 'micro_comptable.seuils',
    valeur: JSON.stringify(SEUILS_MICRO),
    debut: '2024-01-01',
    statut: 'a_verifier',
    url: LEGI + 'LEGIARTI000049216681',
    titre: 'C. com. art. D123-200 ; règle des 2 exercices : C. com. art. L123-16 (LEGIARTI000038611029)',
    source: 'Seuils concordants ; règle des 2 exercices consécutifs à vérifier (D25)',
  },
  {
    cle: 'cac.seuils',
    valeur: JSON.stringify(SEUILS_CAC),
    debut: '2024-01-01',
    statut: 'a_verifier',
    url: LEGI + 'LEGIARTI000049216674',
    titre: 'C. com. art. D221-5 (décret n° 2024-152) ; service-public F31440 (SARL et SAS)',
    source: 'Renvois SARL, SAS et sociétés civiles à vérifier, relecture par l’expert-comptable avant le premier client (D25)',
  },
  {
    cle: 'recouvrement.indemnite',
    valeur: '4000',
    debut: '2026-01-01',
    statut: 'a_verifier',
    url: SERVICE_PUBLIC + 'F31808',
    titre: 'Indemnité forfaitaire de recouvrement par facture, client professionnel ; C. com. art. D441-5 (partielle)',
    source: '2e lecture complète à faire',
    maj: '2026-08-11',
    note: true,
  },
  FE('facture_electronique.emission.pme_micro', '2027-09-01'),
  FE('facture_electronique.reception', '2026-09-01'),
  {
    cle: 'references.cibs',
    valeur: 'articles du CIBS remplaçant les articles du CGI (269, 293 B, 289 bis, etc.)',
    debut: '2027-01-01',
    statut: 'a_verifier',
    url: 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577',
    titre: 'CGI art. 261 et 269 abrogés au 01/01/2027 (ordonnance n° 2025-1247) ; ordonnance n° 2026-671 art. 49',
    source: 'Date concordante ; numéros exacts des autres articles à vérifier (point P2) ; URL des articles incomplète',
  },
  {
    cle: 'tva.franchise.mention',
    valeur: 'TVA non applicable, art. 293 B du CGI',
    debut: '2026-01-01',
    fin: '2027-01-01',
    statut: 'a_verifier',
    url: SERVICE_PUBLIC + 'F21746',
    titre: 'Mention du CGI (art. 293 B), admise jusqu’au 30/06/2028 (BOI-RES-TVA-000253-20261007)',
    source: 'Relecture par l’expert-comptable avant le premier client (D25)',
    note: true,
  },
  {
    cle: 'tva.franchise.mention_toleree',
    valeur: 'TVA non applicable, art. 293 B du CGI',
    debut: '2027-01-01',
    fin: '2028-07-01',
    statut: 'a_verifier',
    url: SERVICE_PUBLIC + 'F21746',
    titre: 'Mention du CGI (art. 293 B) tolérée après la bascule, jusqu’au 30/06/2028 inclus (BOI-RES-TVA-000253-20261007)',
    source: 'Fin de tolérance 30/06/2028 inclus, donc fin exclue au 01/07/2028 ; relecture par l’expert-comptable (D25)',
    note: true,
  },
  {
    cle: 'tva.franchise.mention',
    valeur: 'TVA non applicable, article L. 233-3 du CIBS',
    debut: '2027-01-01',
    statut: 'a_verifier',
    url: LEGI + 'LEGIARTI000054524584/2027-01-01',
    titre: 'CIBS art. L233-3 retenu (Légifrance) ; deux pages impots.gouv.fr divergent : L. 233-3 et L. 223-3',
    source: 'À vérifier : L. 233-3 contre L. 223-3, ne pas trancher ; relecture par l’expert-comptable (D25)',
  },
];

export const CATALOGUE_IS_SOCIETES: ParametreSource[] = DEFS.map(ligne);
