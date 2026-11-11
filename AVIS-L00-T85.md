VERDICT: A CORRIGER

# Avis L00-T85 (relecteur Opus, lot 5 section R, 11/11/2026)

Bilan : #1060 OK ; #1061 A CORRIGER (un défaut bloquant, voir plus bas). Les deux PR sont sensibles (`pilotage/`) : fusion par Will seul.

## PR #1060 : fiche seule L00-T85

VERDICT: OK
SHA de tête : 9a14a91c471c02b05a6db9ae9f77df8dc996e70d

- Diff : `pilotage/fiches/L00-T85.md` seul (38 lignes), `statut: a_faire`. Même texte que la fiche de #1061, au statut près.
- `node outils/gardes/fiches.mjs` : vert. CI : gardes, tests, lint, types, e2e, gitleaks, stryker verts ; `licences` annulé ; `verifier` encore en file après plus d’une heure d’attente (non lancé).
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL.

Remarque (non bloquante) : la fiche dit « Fusionner après L00-T84 », mais `depend_de` ne cite que `L00-T81`. Ajouter `L00-T84` rendrait cet ordre vérifiable par les gardes. Le défaut de #1061 ci-dessous vient justement de cet ordre.

## PR #1061 : exécution L00-T85

VERDICT: A CORRIGER
SHA de tête : b7e18a36de08539111dd1a586be854110fe90484

### Contrôles relancés
- Fichiers : les 7 fichiers changés figurent dans `fichiers_autorises`. Taille : 162 lignes sur la branche (200 depuis main avec la fiche), plafond 220.
- `node outils/gardes/fiches.mjs` sur la branche seule : vert (921 fiches).
- `node scripts/verifier.mjs --gardes` : une seule étape rouge, `perimetre` (« fiche L00-T85 introuvable sur origin/main »). Elle est attendue tant que #1060 n'est pas fusionnée et ne vient pas de l'auteur.
- Critères `git grep` : `L09-T54` est bien cité dans L09-T44, et `L11-T38` dans L11-T47.
- Aucune fiche de L00-T84 n'est touchée (L09-T49, L09-T52, L09-T53, L10-T37).
- CI : tests, lint, types, e2e, gitleaks, stryker, licences verts ; `gardes` rouge sur la seule étape `perimetre` attendue (fiche pas encore sur main) ; `verifier` encore en file après plus d’une heure d’attente (non lancé).
- Aucun mot interdit, aucun prix, aucun secret, aucun nom réel, aucun octet NUL. Journal : 8 lignes, et il commence par `# Journal L00-T85`.

