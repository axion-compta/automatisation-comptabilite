// Convention des textes par écran : un fichier par écran dans ce dossier, nommé par l'identifiant de
// l'écran en minuscules (n03.ts, n04.ts, e44.ts), qui exporte un seul objet `as const` de chaînes.
// Vouvoiement partout. Les libellés de menu suivent le plan V5.3 (à confirmer par Will : ce fichier seul change).
export const socle = {
  menu: {
    activite: 'Mon activité',
    mois: 'Mon mois',
    banque: 'Ma banque',
    factures: 'Mes factures',
    declarations: 'Mes déclarations',
    documents: 'Mes documents',
  },
  barre: {
    activite: 'Mon activité',
    mois: 'Mon mois',
    banque: 'Ma banque',
    documents: 'Mes documents',
    plus: 'Plus',
  },
  discuter: 'Discuter',
  cloche: 'Ce qui demande mon attention',
  compteur: {
    une: '1 alerte',
    plusieurs: '{n} alertes',
    uneUrgente: ', dont une urgente',
    plusieursUrgentes: ', dont {n} urgentes',
    prioritaire: ', à traiter en priorité',
  },
  navigation: { titre: 'Navigation principale', reduire: 'Réduire le menu', agrandir: 'Agrandir le menu' },
  enPreparation: { titre: 'Page en préparation', message: 'Cette page sera bientôt disponible.' },
  accueil: { titre: 'Bienvenue', message: "Votre espace est en cours de mise en place." },
  etats: {
    chargement: 'Chargement en cours…',
    vide: 'Aucun élément à afficher.',
    erreurReseau: 'Connexion impossible. Vérifiez votre réseau.',
    acces403: "Vous n'avez pas accès à cette page.",
    introuvable404: "Cette page n'existe pas.",
    conflit409: "Cet élément a été modifié entre-temps. Actualisez la page, puis réessayez.",
    verrouille423: 'Cette période est verrouillée.',
  },
  pagination: {
    precedent: 'Précédent',
    suivant: 'Suivant',
    resume: '{debut} à {fin} sur {total}',
  },
} as const;
