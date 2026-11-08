VERDICT: OK
SHA relu : 8c228047ad3b256011e4f21c10a32408c8dd151b (branche pilotage/L12-T48-j3a, PR 872, fiche L12-T48, second passage après l'avis relec67-g01-872)

## Suite donnée à l'ancien avis
1. Défaut 1 (codes d'erreur non définis) : corrigé.
   - `contexte_invalide` (`:28`) : société vide ou faite d'espaces, levé par les quatre méthodes avant toute autre vérification.
   - `ligne_invalide` (`:29`) : champs texte vides (`versionParametres`, `horodatage`, `regleId`, `objetType`, `objetId`), `versionRegle` non entier ou inférieur à 1, `ecartCentimes` NaN, Infinity ou non entier, `valeur` numérique NaN ou Infinity. Une ligne invalide refuse tout le lot.
   - `inconnu` est retiré du type, avec la raison (`:27`).
   - Tests nommés ajoutés (`:31`) : `ligne-invalide` (NaN, Infinity, non entier, `versionRegle` 0, champ vide, journal resté vide), `contexte-invalide` (pour chaque méthode) et `lot-vide`. Le comportement du lot vide est défini (`:30`).
2. Défaut 2 (société absente du SQL) : corrigé. La table a 12 colonnes dont `societe` (`:32`), l'index porte sur (societe, objet_type, objet_id, horodatage), le test SQL vérifie les 12 colonnes et l'index (`:33`), et le Piège `:41` impose le filtre sur `societe`.
3. Défaut 3 (taille) : corrigé, `taille_max_lignes: 380` (`:14`).
- Remarques de l'ancien avis, toutes prises en compte : l'ordre suit `historiqueObjet`, qui fait foi (`:30`, horodatage puis `regleId`, vérifié dans `packages/noyau/src/controles/journal.ts:37`) ; l'objet est découpé en `objet_type` et `objet_id` ; `gravite` est renvoyée à une autre fiche (`:42`).

## Point à trancher : `valeur` décimale admise, `ecartCentimes` entier exigé
C'est acceptable. Dans `TraceControle` (`packages/noyau/src/controles/moteur.ts:51-52`), `valeur` est de type `string | number` : c'est la valeur observée par une règle, qui peut être un taux, un ratio ou un texte. Lui imposer un entier refuserait des traces légitimes. `ecartCentimes` est un montant : la règle du dépôt (montants en centimes entiers) s'applique, et l'exigence d'un entier est la bonne. Refuser NaN et Infinity pour `valeur` suffit, puisque ni l'un ni l'autre n'est représentable proprement en base ni en JSON. Mon ancien avis demandait aussi « non entier » pour `valeur` : je retire cette demande.

## Points vérifiés
- Diff : seul `pilotage/fiches/L12-T48.md` (21 ajouts, 10 retraits).
- `node outils/gardes/perimetre.mjs` en mode PR (branche pilotage, repli sur « Fiche: L12-T48 », fiche sensible non terminée) : vert, 1 fichier, 31 lignes.
- `node outils/gardes/fiches.mjs` : 887 fiches cohérentes. `node outils/gardes/termine.mjs` : vert. Les 15 champs d'en-tête sont présents, `sensible: oui` est maintenu et le statut reste `a_faire`.
- Les noms de champs cités existent bien dans `TraceControle` et `LigneJournal` : `horodatage`, `declencheur`, `regleId`, `versionRegle`, `objetType`, `objetId`, `resultat`, `valeur`, `ecartCentimes`, `versionParametres`.
- J3a est toujours respecté : aucune base, SQL écrit comme texte hors de `apps/serveur/src/base/migrations`, réel renvoyé à J10.
- Aucun mot interdit, aucun prix, aucun octet NUL, aucune donnée réelle. Aucune valeur légale en dur.

## Remarques (non bloquantes)
- `pilotage/fiches/L12-T48.md:27` : le type rendu par `historique` n'est pas précisé. L'adaptateur attribue un `id` (`nouvelId`) que `LigneJournal` ne porte pas. À préciser lors de la réalisation, par exemple `LigneJournal & { id: string }`, pour que l'`id` de `modifier` et `supprimer` ait un sens.
- `:29` : `declencheur` et `resultat` ne sont pas validés à l'exécution (le typage seul les borne). Un cas « déclencheur inconnu » dans `ligne-invalide` serait un plus.
- `:31` : ajouter dans un test un cas valide avec `valeur` décimale (par exemple 0.2), pour qu'un auteur ne la refuse pas par excès de zèle.
- `:14` : 380 lignes pour 5 fichiers et 11 tests nommés reste juste. Si la taille est dépassée, sortir le SQL et son test dans une fiche à part plutôt que d'élargir.
- Fiche sensible : fusion par Will seul.
