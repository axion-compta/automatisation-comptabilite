VERDICT: A CORRIGER
SHA: 0b13e10d24f748711bca5e045e6b3ce84f5d214d
PR: #1058

Fiche L04-T33, 3e relecture. Avis de référence : le plus récent, A CORRIGER au SHA e00e93c (commit c1329cd sur `avis/L04-T33`, repris en commentaire de la PR le 2026-11-11T22:58Z). Fiche lue sur `origin/main` ; aucune PR de pilotage ouverte ne l'amende (#1075, #1076, #1077 portent sur L16/L17).

## Suivi de l'ancien avis

1. Notation à crochets du faux serveur (`depot.ts`, `fichiersIndexes`) : CORRIGÉ POUR LES CAS DEMANDÉS, INCOMPLET (voir Défauts 1 et 2).
   - Les cas listés par l'ancien avis donnent maintenant le même statut sur les deux cibles : `fichiers[1]` seul, `fichiers[0]`+`fichiers[2]`, `fichiers[0]` deux fois, `fichiers[01]` seul, `fichiers[]`, `fichiers[0]`+`fichiers` (2 reçues des deux côtés).
   - Preuve par mutation : `depot.ts` remis à sa version e00e93c → le test commun `notation-a-crochets-memes-statuts-vrai-et-faux` rougit sur la cible faux (1 échec sur 21). Version 9af6c3f (`getAll('fichiers')`) : rougit aussi.
   - Mutations libres sur la nouvelle règle : retrait du refus « `[]` mêlé à des indices » → 1 test rouge ; `nus.length < 2` → `< 1` → 1 test rouge ; retrait du contrôle de contiguïté → 1 test rouge.
   - MAIS deux règles demandées par l'ancien avis ne sont pas tenues par les tests : la mutation « zéro de tête accepté » (`(0|[1-9]\d*)?` → `(\d+)?`, ligne 18) et la mutation « plus de limite 9999 » (retrait de `|| Number(m[1]) > 9999`, ligne 23) laissent les 21 tests verts. Les cas `fichiers[01]` seul et `fichiers[10000]` seul sont refusés de toute façon pour indices non contigus : ils ne testent pas la règle qu'ils visent.
2. Test commun joué sur les deux cibles : CORRIGÉ. `suite-depot.ts:37-49` (12 cas, `deposerParties`, même corps multipart pour les deux cibles).
3. Remarque journal ligne 6 : CORRIGÉE.

## Défauts

Sonde faite au SHA relu (fichier de test temporaire, supprimé ensuite), même corps multipart envoyé aux deux cibles, statut vrai / faux :

1. `packages/faux-serveur/src/domaines/depot.ts:18-19` : une partie au nom `fichiers[...]` invalide est ignorée (`continue`) au lieu de rendre la requête invalide.
   - `fichiers[0]` + `fichiers[00]` : 400 / 200 ;
   - `fichiers[0]` + `fichiers[01]` : 400 / 200.
   C'est la règle « indices sans zéro de tête, sinon 400 » de l'ancien avis, non tenue dès qu'un indice valide est présent.
   Correction demandée : toute partie dont le nom commence par `fichiers[` et qui ne correspond pas à `fichiers[<indice valide>]` ou `fichiers[]` renvoie null (400). Ajouter au tableau `cas` de `suite-depot.ts:39-43` les cas `['fichiers[0]', 'fichiers[01]']` → 400 et un cas qui tienne la limite 9999 (par exemple `['fichiers[0]', 'fichiers[10000]']` → 400, à vérifier sur le vrai), pour que les deux mutations citées plus haut rougissent.
2. `packages/faux-serveur/src/domaines/depot.ts:20` et `:30` : un `fichiers` nu placé AVANT des parties à crochets est gardé par le faux, écarté par le vrai.
   - `fichiers` puis `fichiers[0]` : vrai 200 avec 1 résultat (seule la partie `fichiers[0]`), faux 200 avec 2 résultats ;
   - `fichiers` puis `fichiers[]` : même écart (1 / 2).
   (Dans l'ordre inverse, `fichiers[0]` puis `fichiers`, les deux rendent 2 résultats.)
   Correction demandée : reproduire l'ordre d'arrivée du vrai serveur (une partie à crochets qui suit un `fichiers` nu le remplace) ; ajouter un cas commun qui compare le NOMBRE de résultats, pas seulement le statut.
3. `packages/faux-serveur/src/domaines/depot.ts:44` : le maximum de fichiers du contrat n'est pas appliqué. Contrat `packages/contrat/src/domaines/depot.ts:22` : `fichiers: z.array(z.file()).min(1).max(20)`.
   - 20 fichiers : 200 / 200 ;
   - 21 fichiers : 400 / 200.
   Un écran écrit contre le faux verra 21 fichiers acceptés par le faux et échouera sur le vrai.
   Correction demandée : valider la liste lue avec le schéma d'entrée du contrat (ou sa borne exportée), sans écrire 20 en dur ; ajouter un test commun « 21 fichiers → 400 » joué sur les deux cibles.

Budget : le diff fait 246 lignes sur 250. Les corrections doivent remplacer des lignes plutôt qu'en ajouter (par exemple en remplaçant la lecture manuelle par une validation au schéma du contrat). Si le plafond ne suffit pas, le signaler au pilotage plutôt que de dépasser. Tous les fichiers concernés sont dans `fichiers_autorises`.

## Remarques

- CI au SHA 0b13e10 : les 9 jobs terminés et verts (`verifier`, `gardes`, `licences`, `types`, `stryker`, `e2e`, `gitleaks`, `lint`, `tests`). L04-T31 et L04-T32 sont `fait` sur `main` : la garde `termine` passe.
- Tests ciblés `commun-depot.test.ts` : 21 verts (Node 22, `engine_strict=false`).
- Taille : 70 + 101 + 63 + 2/1 + 1/1 + 7 = 246 lignes ajoutées (max 250), aucune ligne « - - ». 6 fichiers, tous dans `fichiers_autorises`.
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL ; données fictives seulement (`exemple.fr`, `cle-fictive-*`). Pas d'alias d'import de `it`/`test`. Journal : 7 lignes, commence par `# Journal L04-T33`.
- Mineur : pour un 400, le vrai renvoie `data.issues` (codes zod), le faux non (`ctx.erreur` commun). Les statuts concordent ; à signaler seulement si un écran affiche ces détails.
- Mineur : la borne 9999 (`depot.ts:23`) est une limite technique d'oRPC, pas une valeur légale ; un commentaire citant sa source aiderait.
