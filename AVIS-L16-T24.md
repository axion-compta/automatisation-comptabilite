VERDICT: OK

PR #1113, fiche L16-T24, SHA de tête 98c4068e33d4cc9f328dbd4e4fa01f2dded22c0b

## Vérifications
- Fichiers : les 4 fichiers du diff sont dans `fichiers_autorises`. Taille : 150 lignes (147+, 3-) pour 200 au plus.
- Les 5 tests nommés sont présents et passent (vitest local, 5/5). CI verte au SHA de tête.
- `detecterChangements` : franchissement à la hausse et à la baisse, contrôle acquis et perdu, personne entrante ou sortante (part 0). Seuil fourni par l'appelant, borné entre 0 et 10000 points de base, entier sûr (NaN et non entiers refusés). Répartition vérifiée par `verifierRepartition` (parts invalides, doublons, somme différente de 100 %).
- `rappelMiseAJour` : identifiants seulement, `envoi: 'aucun'`, `aVerifier` tant que le seuil n'est pas confirmé, `null` sans changement. Aucun port d'envoi, aucune adresse, aucun texte libre.
- Aucune valeur légale en dur, aucun prix, aucun mot interdit, données fictives. Journal : 5 lignes, commence par `# Journal L16-T24`.
- Mutations : `>=` vers `>`, contrôle perdu ignoré, `aVerifier` forcé à faux, répartition non vérifiée, seuil non borné : toutes détectées.
- Ajout au hors périmètre (collecte des informations) : dans la fiche de la PR, qui est autorisée. Fiche sensible : fusion par Will seul.

## Remarques (non bloquantes)
- beneficiaires-effectifs.ts:41 : le filtre `nature === 'physique'` n'est couvert par aucun test (la mutation qui le retire survit). Ajouter un associé personne morale qui franchit le seuil sans produire de changement.
- beneficiaires-effectifs.ts:56 : la comparaison est « au moins le seuil ». La définition retenue (au moins ou strictement plus) est à faire confirmer avec le paramètre ; l'appelant doit fournir la borne en conséquence.
- beneficiaires-effectifs.ts:65 : `Date.parse` accepte `2026-02-31`. Une vérification aller-retour de la date (comme `verifierDate` dans remuneration.ts) serait plus stricte.
