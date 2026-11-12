# Sécurité différée

Date de la liste : 2026-11-12

Cette liste dit ce qui est repoussé après le premier lancement et ce qui reste obligatoire dès le départ. Elle est revue et redatée à chaque lancement.

## Mesures différées
- Signature des images de conteneurs : repoussée, le contrôle d'origine des paquets légaux est déjà en place.
- Installation chez le client sur son propre serveur : repoussée, un seul mode d'hébergement au départ.
- Écran d'administration des clés de signature : repoussé, la procédure écrite suffit au départ.
- Analyse automatique des dépendances à chaque modification de code : repoussée au-delà du contrôle déjà actif.

## Points incompressibles gardés au MVP
- Chaque requête est limitée à une seule société, et l'accès à un autre client est refusé.
- Les accès d'administration demandent une double vérification.
- Les secrets restent hors du dépôt et leur renouvellement est décrit.
- Les paquets légaux sont installés seulement s'ils sont signés, datés et plus récents que la version en place.
- Le journal des événements est actif, conservé et ne peut pas être modifié.
- Les données fictives sont retirées de l'environnement de production.
- Les écarts de la grille de sécurité ont chacun un propriétaire et une date.
