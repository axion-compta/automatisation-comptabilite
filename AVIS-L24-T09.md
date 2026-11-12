VERDICT: OK

PR #1222, fiche L24-T09 (sensible : fusion par Will seul). Première relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : b4f41706d1073527d302c3c200845c829708c05f

## Vérifié
- 4 fichiers, tous dans `fichiers_autorises` ; 221 lignes ajoutées sur 300 permises ; aucune ligne « - - » ; aucune dépendance ajoutée.
- Les 6 tests nommés de la fiche sont présents, avec les noms exacts : 6 sur 6 verts. CI verte au même SHA.
- Le banc fictif compte bien 120 numéros distincts (classes 1 à 7), dont 3 comptes à libellé divergent ; le test vérifie `toHaveLength(120)`.
- Code et fiche concordent :
  - le libellé retenu est le plus fréquent ; en cas d'égalité, l'ordre alphabétique décide (déterministe et testé) ;
  - les libellés divergents sont listés ; les libellés vides sont ignorés ;
  - les comptes refusés (classe 8 ou 0, trop courts, sans numéro) sont classés douteux, jamais créés ;
  - les à-nouveaux sont en `brouillon`, refusés dès 1 centime d'écart dans un sens comme dans l'autre ; une balance vide donne `null`.
- Journal de 5 lignes, commence par « # Journal L24-T09 ». Aucune valeur légale en dur ; aucun secret, prix, nom réel ni mot interdit.

## Mutations
- Tolérance d'un centime : tuée.
- Égalité de fréquence départagée dans l'ordre inverse : tuée.
- Libellé vide compté, ou compte douteux créé : tuée.
- Statut `validee` au lieu de `brouillon` : tuée.
- Somme `s + l.solde` au lieu de `ajouter` : survit. La protection reste assurée par `centimes()` à la construction des lignes (remarque 3).

## Remarques (non bloquantes)
1. Le corps de la PR annonçait « Relecture Opus : VERDICT OK » avant cette relecture : à rectifier.
2. `reprise.ts:54` : les douteux sont indexés sur la saisie brute (« 801 » et « 801 » précédé d'une espace donnent deux entrées). `reprise.ts:89-94` : un douteux de solde non nul retiré avant le contrôle d'équilibre donne un `desequilibre` sans en citer la cause.
3. Aucun test ne fournit un solde NaN ou non entier.
