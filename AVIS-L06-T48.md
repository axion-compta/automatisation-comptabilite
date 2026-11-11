VERDICT: A CORRIGER
a03de4b9554f0058b2beba9444d5529a8e1922b3

Fiche: L06-T48 (SENSIBLE) - PR #1071 - SHA de tête relu : a03de4b9554f0058b2beba9444d5529a8e1922b3
Seconde relecture, après l'avis A CORRIGER du SHA e564ac3e (relecteur Opus, lot 5 section R, 11/11/2026). La fiche est sensible : la fusion revient à Will seul.

## Défauts de l'avis précédent : les trois sont corrigés
1. Cas limites de `dureeJours` : **corrigé**.
   - `dureeEnVigueur` est testée avec NaN, Infinity et 1.5.
   - Un test `purgerSignalements` avec Infinity vérifie qu'il n'y a aucune purge, que l'alerte part et que la société suivante est purgée.
   - Mutations : retirer `Number.isInteger(d)` (`signalements.ts:73`), ou le remplacer par `!Number.isNaN(d)`, fait rougir 2 tests.
2. Champs vides : **corrigé**.
   - Un test par champ (`societeId`, `personneId`, `nature`), avec `''` et `'   '`.
   - Mutation : retirer `|| v.trim() === ''` (`signalements.ts:57`) fait rougir 3 tests.
3. `illisibles` : **corrigé**.
   - L'alerte `signalements_illisibles` (société et nombre) est envoyée par `PortAlerteExploitation` (`signalements.ts:98`), et un test la vérifie.
   - Mutation : retirer la ligne 98 fait rougir le test « date illisible ».

Au SHA de tête : vitest `signalements.test.ts` passe 11/11, et eslint ne signale rien. CI : tests, lint, types, e2e, gitleaks, licences et stryker sont verts.

## Défaut bloquant (nouveau, causé par les tests ajoutés)
1. La taille dépasse `taille_max_lignes`.
   - Lignes propres à la fiche : `signalements.ts` 113, `signalements.test.ts` 151, fiche 2, journal 8. Total : **274 lignes pour une limite de 250**.
   - La CI compte aujourd'hui 425 lignes, dont 151 de L06-T39 (#1052). Une fois #1052 fusionnée, `garde:perimetre` restera rouge (`taille 274 lignes > 250`).
   - Correction : retirer au moins 24 lignes sans supprimer aucun test ni aucune assertion. Pistes :
     - regrouper les scénarios « durée infinie » et « date illisible » dans un seul appel à `monde` ;
     - compacter `TEXTES_SIGNALEMENT` et les interfaces sur une ligne ;
     - raccourcir les commentaires d'en-tête redondants.
   - Sinon, Will peut relever le plafond par un amendement de la fiche, mais c'est sa décision seule.

## CI au SHA de tête
- `gardes` est rouge sur la seule étape `garde:perimetre`. Les fichiers hors liste viennent de L06-T39 (#1052, encore ouverte) : ce n'est pas un défaut de l'auteur. La taille, elle, en est un (voir plus haut).
- `garde:termine` est vert. `verifier` est rouge uniquement à cause de `gardes`.

## Autres contrôles
- Fichiers : 4, tous dans `fichiers_autorises`.
- Journal : 8 lignes, commence par « # Journal L06-T48 ».
- Aucune durée en dur, aucun prix, aucun secret, aucun mot interdit ; données fictives.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Si `parametre.lire`, `alerter` ou `lister` lève pour une société, la purge s'arrête pour les sociétés suivantes.
- `societes` est figé au moment de l'inscription : une société créée plus tard ne sera jamais purgée.
- `dateEffet` est comparé en texte.
- Les Demandes du portail (V3-SUP-010) n'ont pas d'interface. La table 092 n'a pas de colonne `correlation_id`.
