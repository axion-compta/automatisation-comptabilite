VERDICT: OK
SHA relu : 2e4da2279572ff3c6054b94133e072a74c400e78

# Avis de relecture, PR 942 (fiche L02-T60), branche lot-02/L02-T60

## Contrôles faits
- Fichiers modifiés : les 7 font partie des `fichiers_autorises`. `.github/` et les gardes ne sont pas touchés. Aucune dépendance n'est ajoutée.
- Taille : 219 lignes ajoutées et 4 supprimées, soit 223 pour 260 au plus (aucune ligne « - - »).
- Tests : `a-justifier.test.tsx` passe en entier (7 sur 7). Les 6 tests nommés sont présents. Les cas limites exigés (1 facture au singulier, nom de fournisseur absent avec une clé `c:`, total à 0,01) sont dans `cas-limites-singulier-sans-nom-et-un-centime`.
- Mutations, toutes annulées ensuite :
  - un bouton de réponse qui envoie un `POST` → `reponses-desactivees-et-annoncees` rougit ;
  - nom du fournisseur toujours vide → 3 tests rougissent ;
  - filtre « voir les lignes » retiré → `voir-les-lignes-filtre-le-tableau` rougit ;
  - flèche gauche sans effet → `onglets-au-clavier` rougit ;
  - ordre de l'API inversé → `triees-par-impact` rougit.
- `node scripts/verifier.mjs` : toutes les étapes sont vertes, dont `garde:textes` et `garde:appels`. La seule étape rouge, `types`, l'était à cause du Node 22 du cloud (`ERR_PNPM_UNSUPPORTED_ENGINE`). Relancée avec `npm_config_engine_strict=false pnpm -r exec tsc --noEmit` : verte.
- Règle 13 (CONSIGNE-AUTEUR3) : lecture par `useLecture` et faux serveur seulement, aucune adresse, aucun secret. Réponses affichées désactivées (`aria-disabled`), aucun appel. Données fictives (Fictiva Telecom, Alpha, Beta, Gamma).
- Journal : 7 lignes, il commence par `# Journal L02-T60`. Aucun prix ni mot interdit. Textes au vouvoiement, aucun texte en dur dans le `.tsx`.

## Remarques (non bloquantes)
- `Ecran.tsx:115` : « Voir les lignes » filtre seulement la page déjà chargée (20 lignes, compte et état choisis, `decalage` en cours). Si les lignes de la demande sont sur une autre page ou un autre compte, le tableau filtré est vide. L'API (`QueryLignes`) n'a pas de filtre par identifiants et le journal le signale. À reprendre quand une route le permettra, ou en remettant `decalage` à 0 et les filtres à blanc avant d'appliquer `ids`.
- `AJustifier.tsx:13` : le nom affiché vient de `libelleNormalise` (clé `l:`). Il peut donc s'afficher sous sa forme normalisée (casse, accents) plutôt que sous le nom lisible du fournisseur.
