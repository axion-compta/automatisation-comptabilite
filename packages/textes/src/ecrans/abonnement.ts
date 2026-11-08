// Textes communs de l'abonnement. Vouvoiement, aucun montant, aucun pourcentage en dur.
// Un seul objet exporté : les fonctions sont non énumérables (le contrôle des textes par écran ne parcourt que les chaînes).
const ajoute = (o: object, nom: string, valeur: unknown): void => {
  Object.defineProperty(o, nom, { value: valeur });
};

const etat = (titre: string, consequence: string, etape: (date: string) => string) => {
  const o = { titre, consequence };
  ajoute(o, 'prochaineEtape', etape);
  return o as typeof o & { readonly prochaineEtape: (dateFormatee: string) => string };
};

const SUITE = 'Vous pouvez toujours consulter et exporter vos documents.';

const jauge = {
  libelle: 'Pièces traitées ce mois-ci',
  depasse: "Vous avez dépassé le volume de votre palier. Vos pièces continuent d'être traitées.",
};
ajoute(jauge, 'valeur', (utilise: string, compris: string): string => `${utilise} sur ${compris}`);
ajoute(jauge, 'estimation', (n: string): string => `Estimation de fin de mois : ${n}`);
ajoute(jauge, 'seuilAtteint', (pourcent: string): string => `Vous avez atteint ${pourcent} du volume de votre palier.`);

const abonnementBase = {
  banniere: {
    ESSAI: etat('Votre période d’essai est en cours', `Toutes les fonctions sont ouvertes pendant l’essai. ${SUITE}`, (d) => `Choisissez votre abonnement avant le ${d}.`),
    DELAI_DE_GRACE: etat('Un règlement est à régulariser', `L’assistant reste disponible pendant le délai de grâce. ${SUITE}`, (d) => `Régularisez votre règlement avant le ${d}.`),
    LECTURE_SEULE: etat('Votre abonnement est en pause', `L’assistant est arrêté. ${SUITE}`, (d) => `Reprenez votre abonnement à partir du ${d}.`),
    SUSPENDU: etat('Votre abonnement est suspendu', `L’assistant est arrêté. ${SUITE}`, (d) => `Contactez Axion avant le ${d} pour rétablir l’accès.`),
    RESILIE: etat('Votre contrat est terminé', `L’assistant est arrêté. ${SUITE}`, (d) => `Exportez vos documents avant le ${d}.`),
  },
  causes: {
    periode_essai: 'Vous êtes en période d’essai.',
    impaye_signale: 'Un règlement n’a pas pu être encaissé.',
    pause: 'Vous avez demandé une pause de votre abonnement.',
    arrete: 'Votre abonnement a été arrêté.',
    contrat_termine: 'Votre contrat est arrivé à son terme.',
  },
  liens: { portail_abonnement: 'Abonnement et factures', contacter_axion: 'Contacter Axion' },
  jauge,
  erreurs: {
    ETAT_ACCES: 'Cette action n’est pas possible dans l’état actuel de votre abonnement.',
    ACCORD_MANQUANT: 'Votre accord est nécessaire pour poursuivre.',
    PALIER_INCONNU: 'Ce palier n’existe pas.',
    PALIER_IDENTIQUE: 'Vous avez déjà ce palier.',
    PALIER_NON_SUPERIEUR: 'Ce palier n’est pas supérieur à votre palier actuel.',
    PAS_DE_REMISE: 'Aucune remise ne s’applique à votre abonnement.',
    DEJA_ACCUSE: 'Vous avez déjà accusé réception de ce document.',
    EMPREINTE_DIFFERENTE: 'Le document a changé depuis votre lecture. Relisez-le, puis réessayez.',
    GEL_DEJA_ACTIF: 'Le gel est déjà en place.',
    GEL_INACTIF: 'Aucun gel n’est en place.',
    VERSION_PERIMEE: 'Cette version n’est plus à jour. Actualisez la page, puis réessayez.',
    DOCUMENT_ABSENT: 'Ce document est introuvable.',
  },
};
const reprise = (n: number): string => {
  if (!Number.isInteger(n) || n <= 0) return '';
  return n === 1
    ? '1 pièce reçue pendant la pause a été traitée.'
    : `${n} pièces reçues pendant la pause ont été traitées.`;
};
ajoute(abonnementBase, 'reprise', reprise);

export const abonnement = abonnementBase as typeof abonnementBase & { readonly reprise: (n: number) => string };
