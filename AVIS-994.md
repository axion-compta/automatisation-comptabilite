VERDICT: OK
SHA relu : 672f3176c2eb8c347ed9966d263fb80a0ad90474

# Avis de relecture PR 994 (L00-T73), deuxième passage. Fiche sensible : fusion par Will seul

Fiche lue sur origin/main (de38efd). Relecture au SHA ci-dessus. L'avis précédent (bc14243) demandait trois corrections : elles sont faites.

## Corrections vérifiées
1. Chemins `RegExp` du socle : `infoDe` garde la `RegExp`. `correspond` ne passe à `new URL` qu'une chaîne, et la compare à la regex dans les deux sens. Deux `RegExp` face à face sont signalées par défaut. Essai de l'ancien avis rejoué (jetable, non commité) : un module `GET /zzz-essai` contre le socle réel ne plante plus et rend `[]`.
2. `http.all` du socle : une méthode non textuelle devient `*` et correspond à toutes les méthodes. Essai rejoué : un module `POST /exercices/:exercice/juridique` contre le socle réel est maintenant signalé.
3. Tests ajoutés : `un-module-face-a-une-route-regexp-du-socle-ne-plante-pas` et `un-module-face-a-un-http-all-du-socle-est-signale`.

## Mutations à la main (appliquées puis annulées)
- `http.all` traité comme la méthode `ALL` au lieu de `*` : le test `http-all` échoue.
- Une `RegExp` passée à `new URL` : le test `regexp` échoue.
- Le signalement par défaut de deux `RegExp` retiré : le test `regexp` échoue.
- La comparaison dans un seul sens : deux tests échouent (sens inverse et `regexp`).

## Contrôles
- Fichiers : 21, tous dans `fichiers_autorises`. Taille : 231 + 1 = 232 lignes, sous 250.
- Ordre garde, puis modules, puis socle : inchangé, test `ordre-garde-puis-modules-puis-socle` vert.
- `tsc --noEmit` lancé paquet par paquet : vert. `pnpm types` bute en local sur la version de Node du conteneur (22 au lieu de 24).
- Suite complète `vitest run` : 764 fichiers, 7185 tests verts. Faux serveur : 18 fichiers, 475 tests verts.
- Aucun prix, aucun mot interdit, données fictives. Journal : 9 lignes, il commence par `# Journal L00-T73`.

## Remarques
- Au moment de la relecture, la CI au SHA relu est encore en attente (`pending`) : il faut attendre qu'elle soit verte avant de fusionner.
- `correspond` remplace aussi `:\w+` dans une base qui aurait un port (`hote:8080`). Ce n'est pas le cas aujourd'hui (`http://exemple.fr`).
- Le journal ne cite pas encore la correction de l'avis. C'est mineur.
