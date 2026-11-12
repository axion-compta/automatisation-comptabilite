VERDICT: OK
SHA: 1ae8cd7cd2f8961d4c9842d0d1939137ec7bbb05
PR: #1042

# Avis PR 1042 (L15-T05, sortie du lot 15) : quatrième relecture

Relu au SHA de tête ci-dessus (vérifié par `git fetch` : origin/lot-15/L15-T05 = 1ae8cd7). Fiche lue sur origin/main (8778e7a) ; aucune PR de pilotage ouverte (#1075, #1076, #1077) ne touche une fiche L15 : la fiche de main s'applique. La branche contient main à jour (merge-base = 8778e7a). Aucun fichier `pilotage/ARRET` sur main. Référence : avis A CORRIGER du SHA 3b62f41 (commit a65c1dd sur avis/L15-T05, commentaire du 11/11/2026 22:58 UTC).

## Suivi de l'ancien avis
1. `REPRENDRE.md:158`, ligne T63 donnée comme « PR #1047 ouverte » : CORRIGÉ. La ligne dit maintenant « code fusionné (PR #1047), fiche encore `statut: a_faire` sur main (statut à passer à `fait`) ; point P2, aucun fournisseur d'e-mail choisi ; écrite contre une interface d'envoi et un faux ». Preuve : l'API donne #1047 fusionnée le 11/11/2026 20:38:37 UTC ; `pilotage/fiches/L15-T63.md` est toujours `statut: a_faire` sur 8778e7a ; le contexte de cette fiche cite bien D88 (aucun fournisseur d'e-mail choisi, interface d'envoi et faux).
2. Citer #1047 parmi les PR fusionnées (ligne 162) : CORRIGÉ (« #1022 (T65), #1032 (L00-T83), #1043 (T64) et #1047 (T63) sont fusionnées »). Preuve : les quatre PR ont un `merged_at` non nul (18:36, 19:14, 20:10, 20:38 UTC le 11/11/2026).
3. Compte de la ligne 155 à aligner si T63 passe à `fait` : SANS OBJET, toujours juste. Preuve : `git grep '^statut:'` sur les 70 fiches L15 de main donne 65 `fait` et 5 `a_faire` (T05, T62, T63, T67, T68). Aucun commit de main depuis f77e2dd ne touche `pilotage/fiches/L15-*` ni `REPRENDRE.md`, donc la mention « motifs relus sur main (f77e2dd) » reste exacte.
Pas de test (fiche `tests_requis: non`, aucun code) : la mutation n'a pas d'objet ; chaque affirmation a été confrontée aux en-têtes de fiches et à l'API.

## Défauts
Aucun.

## Contrôles refaits
- Périmètre : 3 fichiers (`REPRENDRE.md`, `pilotage/fiches/L15-T05.md`, `pilotage/journal/L15-T05.md`), tous dans `fichiers_autorises`. `--numstat` : 27/0, 1/1, 8/0, soit 37 lignes pour un maximum de 120 ; aucune ligne « - - ».
- Bloc « Lot 15 » : 26 lignes après la ligne vide (30 au plus). Tableau : 41 + 26 + 19 + 25 = 111. La liste des cas S reprend mot pour mot le critère de L15-T60 ; tous restent « en attente », avec le motif demandé par la fiche (serveur en mémoire qui imite sans prouver).
- Motifs : T62 `depend_de` T59, T60, aucune PR ouverte (seule #968, fermée, de déblocage) ; T67 `bloque_par` Coque.tsx / coque.test.tsx de L06-T45 : exact ; T68 `depend_de` T60 à T66, seules T62 et T63 restent `a_faire` : exact.
- Mesures relancées (API de recherche, `is:pr is:merged "L15-" in:title`, fusion au plus tard le 11/11/2026 17:57 UTC) : 75 PR, 64 fiches L15 distinctes, première fusion le 07/11/2026 13:18 UTC (ouverture 13:17), dernière à 17:57:35 UTC. Médiane ouverture à fusion : 39,6 min (75 PR) ; 65,3 min (29 PR de fiches `sensible: oui`) ; 39,4 min (39 PR `sensible: non`) ; 7 PR titrées L00-T38/T39/T43/T45/T71 (créations ou amendements de fiches). Tout concorde.
- `pilotage/calibrage.csv` : une seule ligne (en-tête) sur main : exact. `git grep` de `X13b|R06b` dans `apps` et `packages` : aucun résultat ; seules les fiches L15-T05, T60 et T68 les citent : exact.
- Aucun mot interdit, aucun prix, aucun secret, aucune date de livraison. Journal : 8 lignes, commence par `# Journal L15-T05`, aucun octet NUL. `statut: fait` posé.
- `pnpm verifier` en local (Node 22, `npm_config_engine_strict=false`) : lint, tests (810 fichiers, 7613 tests verts), tests des gardes et toutes les gardes au vert ; seule l'étape `types` échoue, sur le refus de moteur de pnpm (Node 22 au lieu de 24), donc un effet de l'environnement et non du diff. L'étape `types` et `verifier` sont vertes en CI au même SHA.

## Remarques
- CI au SHA 1ae8cd7 : les 9 jobs verts (verifier, gardes, licences, gitleaks, e2e, lint, stryker, tests, types). PR `mergeable_state: clean`.
- Si #1047 se traduit par `statut: fait` sur la fiche L15-T63 avant la fusion de cette PR, le compte de la ligne 155 (66 avant, 67 avec) et « dépend de T62 et T63 » (lignes 162, 172-175) seront à réaligner. Non bloquant aujourd'hui.
- Corps de la PR : « Diff : 28 + 1 + 8 lignes » alors que le diff fait 27 + 1 + 8. Mineur.
- Les mesures s'arrêtent au 11/11/2026 17:57 UTC ; #1022, #1043 et #1047 fusionnées après n'y figurent pas. La fenêtre est écrite : non bloquant.
- PR non sensible au sens de la fiche, mais le diff touche `pilotage/` : d'après `pilotage/LISEZMOI.md`, la fusion revient à Will.
