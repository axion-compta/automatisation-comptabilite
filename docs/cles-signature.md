# Clés de signature des paquets légaux

Ce document décrit la garde des clés et la rotation. Il ne contient ni nom, ni lieu, ni valeur de clé. La clé privée n'entre jamais dans le dépôt ni sur un poste connecté.

## Garde
1. La clé privée est tenue par deux personnes : aucune ne peut signer seule.
2. Elle est conservée sur un support hors ligne, rangé séparément de l'ordinateur qui prépare les paquets.
3. Une copie de secours, chiffrée, est rangée dans un second lieu distinct du premier.
4. Chaque ouverture du support est notée (date, motif, les deux personnes présentes).
5. Seule la clé publique et son identifiant sont donnés à l'application.

## Perte ou compromission de la clé
1. Constater la perte et noter la date.
2. Révoquer l'ancienne clé dans la liste des clés de l'application : plus aucun paquet signé par elle n'est accepté.
3. Générer une nouvelle paire de clés sur un poste isolé, par les deux personnes.
4. Ranger la nouvelle clé privée selon la garde ci-dessus, puis détruire les copies de l'ancienne.
5. Ajouter la nouvelle clé publique à la liste des clés de l'application.
6. Signer et installer un paquet d'essai de version plus récente avec la nouvelle clé.
7. Vérifier qu'un paquet signé par l'ancienne clé est refusé avec le code `cle_revoquee`.
8. Noter le compte rendu de l'exercice (date, étapes jouées, écarts) et l'archiver hors du dépôt public.

Les étapes 5 à 7 sont rejouées par le test `exercice-rotation`. L'exercice complet, à deux personnes, est joué avant le lancement ; son compte rendu est le point « rotation des clés » de `docs/mise-en-production.csv`.
