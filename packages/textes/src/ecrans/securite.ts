// Textes de sécurité : une phrase par raison de refus, réauthentification, bandeau du support, signalement. Vouvoiement.
// Le front n'invente aucune raison : il affiche la phrase de la raison renvoyée par le serveur.
const RAISONS_TEXTE: Readonly<Record<string, string>> = {
  non_authentifie: 'Pour continuer, connectez-vous.',
  mfa_requis: 'Pour continuer, activez la vérification en deux étapes de votre compte.',
  reauthentification_requise: 'Pour cette action, reconnectez-vous.',
  recuperation_recente: 'Vous venez de récupérer votre accès. Cette action sera disponible un peu plus tard.',
  role_lecture: 'Votre accès est en lecture seule. Demandez à l’administrateur de votre société de changer votre rôle.',
  role_insuffisant: 'Votre rôle ne permet pas cette action. Demandez à l’administrateur de votre société.',
  perimetre_expert: 'Cette société ne fait pas partie des sociétés qui vous sont confiées.',
  acces_expire: 'Votre accès a pris fin. Demandez à l’administrateur de votre société de le renouveler.',
  acces_revoque: 'Votre accès a été retiré. Demandez à l’administrateur de votre société.',
  separation_taches: 'Cette action doit être faite par une autre personne que celle qui a préparé l’opération.',
  mode_saisie_seule: 'En mode Saisie seule, la clôture est faite par votre comptable.',
  etat_acces: 'Votre accès est en cours de modification. Réessayez dans un instant.',
  societe_unique: 'Votre compte est limité à une seule société.',
  introuvable: 'Cet élément n’existe pas ou vous n’y avez pas accès.',
  personnel_axion_lecture_seule: 'Le support Axion consulte votre dossier en lecture seule : il ne peut rien modifier.',
  arret_urgence: 'Le service est temporairement suspendu. Réessayez plus tard.',
  debit_depasse: 'Trop de demandes en peu de temps. Réessayez dans un instant.',
  entree_invalide: 'Les informations saisies ne sont pas valides. Vérifiez-les puis réessayez.',
};

const CAPACITE_INCONNUE = 'Vérification de vos droits en cours.';

const SIGNALEMENT = {
  merci: 'Merci, ça nous aide à améliorer le produit.',
  titre: 'Signaler un problème',
  champCapture: 'Joindre une capture de cet écran',
} as const;

const bandeauSupport = (heureFin: string): string =>
  `Le support Axion consulte votre dossier en lecture seule jusqu’à ${heureFin}.`;

// Un seul objet exporté (contrôle des textes par écran) ; bandeauSupport est non énumérable : ce contrôle ne parcourt que les chaînes.
export const securite = Object.defineProperty(
  { raisons: RAISONS_TEXTE, capaciteInconnue: CAPACITE_INCONNUE, signalement: SIGNALEMENT, finDeConsultation: 'Fin de la consultation' },
  'bandeauSupport',
  { value: bandeauSupport },
) as {
  readonly raisons: Readonly<Record<string, string>>;
  readonly capaciteInconnue: string;
  readonly signalement: typeof SIGNALEMENT;
  readonly finDeConsultation: string;
  readonly bandeauSupport: typeof bandeauSupport;
};