### Défaut bloquant
1. `pilotage/fiches/L09-T54.md:10` (`depend_de`) : la garde `fiches` devient rouge sur main dès que l'ordre de fusion annoncé (#1049, #1050, #1060, #1061) est suivi.
   - Je l'ai reproduit en fusionnant localement main + `lot-00/L00-T84` + `lot-00/L00-T85`. `node outils/gardes/fiches.mjs` sort en code 1 avec le message `garde:fiches : L09-T52 et L09-T54 (même lot) partagent packages/contrat/src/domaines/profil-champs.ts, packages/contrat/src/domaines/profil-champs-service.ts sans dépendance entre elles`.
   - La raison : L09-T52 (créée par #1050) modifie ces deux fichiers, et L09-T54 aussi.
   - La CI de la branche seule est verte parce que L09-T52 n'existe pas encore sur main.
   - Correction demandée : une fois #1050 fusionnée, faire `git merge origin/main` (sans rebase ni force-push), puis passer `depend_de` de L09-T54 à `["L09-T37", "L09-T49", "L09-T52"]`.
   - Vérifié par mutation sur la fusion locale : avec cette dépendance, `fiches.mjs` est vert (924 fiches) et `termine.mjs` aussi. Sans elle, la garde reste rouge.
   - Ajouter cette dépendance avant la fusion de #1050 ne marche pas : la garde répond « dépendance L09-T52 inconnue ».
   - Autre voie possible : retirer `profil-champs-service.ts` de L09-T54. Elle ne suffit pas, car `profil-champs.ts` reste partagé.

### Chaque blocage est-il vraiment levé ?
- **BLOQUE-L06-T38** (78 routes, 17 fichiers de test hors périmètre) : levé.
  - La fiche ne touche plus ni les domaines, ni `routes.ts`, ni `app.ts`, ni les tests existants.
  - `fichiers_autorises` ne contient plus que 4 fichiers neufs, plus la fiche et le journal.
  - Le cliquet tolère un domaine déjà préfixé. Aucune fiche de domaine n'a donc besoin de toucher `domaines-sans-prefixe.ts`.
  - Le `bloque_par` (accord de Will sur l'ordre des fusions) est **gardé**. Aucune décision de Will n'est levée.
- **BLOQUE-L09-T49** : hors de cette PR, à juste titre. L00-T84 (#1049, #1050) l'a découpée. Les 6 tests et `app.ts` cités par le blocage figurent bien dans la L09-T49 amendée par #1050.
- **BLOQUE-L11-T38** : levé. Les 10 fichiers de test cités par le blocage sont dans `fichiers_autorises`, en comptant les 4 du serveur, les 2 du contrat, les 3 suites et `commun-frais-actions.test.ts`.
  - La partie droits et `x-personne` passe à L11-T47. La taille 340 devient réaliste : environ 62 lignes de chemin à changer, sans réécrire les droits.
  - L11-T38 n'avait pas de `bloque_par` sur main, et L11-T47 n'en a pas.
- **BLOQUE-L09-T44** : levé. J'ai vérifié sur main :
  - le paramètre `cle` est `z.string()`, et `blocages` est `z.array(z.string())`. Ajouter des clés à `CLES_PROFIL` ne change donc pas `openapi.json`, qui n'a pas à figurer dans les fichiers autorisés ;
  - les codes sont présents dans `noyau/src/profil/perimetre.ts`, et les phrases dans `textes/src/ecrans/profil-codes.ts` ;
  - le faux serveur passe par le service partagé ;
  - aucune question n'est retirée de E38.

### Cloisonnement entre sociétés
Je n'ai trouvé aucune faille nouvelle :
- Sur le vrai serveur, session exigée (401) et société d'autrui en 404 au même corps qu'une route inconnue. Les chemins sans préfixe y donnent 404, et un test est nommé pour chaque cas (L11-T38, comme L09-T49).
- L'ancien chemin reste servi par le seul faux serveur, qui refuse de démarrer en production (`faux-serveur/src/navigateur.ts`).
- L'étape intermédiaire entre L11-T38 et L11-T47 (identité encore lue dans `x-personne`, mais derrière la session) est plus stricte qu'aujourd'hui, où aucune session n'est demandée.

### Remarques (non bloquantes)
- L06-T38 ne branche plus `securite/societe.ts` nulle part, et ni L11-T38 ni L09-T49 ne demandent de le faire. Aujourd'hui, aucune fiche ne s'engage donc à appliquer C04 (`societe_unique`) ni C02 (objet d'une autre société) sur une route réelle. Il en va de même pour le préfixe des domaines restants, dont les « fiches de suivi, une par lot » n'existent pas encore. Ce n'est pas une régression : main n'a ni préfixe ni session sur ces routes, et les frais fictifs n'ont pas de `societeId`. Je conseille de créer ces fiches de suivi avant que Will lève le `bloque_par` de L06-T38, pour que V3-PLA-001/002 et V3-SEC-007 restent suivies.
- `domaines-sans-prefixe.ts` : `sante` et `santeExploitation` resteront probablement sans préfixe pour toujours. Le commentaire « une fiche qui préfixe un domaine peut l'en retirer » pourrait distinguer ces exceptions permanentes.
- L09-T44 (E38) et L09-T54 écrivent sur `/profil/champs/{cle}` sans préfixe. Cela marche sur le faux serveur, mais donnera 404 sur le vrai serveur après L09-T49. C'est attendu, car les écrans sont renvoyés à une fiche de suivi, mais il faut le garder en tête.
