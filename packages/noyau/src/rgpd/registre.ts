import { ecrireCsv } from '../exports/csv.js';
import { ErreurRgpd, verifierDate, type CodeErreurRgpd } from './types.js';

export const COLONNES_REGISTRE = [
  'traitement', 'responsable', 'finalite', 'base_legale_proposee', 'personnes_concernees', 'categories_donnees',
  'destinataires', 'transfert_hors_ue', 'duree', 'mesures_securite', 'source', 'date_releve', 'controle_croise',
] as const;
export type ColonneRegistre = (typeof COLONNES_REGISTRE)[number];
export type LigneRegistre = Record<ColonneRegistre, string> & { approuvee?: boolean };

const DUREE = /^parametre:[a-z0-9_]+$/;
const TRANSFERT = /^(non|oui:.*\S.*)$/;
const A_VERIFIER = ' (à vérifier)';
const SOURCE = 'spec 08 fichier 06';

export function validerLigne(ligne: LigneRegistre): { ok: true } | { ok: false; codes: CodeErreurRgpd[] } {
  const codes = new Set<CodeErreurRgpd>();
  const vide = (c: ColonneRegistre): boolean => typeof ligne[c] !== 'string' || ligne[c].trim() === '';
  for (const c of COLONNES_REGISTRE) if (c !== 'controle_croise' && vide(c)) codes.add('colonne_manquante');
  if (ligne.approuvee === true && vide('controle_croise')) codes.add('colonne_manquante');
  if (!vide('duree') && !DUREE.test(ligne.duree)) codes.add('valeur_interdite');
  if (!vide('transfert_hors_ue') && !TRANSFERT.test(ligne.transfert_hors_ue)) codes.add('valeur_interdite');
  if (!vide('date_releve')) {
    try {
      verifierDate(ligne.date_releve);
    } catch (e) {
      if (!(e instanceof ErreurRgpd)) throw e;
      codes.add('date_invalide');
    }
  }
  return codes.size === 0 ? { ok: true } : { ok: false, codes: [...codes].sort() };
}

type Depart = [traitement: string, finalite: string, base: string, personnes: string, donnees: string, destinataires: string, duree: string, mesures: string];
const DEPART: Depart[] = [
  ['comptabilité', 'Tenir votre comptabilité', 'obligation légale', 'vos clients et vos fournisseurs', 'identité, adresse, montants', 'votre cabinet comptable', 'comptabilite', 'accès par rôle ; journal des actions'],
  ['pièces et lecture', 'Lire et ranger vos pièces', 'exécution du contrat', 'vos clients et vos fournisseurs', 'documents, texte lu', 'votre cabinet comptable', 'pieces', 'accès par rôle ; transfert chiffré'],
  ['banque', 'Rapprocher vos relevés', 'exécution du contrat', 'vos clients et vos fournisseurs', 'libellés et montants de relevé', 'votre cabinet comptable', 'banque', 'lecture seule ; accès par rôle'],
  ['chat', 'Répondre à vos questions', 'exécution du contrat', 'vos équipes', 'messages échangés', 'aucun tiers', 'chat', 'accès par rôle ; messages protégés'],
  ['signalements', 'Traiter les problèmes que vous signalez', 'intérêt légitime', 'vos équipes', 'description du problème', 'équipe d’assistance', 'signalements', 'accès restreint ; données minimales'],
  ['journaux techniques', 'Suivre le bon fonctionnement', 'intérêt légitime', 'vos équipes', 'événements techniques sans contenu', 'équipe technique', 'journaux', 'accès restreint ; aucune donnée de contenu'],
  ['sauvegardes', 'Retrouver vos données après un incident', 'intérêt légitime', 'vos clients, fournisseurs et équipes', 'copie chiffrée des données', 'aucun tiers', 'sauvegardes', 'chiffrement ; restauration testée'],
  ['comptes et connexion', 'Vous identifier et protéger l’accès', 'exécution du contrat', 'vos équipes', 'identifiant, journal de connexion', 'équipe technique', 'comptes', 'mot de passe protégé ; double vérification'],
];

export function modelePrerempli(dateReleve: string): LigneRegistre[] {
  return DEPART.map(([traitement, finalite, base, personnes, donnees, destinataires, duree, mesures]) => ({
    traitement, responsable: 'la société', finalite, base_legale_proposee: base + A_VERIFIER,
    personnes_concernees: personnes, categories_donnees: donnees, destinataires, transfert_hors_ue: 'non',
    duree: `parametre:duree_${duree}`, mesures_securite: mesures, source: SOURCE, date_releve: dateReleve,
    controle_croise: '',
  }));
}

export function registreCsv(lignes: LigneRegistre[]): string {
  return ecrireCsv({
    colonnes: COLONNES_REGISTRE.map((c) => ({ code: c, type: 'texte', entete: c })),
    lignes,
  });
}
