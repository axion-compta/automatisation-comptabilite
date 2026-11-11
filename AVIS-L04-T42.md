VERDICT: OK

PR #1068, fiche L04-T42, SHA de tête relu : 5b99f15da74130c376c0e7daec29979cf7a465c9

## Périmètre relu
Seul l'apport propre à la fiche a été relu (PR empilée sur #1058 L04-T33, encore ouverte) : les 8 fichiers de `fichiers_autorises`, soit 280 lignes ajoutées pour 300 au plus. Aucun fichier hors liste dans cet apport.

## Vérifications
- `api.ts` : `deposer` ajoutée en fin de fichier, rien de réordonné, `lire()` inchangée ; lots de 20 ; clé = SHA-256 hexadécimal du contenu concaténé (`crypto.subtle`) ; réponse incomplète refusée.
- Route `e03`, `/documents/deposer`, groupe `autre`. Écran : `<h1>`, `ZoneDepot`, `EtatChargement` pendant l'envoi, résultats en `role="status"`, lien vers `/documents/piece?id=…`, date de « déjà reçue » formatée, mention de conservation des originaux. Aucun texte en dur dans le `.tsx`.
- Six phrases de refus dans `packages/textes/src/ecrans/e03.ts`.
- Les 8 tests nommés de la fiche sont présents, plus 4 cas limites (réponse incomplète, réseau coupé, route, une phrase par code). Tests ciblés 12/12 verts (Node 22). `garde:textes` vert. ESLint et `tsc -p apps/web` sans sortie.
- Mutations (toutes rougissent, puis annulées) : lot de 25 au lieu de 20 ; clé calculée sur le seul premier fichier ; `role="status"` retiré (4 échecs) ; branche « déjà reçue » neutralisée.
- Aucun mot interdit, aucun prix, données fictives. Journal de 7 lignes commençant par `# Journal L04-T42`.

## CI
La CI GitHub n'a pas tourné (panne générale) : avis rendu sur relecture du code et tests lancés en local. Rouge attendu sur `garde:termine` et `garde:perimetre` tant que #1058 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

## Remarques (non bloquantes)
- `apps/web/src/ecrans/e03/Ecran.tsx` : `role="status"` sur le `<ul>` remplace son rôle de liste, et les `<li>` n'ont plus de parent de liste (règle d'accessibilité « listitem »). Mieux : un `<div role="status">` qui contient le `<ul>`.
- `Ecran.tsx` : si un lot échoue après un lot accepté, les résultats déjà reçus disparaissent derrière le seul message d'erreur. Le renvoi reste sûr grâce à la clé d'idempotence, mais l'affichage perd l'information.
- `deposer.test.ts` : l'ordre des résultats n'est pas vérifié (les identifiants simulés repartent de `p-0` à chaque lot). Une fiche suivante pourrait l'ajouter.
- `r.recueLe.slice(0, 10)` prend la date UTC : un dépôt fait peu après minuit (heure de Paris) peut afficher la veille.
