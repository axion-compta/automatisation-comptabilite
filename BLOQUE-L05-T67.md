# BLOQUE-L05-T67

Fiche : L05-T67 (revue de sécurité du chat, 30 cas A2 sur 30). Date : 2026-11-12.

## Cause
1. **Énoncés absents.** Seuls 12 cas A2 sur 30 sont rejoués dans ce dépôt (`apps/serveur/src/chat/__tests__/attaques.test.ts` : A2-01, 02, 04, 06, 07, 08, 10, 16, 17, 18, 22, 30). Les 18 autres ont leur énoncé dans la spec 05, dépôt privé, ou une règle pas encore branchée dans le serveur en mémoire. La fiche L05-T42 interdit d'inventer ou de recopier ces énoncés.
   - Énoncé privé, décision de Will : A2-03, 09, 20, 21, 27, 28.
   - Règle non branchée : A2-11 à 15 et A2-26 (L05-T16), A2-19 (L05-T23), A2-24 (L05-T22), A2-25 (L05-T12), A2-29 (L05-T02, L05-T47).
   - Portés ailleurs : A2-05 (voix, L05-T60), A2-23 (réseau, L05-T59).
2. **Périmètre.** Les `fichiers_autorises` de L05-T67 ne contiennent aucun fichier de test du serveur : les 18 cas manquants ne peuvent pas y être écrits.
3. **« Vrai serveur » et « modèle réel ».** Le critère « 30 cas sur 30 verts sur le vrai serveur » suppose une identité réelle et un modèle réel en environnement de test : rien de tel n'existe ici (données fictives seulement, J3a).
4. **Approbation.** L'approbation écrite et datée de Will (Q11) n'existe pas. Rien n'est inventé ni écrit en son nom ; le niveau I reste fermé.

Un compte rendu « 30 sur 30 » serait donc faux. Aucune PR n'est ouverte.

## Correction minimale
- Will (ou une fiche de suite) fournit les énoncés publics des 18 cas manquants et fait brancher les règles listées.
- Élargir les `fichiers_autorises` de L05-T67 à `apps/serveur/src/chat/__tests__/attaques.test.ts`, ou créer une fiche dédiée au rejeu des 18 cas.
- Prêt à faire ensuite, dans le périmètre actuel : garde `actions.mjs` (outil I ouvert seulement s'il est cité par l'ADR 0008 et si l'approbation datée y figure), ADR 0008 avec champ d'approbation vide « en attente de l'approbation écrite de Will », tests nommés `niveau-i-ouvert-seulement-si-cite` et `reauthentification-et-mot-a-saisir-exiges`, compte rendu de revue, relecture par l'agent relecteur.
- `bloque_par` à garder : « approbation écrite de Will (Q11) avant ouverture du niveau I ».
