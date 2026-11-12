VERDICT: OK

PR #1211 « L19-T22 Visite guidée de la première pièce dans E03 », seconde relecture au SHA de tête 67ba89c4af86d0eb7424948c33927e30b74a7095.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA 172e90f6302c02e2f4acb2c53a05c94f4656a7ce.

## Défaut précédent
1. Bouton « Terminer » non testé : LEVÉ. Le nouveau test `terminer-ferme-a-l-etape-trois` va à l'étape 3, clique sur Terminer, puis vérifie que le dialogue disparaît, que `sessionStorage['visite-guidee-ignoree']` vaut `'1'` et que le focus revient à `#stable`. Le bouton rendu inerte fait échouer ce test.
- La remarque sur `=== '1'` est aussi traitée : `valeur-de-session-autre-que-1-visite-affichee` fait échouer la mutation `!== null`.

## Régressions
- Seul le fichier de test a changé depuis la relecture précédente (deux tests ajoutés), plus une fusion de main. La mutation « Suivant inerte » fait échouer 3 tests.
- Fichiers : les 6 du diff sont dans `fichiers_autorises`. Taille : 216 lignes pour une limite de 240. Journal : 6 lignes.
- Tests ciblés : visite guidée 9 sur 9, E03 19 sur 19. Aucun texte en dur, aucun mot interdit, aucun prix, aucun secret.

## Remarques (non bloquantes, reprises de l'avis précédent)
- E03 n'a pas de test d'intégration de la visite (fichier non autorisé) : à prévoir dans une fiche ultérieure.
- La visite reste ouverte pendant la session après un premier dépôt ; l'écart est justifié dans la PR.

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner.
