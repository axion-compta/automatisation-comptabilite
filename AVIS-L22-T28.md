VERDICT: A CORRIGER

PR n°1177, fiche L22-T28, tête relue : d30758e7fdf2ef8f813ee8bb24e9a3f94d827a30

Ce qui a été vérifié : 6 fichiers, tous dans fichiers_autorises ; diff de 199 lignes pour un maximum de 200 ; les 7 tests nommés passent ; aucun secret, aucun prix, aucun mot interdit ; e-mail fictif en @exemple.fr ; journal de 5 lignes. Le module passe bien par `ecrire` de api.ts et utilise les mêmes bornes que /usage (3 600 000 ms).

## Défauts

Mutations survivantes, faites à la main (les tests restent verts) :

1. `apps/web/src/gestes/mesure-carte.ts:21` : si on remplace `mesureActive = () => false` par `() => true`, les 7 tests passent encore. Le défaut « mesure désactivée », qui protège la vie privée, n'est donc pas testé. Correction : ajouter dans `mesure-desactivee-rien-emis` un appel `demarrerMesure('e17', horloge, { envoyer })` sans `mesureActive` et vérifier que rien n'est émis.
2. `apps/web/src/gestes/mesure-carte.ts:13` : si on remplace `{1,5}` par `{0,9}` dans la regex ECRAN, les tests passent encore. Les longueurs limites ne sont pas testées. Correction : tester qu'un code d'une lettre (`'e'`) et un code de 7 caractères (`'e123456'`) lèvent RangeError, et qu'un code de 6 caractères (`'e12345'`) est accepté.
3. `outils/banc/temps-humain.mjs:13` : le mutant `x.duree_ms < 0` → `x.duree_ms <= 0` survit. Une durée de 0 n'est pas testée. Correction : vérifier que `lireMesures('[{"duree_ms":0,"factureSimple":true}]')` est accepté.
4. `outils/banc/temps-humain.mjs:34` : le mutant `n < 0` → `n <= 0` survit (seuil de 0 non testé), et la suppression de `brut === '' ||` survit aussi (`--seuil-mediane-ms=` vide accepté comme 0). Correction : tester qu'un seuil `=0` donne la sortie 0 et qu'un seuil vide donne une sortie différente de 0.

## Remarques (ne bloquent pas)
- L'envoi par défaut (`envoyerParDefaut` → `ecrire`) n'est jamais exécuté par un test. De plus, une erreur `ErreurEcriture` (réseau) fait échouer `resoudre()` : l'écran qui branchera ce module devra intercepter cette erreur, ou bien `resoudre` devra l'avaler (une mesure d'usage ne doit pas casser l'écran).
- Le job CI `verifier` était encore en file d'attente au moment de la relecture.
