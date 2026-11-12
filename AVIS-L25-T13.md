VERDICT: OK

PR #1166 (L25-T13), seconde relecture Opus du 12/11/2026 (consigne LOT5, section R). Fiche sensible : fusion par Will seul.
SHA de tête relu : bc40dad82fdc3ba5adc708eef49db7731df4e7c4

## Défauts de l'avis précédent (tête 5c9d640d) : levés, vérifiés par mutation
1. `auteurId`, `objetType` et `objetId` vides ou absents → `forme_invalide`, une assertion par champ. Retirer chaque `!texte(...)` fait rougir un test.
2. Copie à l'ajout : retirer `structuredClone` dans `ajouter` fait rougir le test (objet `avant` modifié après l'ajout, y compris en profondeur).

## Non-régression
- Diff : 6 fichiers, tous dans fichiers_autorises ; 224 lignes pour 260 permises. Journal : 7 lignes.
- 8/8 tests verts. Borne `t >= min` mutée en `>` : tuée. `garde:perimetre` verte en CI.
- Aucun mot interdit, aucun secret, aucun prix ; données fictives.

## Remarques (non bloquantes)
- `texte()` accepte une chaîne faite d'espaces (`'   '`) ; à durcir avec `trim()` dans une fiche suivante si besoin.
- CI : `gardes` rouge pour `garde:portes` (« lot back-end de l'écran e09 sans porte maquette validée », pilotage/portes/e09.json). La porte E09 relève de Will : pas un défaut de l'auteur.
- CI : `tests`/`verifier` rouges pour le seul test `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`, rouge aussi sur origin/main : pas un défaut de l'auteur.
