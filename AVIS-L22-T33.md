VERDICT: A CORRIGER

PR #1158, fiche L22-T33, tête 7a45eaadd1dc48d855b65677193ef9f21909aa17.

Vérifié :
- Fichiers dans fichiers_autorises ; 167 lignes (max 170) ; garde:perimetre, garde:litteraux, garde:textes, garde:fictif vertes en local ; eslint vert.
- 6 tests nommés verts, le test hors dépôt est ignoré sans variable (message citant L22-T33). Aucun chemin du dépôt privé, aucun extrait affiché.
- Mutations détectées : ligne k + 1 -> k ; code de sortie > 0 -> >= 0 ; filtre de forme retiré ; SPECS_FORME ignorée.

Défauts (mutants survivants, 6/6 verts) :
1. outils/banc/specs-alignees.mjs:37 : retirer `|| dossier === ''` ne fait rougir aucun test. Or une variable de CI non renseignée vaut souvent la chaîne vide : le script sortirait alors en code 1 au lieu d'être ignoré. Ajouter dans sans-variable-ignore-avec-message un lancement avec SPECS_DOSSIER: '' -> code 0 et message « ignoré » citant L22-T33.
2. outils/banc/specs-alignees.mjs:15 : retirer `EXTENSIONS.test(e.name)` ne fait rougir aucun test. Ajouter un fichier non retenu (ex. 'c.bin' contenant « valeur X ») dans valeur-interdite-trouvee-ligne-exacte et vérifier qu'il n'est pas signalé ; ajouter aussi un .txt ou .json signalé.
3. outils/banc/specs-alignees.mjs:24 : retirer le drapeau 'i' de la RegExp ne fait rougir aucun test. Ajouter une ligne en casse différente (ex. « VALEUR X ») qui doit être trouvée.

Remarques :
- Le tri de readdirSync (ligne 12) n'est pas observable par les tests (l'ordre natif est déjà trié ici) ; facultatif.
- Sans SPECS_FORME, toutes les entrées s'appliquent (VI-002 signalerait une spec d'EI) : choix documenté dans le journal, formes à confirmer par Will.
- Taille à 167/170 : prévoir de factoriser les spawnSync si les ajouts dépassent.
