# Clés de signature des paquets légaux

Ce document décrit la garde des clés et la rotation. Il ne contient ni nom, ni lieu, ni valeur de clé. La clé privée n'entre jamais dans le dépôt ni sur un poste connecté.

## Garde
1. La clé privée est tenue par deux personnes : aucune ne peut signer seule.
2. Elle est conservée sur un support hors ligne, rangé séparément de l'ordinateur qui prépare les paquets.
3. Une copie de secours, chiffrée, est rangée dans un second lieu distinct du premier.
4. Chaque ouverture du support est notée (date, motif, les deux personnes présentes).
5. Seule la clé publique et son identifiant sont donnés à l'application.

## Installation d'un paquet
1. Le paquet arrive sous forme d'un fichier unique (paquet, version, date d'effet, identifiant de clé, signature).
2. L'administrateur le dépose dans l'application, sans accès au réseau.
3. L'application refuse le fichier s'il est illisible, de signature invalide, de clé inconnue ou révoquée, ou de version non plus récente que celle en place. Chaque refus laisse une ligne dans le journal.

## Perte ou compromission de la clé
1. Constater la perte et noter la date.
2. Révoquer l'ancienne clé dans la liste des clés de l'application : plus aucun paquet signé par elle n'est accepté.
3. Générer une nouvelle paire de clés sur un poste isolé, par les deux personnes.
4. Ranger la nouvelle clé privée selon la garde ci-dessus, puis détruire les copies de l'ancienne.
5. Ajouter la nouvelle clé publique à la liste des clés de l'application.
6. Signer et installer un paquet d'essai de version plus récente avec la nouvelle clé.
7. Vérifier qu'un paquet signé par l'ancienne clé est refusé avec le code `cle_revoquee`.
8. Noter le compte rendu de l'exercice (date, étapes jouées, écarts) et l'archiver hors du dépôt public.

## Exercice de rotation
Les étapes 5 à 7 sont rejouées à l'identique par le test `exercice-rotation`. L'exercice complet, avec les deux personnes, est joué avant le lancement ; son compte rendu est le point 22 de `docs/mise-en-production.csv`.
