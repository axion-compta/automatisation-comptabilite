VERDICT: OK
584fdddb53c6a10c31dbcace759ab3f2ad959c3b

PR #1051, fiche L08-T39, SHA de tête relu : 584fdddb53c6a10c31dbcace759ab3f2ad959c3b
Seconde relecture, après l'avis A CORRIGER du SHA 00b847d6. Fiche lue sur origin/main. PR empilée sur #986 (L08-T37), encore ouverte.

## Défauts de l'avis précédent : les trois sont corrigés
1. Message d'erreur de lecture : **corrigé**.
   - `DemandesPersonnes.tsx:45` : `reglageAbsent` seulement si `ErreurLecture` de statut 503, sinon `e50.etats.erreur`.
   - `RecherchePersonne.tsx:32-33` : 422 → `tropCourt`, 503 → `reglageAbsent`, sinon `e50.etats.erreur` (réseau compris).
2. Tests de l'état d'erreur : **corrigé**. Deux tests ajoutés : `erreur-de-lecture-message-selon-le-statut` (500 et 503, aucune ligne affichée, message exclu vérifié) et `recherche-en-erreur-message-selon-le-statut`.
   - Mutation : message toujours `reglageAbsent` dans la liste → le premier rougit.
   - Mutation : branche `etat === 'erreur'` neutralisée → le premier rougit.
   - Mutation : recherche toujours `reglageAbsent`, puis jamais `reglageAbsent` → le second rougit dans les deux cas.
3. Mise à niveau : **corrigé**. `origin/main` et `origin/lot-08/L08-T37` fusionnés (sans rebase ni force-push). Les fichiers de L08-T37 de la PR sont identiques à la tête de #986. Le job `e2e` est maintenant vert.

## Vérifications au SHA de tête (Node 22)
- vitest `demandes-personnes.test.tsx` : 10/10. Fusion avec main sans conflit.
- Lignes propres à la fiche : 277 pour une limite de 300. Fichiers propres tous dans `fichiers_autorises`.
- Journal : 10 lignes, commence par `# Journal L08-T39`.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## CI au SHA de tête
- `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences`, `stryker` : verts.
- `gardes` rouge (`garde:termine` : L08-T37 pas « fait » ; `garde:perimetre` : fichiers de L08-T37 et taille 537). Dépendance #986 encore ouverte : ce n'est pas un défaut de l'auteur. `verifier` est rouge pour cette seule raison.

## Remarques (non bloquantes)
- Tout 503 donne `reglageAbsent`, quel que soit le code renvoyé ; un contrôle du code `REGLAGE_ABSENT` serait plus précis.
- Dans le test, l'import de `e50` est placé entre deux imports locaux (ordre des imports).
- Reprises de l'avis précédent : libellés des sources en dur (`RecherchePersonne.tsx`), phrase « Source : date à confirmer. », `EtatChargement libelle={t.titre}`, formulaire vide sans message.
