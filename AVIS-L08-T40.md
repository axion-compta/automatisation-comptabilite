VERDICT: A CORRIGER

PR #1072, fiche L08-T40, SHA de tête relu : 48c104a52d4e2b4dc69922afe1272d9cec0cfc97

## Périmètre relu
Seul l'apport propre à la fiche a été relu (PR empilée sur #1051 L08-T39, elle-même sur #986, toutes deux ouvertes) : diff entre le commit de merge `cc0b4d14` et la tête. 5 fichiers, tous dans `fichiers_autorises`, 294 lignes ajoutées pour 300 au plus.

## Ce qui est en place
- Issues lues dans `ISSUES_PAR_DROIT`, motif et source obligatoires pour un refus et contrôlés avant l'envoi, case « autres personnes » décochée par défaut (accès et portabilité), `aEffacerExplication` affichée, envoi par `ecrire()`, 409 `DEJA_TRAITEE` traduite, focus rendu au bouton d'origine, cibles de 24 px, pas de `<main>`, motif jamais affiché dans la liste.
- Les 8 tests nommés sont présents et verts : 25/25 sur `apps/web/src/ecrans/e50` (Node 22). `garde:textes` vert. ESLint et `tsc -p apps/web` sans sortie.
- Mutations qui rougissent : contrôle du motif retiré ; case cochée par défaut ; focus non rendu.
- Aucun mot interdit, aucun prix, données fictives. Journal de 8 lignes commençant par `# Journal L08-T40`.

## Défauts à corriger
1. `apps/web/src/ecrans/e50/TraiterDemande.tsx:50` et `apps/web/src/ecrans/e50/DemandesPersonnes.tsx:88` : toute erreur sans code connu (réseau coupé, 500, 400, réponse invalide) affiche `t.erreurs.reglageAbsent` (« Le réglage nécessaire n'est pas renseigné : demandez-le à votre administrateur. »). C'est faux pour une panne réseau ou serveur, et pour un échec de « Enregistrer une demande reçue ». Correction : `fr.erreurs.reseau` (`packages/textes/src/fr.ts`) si `statut === 0`, sinon `fr.erreurs.generique` ; dans `EnregistrerDemande`, un code connu passe par la même table que le panneau. Tests à ajouter : réseau coupé et 500 donnent ces messages, et un 422 `MOTIF_MANQUANT` donne `t.erreurs.motifManquant` (la fiche exige la traduction du 422, aucun test ne la couvre).
2. Double clic sur Valider (Pièges de la fiche) non testé : en retirant à la fois `if (enCours.current) return;` (`TraiterDemande.tsx:37`) et `desactive={envoi}`, les 8 tests restent verts. Ajouter un test : réponse du `fetch` simulé retenue, deux clics sur Valider, un seul POST, puis un second essai garde la même clé tant que l'échec n'est pas un 4xx.
3. « Après succès, la liste est relue » (À faire, point 1) non testé : `DemandesPersonnes.tsx:112` sans `void relire()` laisse les tests verts. Ajouter un test : après un traitement réussi, un nouveau GET `/personnes/demandes` part et la ligne affiche le nouvel état.
4. « Bouton Traiter sur les demandes non finales » (À faire, point 2) non testé : `DemandesPersonnes.tsx:49` avec le filtre `FINALS` neutralisé laisse les tests verts. Ajouter un test : une demande `traitee` (et une `refusee`) n'a pas de bouton « Traiter », une demande `recue` en a un.

## CI
La CI GitHub n'a pas tourné (panne générale) : avis rendu sur relecture du code et tests lancés en local. Rouge attendu sur `garde:termine` et `garde:perimetre` tant que #1051 et #986 ne sont pas fusionnées : ce n'est pas un défaut de l'auteur.

## Remarques (non bloquantes)
- `DemandesPersonnes.tsx:19` : libellés en dur (`L`). `fr.actions.enregistrer` existe déjà pour « Enregistrer » ; les autres demandent d'élargir `e50-personnes.ts`, hors périmètre (défaut de fiche, à reprendre dans une fiche de textes).
- `clavier-seul` ouvre et valide, mais ne choisit pas d'issue au clavier comme le demande la fiche.
- `DemandesPersonnes.tsx:103` (venu de L08-T39) : même message `reglageAbsent` pour une erreur de lecture, à traiter avec #1051.
