VERDICT: OK
b9734788e44973e68cc1e152fe62e6b78694cdbf

PR #1072, fiche L08-T40, SHA de tête relu : b9734788e44973e68cc1e152fe62e6b78694cdbf
Troisième relecture, après l'avis A CORRIGER du SHA d6d59b35 (taille 354 > 300). Fiche lue sur origin/main. Seul l'apport propre à la fiche est relu : diff contre la tête de #1051 (`584fdddb`), qui est bien ancêtre de cette tête.

## Défaut de l'avis précédent : corrigé
1. Taille : **corrigé**. Lignes propres à la fiche (ajouts + retraits) : `DemandesPersonnes.tsx` 59+6, `TraiterDemande.tsx` 70, `traiter-demande.test.tsx` 155, fiche 2, journal 8. Total **300 pour une limite de 300**.
   - Les 13 tests ont les mêmes noms qu'avant. Les 2 `expect` en moins viennent de la factorisation `refusIncomplet()` : les deux tests de refus gardent chacun leurs 2 assertions (message + aucun envoi).
   - Le code de production n'a changé que de forme (lignes regroupées, `motif`/`source` dans un seul état, `CODES` compacté) ; aucun comportement modifié.
   - La reprise de #1051 apporte aussi le message d'erreur de lecture selon le statut (503 → `reglageAbsent`, sinon `e50.etats.erreur`).

## Vérifications au SHA de tête (Node 22)
- vitest `apps/web/src/ecrans/e50` : 32/32. ESLint et `tsc -p apps/web` ne sortent rien. Fusion avec main sans conflit.
- Mutations (toutes rougissent, puis annulées) :
  - garde `enCours` et `desactive={envoi}` retirés → `double-clic-un-seul-envoi-meme-cle` ;
  - message réseau remplacé par le générique → `erreurs-reseau-serveur-et-422-traduites` et `enregistrer-en-echec-message-reseau` ;
  - `MOTIF_MANQUANT` retiré de `CODES` → test du 422 ;
  - contrôle motif/source avant envoi neutralisé → les deux tests `refus-sans-*-bloque-avant-envoi` ;
  - `inclure_autres_personnes` forcé à vrai → `autres-personnes-decochee-par-defaut` ;
  - `void relire()` retiré → `liste-relue-apres-succes` ;
  - filtre `FINALS` neutralisé → `bouton-traiter-seulement-sur-demandes-non-finales`.
- Fichiers propres : 5, tous dans `fichiers_autorises`. Journal : 8 lignes, commence par `# Journal L08-T40`.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## CI au SHA de tête
- `tests`, `e2e`, `lint`, `types`, `gitleaks`, `licences`, `stryker` : verts (l'e2e est revenu au vert grâce à la correction reprise de #986).
- `gardes` rouge (`garde:termine`, `garde:perimetre`) : fichiers de L08-T39 et L08-T37 (#1051 et #986, encore ouvertes). Ce n'est pas un défaut de l'auteur ; la garde passera après fusion des PR amont puis `git merge origin/main`. `verifier` est rouge pour cette seule raison.

## Remarques (non bloquantes)
- La taille est exactement au plafond : toute retouche future de ces fichiers dans cette fiche le dépassera.
- Plusieurs lignes JSX très longues (`TraiterDemande.tsx`, `DemandesPersonnes.tsx`) après le regroupement : lisibilité moindre, sans effet sur le comportement.
- Reprises des avis précédents : libellés en dur dans `DemandesPersonnes.tsx` ; `clavier-seul` ne choisit pas d'issue au clavier.
