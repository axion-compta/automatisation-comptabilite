VERDICT: OK
SHA: c88d12a3ee8e260a656c3b3748c5a05152401750
PR: #1071

Fiche L06-T48, SENSIBLE (purge, RGPD) : fusion par Will seul, après #1052. 4e relecture, après l'avis A CORRIGER au SHA 7089fca215a2259e8e215a32b755f043c4bfa856 (commit ea55b46 sur `avis/L06-T48`). Fiche lue sur origin/main. `pilotage/ARRET` absent.

## Suivi de l'avis précédent
1. `signalements.ts:45` : la décomposition `...demande` recopiait toute clé en trop. **CORRIGÉ.**
   - `signalements.ts:45-46` recopie de nouveau les champs un par un : `societeId`, `personneId`, `nature`, `correlationId`, plus `signalementId`, `etat` et `creeLe`.
   - Le test `erreur-et-signalement-meme-correlation` (`signalements.test.ts:46-53`) envoie une demande avec la clé en trop `ecritureId: 'ecr-1'`. Il vérifie que les clés de la ligne stockée sont exactement les 7 attendues.
   - Mutation « `...demande` remis devant les champs » : ce test rougit (1 échec sur 11).
   - Mutation « clé `ecritureId` ajoutée à l'objet » : il rougit aussi.
   - Les deux mutations ont été annulées.

## Contrôles
- `signalements.test.ts` et `migration-securite.test.ts` : 2 fichiers, 28 tests verts (Node 22, `engine_strict=false`). `tsc --noEmit` dans `apps/serveur` passe sans message.
- Fichiers propres à la fiche : 4, tous dans `fichiers_autorises` : `signalements.ts` 98, test 134, fiche 1/1, journal 8. Total 242 lignes sur 250.
- La tête de #1052 (93eed593) est contenue dans cette branche.
- Aucune durée en dur, aucun prix, aucun secret, aucun mot interdit, aucun octet NUL. Données fictives.
- Journal : 8 lignes, commence par `# Journal L06-T48`.

## CI au SHA de tête
- `gardes`, et donc `verifier`, sont rouges pour la seule `garde:perimetre`. Reproduit en local : les 4 fichiers de L06-T39 sont hors liste et la taille fait 439 lignes, au-delà de 250.
- Tout vient de #1052, empilée et encore ouverte. Ce n'est pas un défaut de l'auteur. Après la fusion de #1052 puis une mise à niveau sur main, il reste 242 lignes.
- Les 7 autres jobs sont verts.

## Remarques (non bloquantes, reprises)
- Si `parametre.lire`, `alerter` ou `lister` lève une erreur pour une société, la purge s'arrête pour les sociétés suivantes.
- `societes` est figé à l'inscription. `dateEffet` est comparé comme du texte.
- Il n'y a pas d'interface pour les Demandes du portail (V3-SUP-010), ni de colonne `correlation_id` dans la table 092.
