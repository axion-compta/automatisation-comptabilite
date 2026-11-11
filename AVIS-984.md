VERDICT: OK
SHA relu: 2f1fbbeb8f24b29f59faeea7b055aa9a2563f807

PR 984, fiche L06-T29 (branche lot-06/L06-T29), sensible : non. Relecture Opus locale, fiche lue sur origin/main.

Vérifié :
- Périmètre : 6 fichiers, tous dans fichiers_autorises. Rien dans apps/, packages/contrat ni .github/ (vrai serveur et contrat inchangés). x-scenario-role lu seulement dans packages/faux-serveur/src/domaines/capacites.ts.
- Taille : 152 lignes (maximum 250). Aucune ligne « - - », aucun octet NUL. Journal : 6 lignes.
- Critères relancés au SHA relu (Node 24) : vitest contrat-commun -t capacit : 10/10 (5 tests nommés sur le vrai serveur, 5 sur le faux) ; pnpm verifier : « tout est vert (24 étapes) » au second passage, le premier rouge seulement sur bandeau-acces.test.tsx (délai, hors PR, vert relancé seul). CI verte au SHA relu.
- Tests réels : 5 cassures sur 5 détectées (personne par défaut, rôle inconnu en 200, raison_texte, code d'erreur, tout permis).
- Exactitude : chemin pris dans le contrat, réponse validée par ReponseCapacites ; calcul identique au vrai serveur (capacites du noyau, raisons ou capaciteInconnue) ; 401 NON_AUTHENTIFIE au format des autres erreurs ; en-tête vide ou inconnu : 401, absent : dir-a.
- Aucun mot interdit, prix, secret ni nom réel ; pas d'alias d'import de it/test. Corps de PR avec Fiche et V3-MOD-004, V3-PLA-041.

Non bloquant :
1. capacites.ts:17 fixe demande5: false ; le passer à true laisse les 10 tests verts, car vrai et faux partagent le même contexteDePersonne. Une fiche suivante pourrait fixer la valeur attendue de demande5 pour une personne.
2. contrat-commun.test.ts (cibleCapacitesVrai) : rôle inconnu forcé par « as unknown as ContexteAutorisation » ; le 401 du vrai serveur vient de son catch. Acceptable mais artificiel.
3. Hors PR : bandeau-acces.test.tsx:56 instable sous charge (délai de 5000 ms).
