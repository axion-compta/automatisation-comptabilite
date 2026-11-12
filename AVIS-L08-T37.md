VERDICT: OK
SHA: 28c23e57fd73c8d5a7f6fb3393d831830d1bd9ca
PR: #986

# Avis PR 986 (L08-T37, demandes des personnes) : 5e relecture, SENSIBLE (données de personnes)

Relu au SHA de tête ci-dessus (vérifié par `git fetch` + `git rev-parse`). La fiche a été lue sur origin/main (`sensible: oui`, droits) : la fusion revient à Will seul. Aucune PR de pilotage ouverte ne modifie L08-T37. `pilotage/ARRET` est absent de main. L'avis de référence est la 4e relecture (`avis/L08-T37`, SHA 2214cd4). Depuis cette relecture, deux commits ont été ajoutés : `485cc895` (import dynamique, nouveau test) et `28c23e57` (fusion de main, sans force-push).

## Suivi de l'ancien avis
1. **e2e rouge, dû à l'import statique de `node:crypto` par `personnes-service.ts` : corrigé.**
   - `packages/faux-serveur/src/domaines/personnes.ts:2` importe le module en type seulement (`import type * as Module`). Le service est chargé par `import()` à la première requête et mis en cache. Les erreurs sont reconnues par `m.ErreurPersonnes`, la classe du module chargé.
   - CI au SHA relu : `e2e` est vert, `verifier` aussi.
   - Mutation « import statique sur une ligne en tête du fichier » : le test `personnes-service-jamais-importe-statiquement` rougit.
   - Mutation « `cache ??=` remplacé par `cache =` » : 4 tests rougissent (`enregistrer-puis-lister`, `traiter-refus-sans-source-422`, `traiter-deux-fois-409`, `etat-propre-a-chaque-instance`).
   - Toutes les mutations ont été annulées.
2. **`SOURCE_MANQUANTE` prouvé sur le service seulement, pas par HTTP : décision de Will, pas un défaut de l'auteur.** Rien n'a changé : le test HTTP vérifie `ISSUE_NON_PERMISE`, et `refus-gel-sans-source-source-manquante` vérifie le service. Le journal (ligne 4) et le commentaire de PR le signalent. Will doit accepter cette preuve ou ouvrir une fiche corrective.

Défauts plus anciens (avis 986, 2e relecture), contrôlés de nouveau par mutation :
- 503 du faux serveur jamais exécuté : **corrigé.** `cibleFaux(false)` appelle `handlersPersonnes` sans `reglagesPersonnes`. Mutation « 503 remplacé par 500 » : `sans-reglage-503` rougit.
- En-tête `idempotency-key` et corps non validés dans le faux serveur : **corrigé.** Mutation « clé non exigée » : `entrees-invalides-400` rougit.

## Défauts
Aucun défaut bloquant.

## Vérifications
- **Périmètre.** Les 6 fichiers modifiés sont tous dans `fichiers_autorises`. `handlers.ts`, `app.ts`, le contrat et `options-exploitation.ts` ne sont pas touchés.
- **Taille.** 240 + 20 = 260 lignes, pour un maximum de 260. Aucune ligne « - - ». Aucun octet NUL.
- **Contenu.** Aucun mot interdit, aucun prix, aucun secret, aucun IBAN. Seules des données fictives sont utilisées : `Camille Exemple`, `http://exemple.fr`, réglages `{ moisReponse: 2, joursRappel: 3 }` marqués comme inventés.
- **Valeurs légales.** Aucune valeur légale en dur : sans `reglagesPersonnes`, les deux serveurs répondent 503 `REGLAGE_ABSENT`.
- **Imports.** Aucun alias d'import de `it` ni de `test`.
- **Journal.** 5 lignes. Il commence par `# Journal L08-T37`.
- **Tests nommés.** Les 7 tests de la fiche sont présents et joués sur les deux serveurs : `lister-les-six-demandes`, `enregistrer-puis-lister`, `rechercher-par-nom`, `recherche-vide-422`, `traiter-refus-sans-source-422`, `traiter-deux-fois-409` et `sans-reglage-503`.
- **Tests en local** (Node 24) :
  - `commun-personnes.test.ts` : 20 sur 20.
  - `packages/faux-serveur` avec `apps/serveur` : 167 fichiers de test et 1724 tests, tous verts.
- **Mutations libres** (chacune fait rougir au moins un test, puis a été annulée) :
  - Vrai serveur, traduction des `ErreurPersonnes` supprimée : 3 tests rougissent (`recherche-vide-422`, `traiter-refus-sans-source-422`, `traiter-deux-fois-409`).
  - Vrai serveur, 503 remplacé par une erreur générique : `sans-reglage-503` rougit.
  - Faux serveur, statut d'erreur forcé à 422 : `traiter-deux-fois-409` rougit.
- **Arbre de travail.** Il est propre après les mutations.
- **CI au SHA relu.** Tous les jobs sont verts : `verifier`, `tests`, `e2e`, `types`, `lint`, `gardes`, `gitleaks`, `licences` et `stryker`.

## Remarques (non bloquantes)
- `commun-personnes.test.ts:67` : le test anti-import statique repose sur une expression régulière ligne par ligne, `^import (?!type)[^\n]*personnes-service`. Un import statique écrit sur plusieurs lignes lui échappe. Je l'ai vérifié par mutation : avec `import {\n creerServicePersonnes as _c,\n} from '…personnes-service.js'`, les 20 tests restent verts. L'e2e de la CI reste le vrai filet de sécurité. On peut durcir l'expression (par exemple `/^import (?!type)[^;]*personnes-service/m`) lors d'une prochaine retouche.
- Format des erreurs : le faux serveur renvoie `defined: false` pour `REGLAGE_ABSENT` et pour les erreurs métier (`erreurExploitation` est appelé sans `data`). Pour les erreurs déclarées au contrat, le vrai serveur renvoie probablement `defined: true`. La suite commune ne compare que `status` et `code`. L'écart est mineur, à surveiller pour les écrans L08-T39 et L08-T40.
- Le dernier commentaire de reprise indique que les tests n'ont pas été relancés en local après la fusion de main. Ils l'ont été dans cette relecture, et la CI est verte.
- Le cloisonnement entre sociétés reste à revoir quand le stockage réel arrivera (remarque reprise de l'avis précédent).
