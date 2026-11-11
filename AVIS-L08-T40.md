VERDICT: A CORRIGER
d6d59b3555f5bc6365a0389f3e0b1b634b0ad0d5

PR #1072, fiche L08-T40, SHA de tête relu : d6d59b3555f5bc6365a0389f3e0b1b634b0ad0d5
Seconde relecture, après l'avis A CORRIGER du SHA 48c104a5 (relecteur Opus, lot 5 section R, 11/11/2026). Seul l'apport propre à la fiche est relu : diff contre `lot-08/L08-T39` (#1051) en `00b847d6`.

## Défauts de l'avis précédent : les quatre sont corrigés
1. Erreurs sans code connu : **corrigé**.
   - `messageErreur` (`TraiterDemande.tsx:20`) choisit dans cet ordre : texte du code connu, sinon `fr.erreurs.reseau` si `statut === 0`, sinon `fr.erreurs.generique`. Le panneau et « Enregistrer une demande reçue » l'utilisent tous les deux.
   - Mutation : revenir à `reglageAbsent` fait rougir `erreurs-reseau-serveur-et-422-traduites` et `enregistrer-en-echec-message-reseau`.
   - Mutation : retirer `MOTIF_MANQUANT` de `CODES` fait rougir le test du 422.
2. Double clic : **corrigé**.
   - Mutation : retirer `if (enCours.current) return;` et `desactive={envoi}` fait rougir `double-clic-un-seul-envoi-meme-cle`.
   - Mutation : renouveler la clé après un 500 fait aussi rougir ce test.
3. Liste relue après succès : **corrigé**.
   - Mutation : sans `void relire()` (`DemandesPersonnes.tsx:112`), `liste-relue-apres-succes` rougit.
4. Bouton Traiter seulement sur les demandes non finales : **corrigé**.
   - Mutation : sans le filtre `FINALS` (`DemandesPersonnes.tsx:49`), `bouton-traiter-seulement-sur-demandes-non-finales` rougit.

Au SHA de tête, avec Node 22 : vitest `apps/web/src/ecrans/e50` passe 30/30. ESLint et `tsc -p apps/web` ne sortent rien.

## Défaut bloquant (nouveau, causé par les tests demandés)
1. La taille dépasse `taille_max_lignes`.
   - Lignes propres à la fiche (ajouts plus retraits, comptées comme `garde:perimetre`) : `DemandesPersonnes.tsx` 67+5, `TraiterDemande.tsx` 101, `traiter-demande.test.tsx` 171, fiche 2, journal 8. Total : **354 lignes pour une limite de 300**.
   - Une fois #1051 et #986 fusionnées, `garde:perimetre` restera rouge pour cette raison.
   - Correction : retirer au moins 54 lignes sans supprimer aucun des 13 tests ni aucune assertion. Pistes :
     - factoriser `ouvrir()`, `valider()` et le montage répétés ;
     - écrire les cas d'erreur dans un tableau ;
     - compacter `CODES` et les styles.
   - Sinon, Will relève le plafond par un amendement de la fiche (le correcteur l'a déjà signalé comme « défaut de fiche »). C'est la décision de Will.

## CI au SHA de tête
- `gardes` est rouge sur `garde:termine` et `garde:perimetre`. Les fichiers hors liste viennent de L08-T39 et L08-T37 (#1051 et #986, encore ouvertes) : ce n'est pas un défaut de l'auteur. La taille, elle, en est un (voir plus haut).
- `e2e` est rouge : 11 échecs dans `accessibilite.e2e.ts` et `pannes.e2e.ts`. Ce sont **les mêmes 11 échecs** qu'à la tête de #1051 (`00b847d6`), alors que l'e2e de main est vert. La panne vient de la PR amont, pas de L08-T40, et se corrige dans #1051.
- `verifier` est rouge à cause de `gardes` et `e2e`.

## Autres contrôles
- Fichiers : 5, tous dans `fichiers_autorises`.
- Journal : 8 lignes, commence par `# Journal L08-T40`.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Libellés en dur dans `DemandesPersonnes.tsx:19`.
- `clavier-seul` ne choisit pas d'issue au clavier.
- Le message de lecture `reglageAbsent` vient de L08-T39.
