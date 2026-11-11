VERDICT: A CORRIGER
SHA relu : bc14243e71caadd7d5831033371f05c0b96b6ff1

# Avis de relecture PR 994 (L00-T73, fiche sensible : fusion par Will seul)

Fiche lue sur origin/main (de38efd). Relecture au SHA ci-dessus.

## Contrôles passés
- Fichiers : 21, tous dans `fichiers_autorises`. Taille : 245 + 1 = 246 lignes, sous 250.
- Ordre : `...handlersGardeAcces(abonnement)`, puis `...handlersModules(...)`, puis le socle ; vérifié par le test `ordre-garde-puis-modules-puis-socle`.
- Aucun couple (méthode, chemin) de module ne double le socle aujourd'hui (les quinze lots sont vides).
- `pnpm types` relancé : vert. Tests du faux serveur : 18 fichiers, 473 tests verts. CI verte.

## Défauts à corriger
1. Le test « socle réel » plante au premier handler de module. Le socle contient un handler à chemin `RegExp` (`domaines/tva.ts`, ligne 40). `infoDe` en fait `String(regex)`, puis `correspond` appelle `new URL(...)` sur cette chaîne. Essai jetable non commité : avec un seul `http.get(H + '/zzz-essai')` de module, `masquages(...)` lève `TypeError: Invalid URL`. Le test passe aujourd'hui seulement parce que `modules` est vide. Il faut traiter les chemins `RegExp` : tester le chemin d'essai du module contre la regex du socle, et dans l'autre sens refuser par défaut ou signaler.
2. Les handlers `http.all` du socle ne sont jamais comparés. Chez MSW, leur méthode n'est pas une chaîne « POST » ou « GET ». La condition `m.methode !== s.methode` les écarte donc tous, par exemple le repli `http.all(base + '/exercices/:exercice/juridique')` de `domaines/juridique.ts`. Essai jetable : un module `http.post(H + '/exercices/:exercice/juridique')` masque ce repli sans être signalé (résultat `[]`). La fiche demande qu'aucun handler de module ne masque le socle : il faut traiter `all`, et toute méthode non textuelle, comme correspondant à toutes les méthodes.
3. Ajouter un test pour chacun de ces deux cas : un module face à une route `RegExp` du socle, et un module face à un `http.all` du socle. Ils doivent échouer avec le code actuel.
