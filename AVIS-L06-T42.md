VERDICT: A CORRIGER
PR #1129, SHA de tête bb15225c449c75d6cf44c135e3fbd4cd633c1b64

Fiche L06-T42 (sensible : isolation). Fusion par Will seul. Seconde relecture après correction.

## Contrôles passés
- 4 fichiers, tous dans `fichiers_autorises` ; 214 lignes ajoutées, 0 retirée (plafond 300). La fiche ne figure plus au diff. Aucune dépendance.
- CI verte au SHA de tête (9/9, dont `gardes`, `tests`, `verifier`). Tests ciblés verts en local (25).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## Suivi de l'avis précédent
- Défaut 2 : levé. `C23` est écrit et rougit si la garde ne lit plus les sociétés du corps (mutation `societesDuCorps: []` dans `securite/societe.ts` : C23 rouge). C08, C15, C16, C18, C21 sont signalés comme défaut de fiche (énoncé absent) : à trancher par Will.
- Défaut 3 : levé. L'expression exige `renvoi (L\d\d-T\d+|lot \d\d)` et la liste des cas sans cible est figée : tout nouveau renvoi vague rougit.
- Remarque `isolation.test.ts` : levée.
- Défaut 1 : NON levé (voir ci-dessous).

## Défauts
1. `apps/serveur/src/__tests__/isolation/generateur.ts:70-82` et `isolation.test.ts:32-44` (`T-ISO-1-reponses-http`) : les appels HTTP existent, mais le test ne dépend ni de la nature de l'objet ni du rôle. Preuves par mutation (25 tests restent verts) :
   - `OBJETS` mis à `'obj-zz'` pour les trois natures (autre société, autre client, inexistant identiques) : vert ;
   - en-tête de rôle fixé à `'lecture'` pour tous les appels : vert.
   Mesure au SHA de tête : 828 appels, dont 468 (57 %) s'arrêtent en 400 `BAD_REQUEST` « Input validation failed » avant tout traitement, et 18 en 401 ; les autres sont des 404 « inconnu » parce qu'aucun objet d'une autre société ni d'un autre client n'existe. La comparaison « même corps qu'un objet inexistant » est donc vraie par construction : une route sans garde qui livrerait l'objet d'une autre société ne ferait rien rougir. `un-200-sur-un-objet-etranger-rougit` teste le compteur sur des données écrites à la main, pas une route.
   Correction demandée, dans le périmètre :
   a. exiger qu'aucun appel ne s'arrête à la validation (aucun 400 `BAD_REQUEST`) : envoyer un identifiant au bon format et un corps minimal valide, ou exclure explicitement la route en la listant (liste figée, comme `ENONCE_ABSENT`) ;
   b. faire exister l'objet étranger : injecter un `Service` fictif (premier argument de `creerApp`) qui contient `obj-soc-2` (société `soc-2`) et `obj-cl-9` (société `soc-9`), puis vérifier le 404 au même corps que `obj-zz`. Si ce n'est pas faisable sans toucher au serveur, c'est un défaut de fiche : le dire, et ne pas présenter ce test comme une preuve d'isolation (renommer, ou marquer le critère non tenu).
   L'auteur a signalé que le serveur ne câble pas encore de garde société dans les routes : c'est un défaut de fiche à trancher par Will (fiche cible pour la garde), pas un défaut de l'auteur.

## Remarques
- `pilotage/journal/L06-T42.md:6` parle encore d'`it.todo`, retirés par le commit `bb15225c` : mettre le journal à jour.
- `cas.test.ts` (C03, C22) reste un test de forme sur le SQL ; à remplacer quand J3a fournira une base de test.
