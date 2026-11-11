VERDICT: OK

# Avis L00-T83 (PR #1032), deuxième relecture

SHA relu : 150bbbb3f363a4a219e8f046789a8ee517bc6507 (branche `lot-00/L00-T83`). Cette relecture suit l'avis A CORRIGER du SHA 3a84d86dec98d1f725b1933aa448a54ff4808a7c.

## Points de l'avis précédent : tous corrigés
1. `pilotage/fiches/L06-T40.md:16` : le critère se lit désormais « T-JRN-2, T-JRN-3 et T-JRN-4 verts contre le faux (transaction et verrou d'un dépôt en mémoire), aucune base réelle ni réseau dans les tests ». Il est accordé au contexte de la ligne 20.
2. `pilotage/fiches/L06-T41.md:16` : le critère se lit désormais « … sur la chaîne de L06-T15 avec un faux coffre et un faux stockage, aucune clé réelle ». Il est accordé au contexte de la ligne 20.
3. `pilotage/fiches/L15-T64.md` : l'étape 1 demande le texte SQL contrôlé par la garde `migrations`, une requête paramétrée testée sur ses gabarits et un dépôt en mémoire derrière l'interface de L15-T37. L'étape 2 demande des tests sur le dépôt en mémoire et sur le texte de la migration, sans base réelle ni réseau. La mesure de performance sur une vraie base passe en « Hors périmètre », reportée au feu vert J10. Les critères (gabarits, retrait d'une pièce sensible) peuvent passer.
- Remarques reprises : les critères de L06-T39 se lisent sur le texte (`IF NOT EXISTS`, clé étrangère composée, aucune base réelle). L08-T54 indique que `BLOQUE-L08-T54.md` se trouve sur la branche `bloque/L08-T54`.

## Contrôles relancés
- Le commit correctif ne touche que 5 fiches déjà listées dans `fichiers_autorises`. Le commit de fusion de `origin/main` n'apporte aucun fichier hors périmètre : `git diff origin/main...` donne 27 fichiers, tous autorisés, pour 230 lignes (plafond : 380), sans aucune ligne « - - ».
- `node outils/gardes/fiches.mjs` est vert (918 fiches, avertissements de recoupement seulement). La CI au SHA relu est entièrement verte (verifier, gardes, tests, types, lint, gitleaks, licences, stryker, e2e).
- Aucun fichier de la PR n'est modifié sur `main` depuis la base `dfc02be`.
- Aucun mot interdit, aucun prix, aucune durée de conservation, aucun nom de fournisseur ajouté. Le journal fait 9 lignes et commence par `# Journal L00-T83`.
- D88 (11/11/2026) est respectée, comme à la première relecture et sans changement depuis :
  - D45 : aucune durée fixée (L05-T66, L06-T48) ;
  - P2 : aucun fournisseur d'e-mail choisi, interface et faux (L15-T63) ;
  - Q3 : transcription contre une interface et un faux (L05-T60) ;
  - Q11 : L05-T67 n'est pas touchée ;
  - L04-T49 est découpée en L04-T56, L04-T57 et L04-T58.
- Aucun blocage réel n'est levé à tort. Restent bloquées L06-T38, L06-T42, L11-T41 et L15-T67. Ne sont pas touchées L06-T46, L02-T70, L11-T45 et les fiches de L00-T81.
- Pas de tests ni de mutations : `tests_requis: non`, la PR ne touche que des fiches.

## Remarques (non bloquantes)
- `pilotage/fiches/L15-T68.md:3` : le titre dit encore « sur le vrai serveur », alors que le contexte (ligne 20) renvoie la mesure sur la vraie base au feu vert J10. On peut aligner le titre à une prochaine retouche.
- `pilotage/fiches/L06-T48.md:20` : le mot « alerte » est toujours à confirmer par Will (D88 ne le dit pas).

Fiche sensible : fusion par Will seul.
