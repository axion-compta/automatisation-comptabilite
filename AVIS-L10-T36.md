VERDICT: OK

Fiche : L10-T36 (exigence V3-VEN-040), PR #1063, branche lot-10/L10-T36.
SHA de tête relu : 29321927e0d98ce8322a79b99e9983a763fe50bb

## Contrôles
- Périmètre : 6 fichiers, tous dans `fichiers_autorises` ; 151 lignes sur 200 (`garde:perimetre` vert en local).
- Dépendances L10-T34 et L10-T35 à `statut: fait` sur main.
- Handlers `GET /ventes/indicateurs` (400 via `QueryIndicateurs` du contrat) et `GET /ventes/series` sur le service de L10-T35, même service que le vrai serveur.
- Registre du lot 10 : routes fixes avant `GET /ventes/:id`.
- Suite commune jouée sur le vrai serveur et sur le faux, plus un test de comparaison des réponses : 16 tests verts en local.
- Cas couverts : indicateurs, propositions (provisoire), régime non confirmé, mois sans ventes, 400 (vide, 00, 13, mois sur un chiffre, texte, booléen invalide), séries (trous), `/ventes/series` ne rend pas 404 `VENTE_INCONNUE`.
- Aucune valeur légale en dur, aucun prix, aucun mot interdit, données fictives (hôte exemple.fr). Journal de 6 lignes commençant par `# Journal L10-T36`.
- Gardes locales vertes : perimetre, termine, fictif, litteraux, textes, tests ; `tsc --noEmit` du faux serveur propre.

## Mutations (toutes rougissent les tests, puis ont été annulées)
1. Ordre du registre inversé (`handlersVentes` avant les indicateurs) : 8 tests rouges.
2. 400 remplacé par une réponse 200 : 2 tests rouges.
3. `avecPropositions` ignoré : 2 tests rouges.
4. Régime forcé à confirmé : 2 tests rouges.

## Remarques (non bloquantes)
- Société vide : le faux serveur ne propose pas d'option de profil, ce cas est donc testé sur le service seulement, pas via la suite commune. C'est cohérent avec le vrai serveur, qui n'expose pas non plus ce profil.
- CI au SHA relu : tests, types, lint, e2e, gardes, gitleaks et stryker sont verts. Le job `licences` a été annulé après avoir dépassé la limite de 10 minutes, pendant son étape `upload-artifact` ; c'est un problème de runner, pas l'auteur. Le job `verifier` est resté en file. Il faut relancer la CI : la fusion attend `verifier` vert.
