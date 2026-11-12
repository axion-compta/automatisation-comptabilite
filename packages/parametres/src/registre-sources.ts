// Registre des sources officielles : une entrée par source citée par les catalogues datés.
// Licence et quota inconnus : valeur « a_confirmer », jamais vide. Aucune entrée n'est « verifie ».

export const STATUTS_SOURCE = ['verifie', 'partiel', 'non_verifie'] as const;
export type StatutSource = (typeof STATUTS_SOURCE)[number];

export const A_CONFIRMER = 'a_confirmer';

export interface EntreeSource {
  nom: string;
  url: string;
  consultation: string;
  version: string;
  licence: string;
  quota: string;
  proprietaire: string;
  statut: StatutSource;
}

export type ProblemeEntree = 'champ_vide' | 'statut_inconnu' | 'date_invalide';

const CHAMPS_TEXTE = [
  'nom',
  'url',
  'version',
  'licence',
  'quota',
  'proprietaire',
] as const;

export function dateValide(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function verifierEntree(
  e: Partial<Record<keyof EntreeSource, unknown>>,
): ProblemeEntree[] {
  const problemes: ProblemeEntree[] = [];
  for (const c of CHAMPS_TEXTE) {
    const v = e[c];
    if (typeof v !== 'string' || v.trim() === '') {
      problemes.push('champ_vide');
      break;
    }
  }
  if (!STATUTS_SOURCE.some((s) => s === e.statut))
    problemes.push('statut_inconnu');
  if (!dateValide(e.consultation)) problemes.push('date_invalide');
  return problemes;
}

const JOUR_MS = 86_400_000;

/** Entrées dont la dernière consultation date de STRICTEMENT plus de seuilJours jours. */
export function alertesConsultation(
  registre: readonly EntreeSource[],
  aujourdhui: string,
  seuilJours: number,
): EntreeSource[] {
  if (!dateValide(aujourdhui)) throw new Error('date_invalide');
  if (!Number.isFinite(seuilJours) || seuilJours < 0) throw new Error('seuil_invalide');
  const ref = Date.parse(`${aujourdhui}T00:00:00Z`);
  return registre.filter((e) => {
    if (!dateValide(e.consultation)) return true;
    return (
      (ref - Date.parse(`${e.consultation}T00:00:00Z`)) / JOUR_MS > seuilJours
    );
  });
}

const RELEVE = '2026-11-06';

function source(nom: string, url: string, proprietaire: string): EntreeSource {
  return {
    nom,
    url,
    consultation: RELEVE,
    version: `releve-${RELEVE}`,
    licence: A_CONFIRMER,
    quota: A_CONFIRMER,
    proprietaire,
    statut: 'non_verifie',
  };
}

const DILA = 'Direction de l’information légale et administrative';

export const REGISTRE_SOURCES: readonly EntreeSource[] = [
  source(
    'Impôt sur les sociétés : taux (lecture A) ; CGI art. 219 et BOI-IS-LIQ-20-20-20230621 (partielles)',
    'https://entreprendre.service-public.gouv.fr/vosdroits/F23575', DILA),
  source(
    'BOI-IS-LIQ-20-20 § 50 et § 60 ; CGI art. 219 (point P5)',
    'https://bofip.impots.gouv.fr/bofip/2065-PGP.html/identifiant=BOI-IS-LIQ-20-20-20230621', 'Direction générale des Finances publiques'),
  source(
    'C. com. art. D123-200 ; règle des 2 exercices : C. com. art. L123-16 (LEGIARTI000038611029)',
    'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049216681', DILA),
  source(
    'C. com. art. D221-5 (décret n° 2024-152) ; service-public F31440 (SARL et SAS)',
    'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049216674', DILA),
  source(
    'Indemnité forfaitaire de recouvrement par facture, client professionnel ; C. com. art. D441-5 (partielle)',
    'https://entreprendre.service-public.gouv.fr/vosdroits/F31808', DILA),
  source(
    'Facturation électronique : calendrier (pages partielles, chemin exact à compléter)',
    'https://www.economie.gouv.fr/', 'Ministère de l’Économie et des Finances'),
  source(
    'CGI art. 261 et 269 abrogés au 01/01/2027 (ordonnance n° 2025-1247) ; ordonnance n° 2026-671 art. 49',
    'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577', DILA),
  source(
    'Mention du CGI (art. 293 B), admise jusqu’au 30/06/2028 (BOI-RES-TVA-000253-20261007)',
    'https://entreprendre.service-public.gouv.fr/vosdroits/F21746', DILA),
  source(
    'CIBS art. L233-3 retenu (Légifrance) ; deux pages impots.gouv.fr divergent : L. 233-3 et L. 223-3',
    'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054524584/2027-01-01', DILA),
  source(
    'Taux de TVA (economie.gouv.fr, CGI art. 278)',
    'https://www.economie.gouv.fr/entreprises', 'Ministère de l’Économie et des Finances'),
  source(
    'BOI-TVA-BASE-20-40-20210224 (bofip.impots.gouv.fr)',
    'https://bofip.impots.gouv.fr/', 'Direction générale des Finances publiques'),
  source(
    'Régime micro-entreprise (service-public.gouv.fr, F23267)',
    'https://entreprendre.service-public.gouv.fr/vosdroits/F23267', DILA),
  source(
    'Arrêté du 27/01/2026 et BOI-BAREME-000044-20260819',
    'https://entreprendre.service-public.gouv.fr/actualites/A18813', DILA),
];
