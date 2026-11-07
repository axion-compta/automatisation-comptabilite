// Phrases des codes du profil (blocages, états, identifiants, statuts, confiances, origines). Vouvoiement.
// Le noyau ne rend que des codes ; ce fichier les traduit. Un seul export (convention du dossier).
const base = {
  blocages: {
    forme_hors_perimetre: "Cette forme d'entreprise n'est pas prise en charge pour l'instant",
    societe_cotee: "Une société cotée n'est pas prise en charge pour l'instant",
    commissaire_aux_comptes: "Une société avec un commissaire aux comptes n'est pas prise en charge pour l'instant",
    paie: "La gestion de la paie n'est pas prise en charge pour l'instant",
    plusieurs_pays: "Une activité dans plusieurs pays n'est pas prise en charge pour l'instant",
    siege_exclu: "Un siège en Corse ou outre-mer n'est pas pris en charge pour l'instant",
    code_postal_invalide: 'Ce code postal est incomplet : vérifiez les 5 chiffres',
    forme_sans_regle: "Aucune règle n'est encore prévue pour cette forme d'entreprise",
    forme_refusee_mvp: "Cette forme d'entreprise n'est pas disponible dans cette première version",
  },
  etats: {
    incomplet: 'Votre profil est incomplet : il reste des informations à renseigner',
    a_confirmer: 'Votre profil est à confirmer',
    complet: 'Votre profil est complet',
    regime_tva_a_confirmer: 'Votre régime de TVA est encore à confirmer',
    tva_non_calculee: 'TVA non calculée : régime à confirmer',
    siren_absent: "Votre numéro SIREN n'est pas encore renseigné",
  },
  identifiants: {
    siren_invalide: "Ce numéro SIREN n'est pas valide : vérifiez les 9 chiffres",
    tva_cle_fausse: "La clé de ce numéro de TVA ne correspond pas : vérifiez-le",
    vies_non_verifie: "Ce numéro de TVA n'a pas pu être vérifié : il reste à vérifier",
    sirene_saisie_manuelle: "Le service d'annuaire des entreprises est indisponible : vous pouvez saisir les informations à la main",
  },
  statuts: {
    confirme: 'Confirmé',
    a_confirmer: 'À confirmer',
    vide: 'Non renseigné',
    je_ne_sais_pas: 'Vous ne savez pas',
    a_verifier: 'À vérifier',
  },
  confiances: { sur: 'Sûr', a_verifier: 'À vérifier', douteux: 'Douteux' },
  origines: {
    document: 'Lu dans un document',
    sirene: "Annuaire des entreprises",
    vies: 'Registre européen de la TVA',
    saisie_personne: 'Saisi par vous',
    proposition_ia: 'Préparé par IA, à valider',
    import_fichier: 'Importé depuis un fichier',
  },
} as const;

type Base = typeof base;
export type FamilleCode = keyof Base;
const PHRASE_NEUTRE = 'Information à vérifier';

function phraseDeCode(famille: FamilleCode, code: string): string {
  const table: Record<string, string> | undefined = Object.hasOwn(base, famille) ? base[famille] : undefined;
  const phrase = table && Object.hasOwn(table, code) ? table[code] : undefined;
  return phrase && phrase.trim() !== '' ? phrase : PHRASE_NEUTRE;
}

// phraseDeCode est non énumérable : le contrôle des textes par écran ne parcourt que les chaînes.
export const profilCodes = Object.defineProperty({ ...base }, 'phraseDeCode', { value: phraseDeCode }) as Base & {
  readonly phraseDeCode: typeof phraseDeCode;
};
