VERDICT: OK
SHA relu: 18f8ba457103ce87f293fdfc01edea5976300f88

# Avis relec92-g01-895 : PR 895, fiche L11-T44 (sensible, argent : qui a payé)

Relecture stricte du SHA ci-dessus contre `pilotage/fiches/L11-T44.md` (lue en entier).

## Vérifications
- Périmètre : 8 fichiers, tous dans `fichiers_autorises` ; aucun fichier de L11-T27, L11-T38, L11-T39 ou L11-T40 touché. La fiche passe seulement `statut: a_faire` à `fait`.
- Taille : 113 lignes ajoutées + 20 retirées = 133, sous le plafond de 320 ; aucune ligne « - - ».
- `conflitBanque(jeu, id): string | undefined` : fonction pure exportée de `frais-actions-service.ts`. Elle rejoue `determinerPayeur` avec le même filtre de lignes que `completer` (`lignesLibres` et `rejouer` sont factorisées et partagées), et n'écrit rien dans le jeu (test `JSON.stringify` + mutation M9).
- `ligneBanqueId: z.string().optional()` dans `FraisDetail` seulement (absent de `FraisResume`) ; `lire` le remplit par décomposition conditionnelle.
- Jeu unique : `const jeuFrais = genererFrais()` dans `creerRouteur` (un appel par `creerApp`), partagé par `routesFrais` et `routesFraisActions`. Pas au niveau du module : la mutation M1 est tuée. `tous` et `trajets` sont recalculés à chaque appel.
- `TRANSITION_INTERDITE` 409 : déclarée dans `completerFrais` et refusée avant toute écriture (`else refuser(...)` après les deux autres branches ; le cas `propose` vers `a_completer` de L11-T43 est inchangé).
- `openapi.json` : `node packages/contrat/scripts/openapi.mjs` (= `pnpm contrat:openapi`) relancé sur le SHA : aucun écart. Le générateur ne décrit que les entrées et les codes d'erreur ; le 409 de `PATCH /frais/{id}` existait déjà (`FRAIS_VALIDE`).
- Double paiement : par PATCH, il reste fermé par L11-T43, et le refus 409 empêche maintenant un 200 silencieux. Pour le cas « repassé en `propose` puis validé », la fiche demande seulement d'écrire `conflitBanque` ; l'appel est confié à L11-T27 (hors périmètre). Cela suit la voie choisie par la fiche.
- Les 8 tests nommés sont présents ; les tests de L11-T26 et L11-T43 n'ont pas changé (seuls l'import et la fonction utilitaire `nouvelle()` gagnent `conflitBanque`, `contrat` et `lire`).

## Exécution (Node 22, engine-strict désactivé)
- vitest `apps/serveur` + `packages/contrat` : 158 fichiers, 1148 tests réussis, 25 todo, aucun échec.
- `tsc --noEmit` dans apps/serveur et dans packages/contrat : code 0. `eslint apps/serveur packages/contrat` : code 0.
- `pnpm verifier` n'a pas été mené à terme ici (trop long, arrêté) : c'est la CI qui en fait foi.

## Mutations rejouées (10, toutes tuées, puis annulées)
- M1 jeu au niveau du module : `jeu-propre-a-chaque-application` rouge.
- M2 `tous` calculé à la création : `jeu-partage-frais-cree-lisible` rouge (mutation nommée par la fiche).
- M3 `trajets` calculés à la création : `jeu-partage-km-trajet-cree` rouge.
- M4 `ligneBanqueId` retiré de `lire` : `lire-ligne-banque-id` rouge.
- M5 suppression du refus `TRANSITION_INTERDITE` : `completer-perso-transition-interdite-409` rouge.
- M6 erreur retirée du contrat : les deux tests 409 rouges.
- M7 lignes déjà prises non retirées : `conflit-banque-ligne-deja-rattachee-ignoree` et `meme-ligne-banque-une-seule-fois` rouges.
- M8 frais `refuse` non exclu du retrait : `conflit-banque-ligne-deja-rattachee-ignoree` et `ligne-d-un-frais-refuse-redevient-utilisable` rouges.
- M9 `conflitBanque` écrit dans le jeu : `conflit-banque-ligne-societe-libre` rouge.
- M10 `conflitBanque` rend toujours `undefined` : les deux tests `conflit-banque-*` rouges.

## Remarques (non bloquantes)
1. `frais-actions-service.ts`, `conflitBanque` : la fenêtre et l'indicateur de relevé sont `FENETRE_ESSAI` et `RELEVE_ESSAI`, pas les options du service. Ce sont les mêmes valeurs dans l'application, mais un service créé avec un autre `fenetreJours` ne relirait pas la banque de la même façon. La signature `(jeu, id)` vient de la fiche ; à reprendre dans L11-T27 si celle-ci passe des options.
2. `conflitBanque` rend `undefined` pour un id inconnu : L11-T27 doit refuser `FRAIS_INCONNU` avant de l'appeler, sans traiter `undefined` comme « pas de conflit » sur un id absent.
3. Journal : 8 lignes, commence par `# Journal L11-T44`. Aucun des mots interdits, aucun prix, données fictives seulement (FRA-0xx, LIB-00x, PIE-09x).
