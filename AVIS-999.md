VERDICT: OK
SHA relu : 5c19a3ae9812671ef04838e777dba6cd609d3354

# Avis de relecture PR 999 (L08-T43, sondes en service), seconde relecture. Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA de tête ci-dessus, après le correctif 5c19a3a qui suit l'avis au SHA 26d7a4a.

## Défauts bloquants de l'avis précédent (`apps/serveur/src/taches/__tests__/sondes-exploitation.test.ts`)
1. `regroupement-dans-l-heure` : **corrigé**. `alertes.regroupement_secondes` vaut `'3600'` (ligne 21) et le troisième passage a lieu à `apres(MAINTENANT, 60)` (lignes 92 et 93), une heure pile après le premier, comme le veut la fiche.
2. `r14-copie-en-retard-une-alerte` : **corrigé**. `sonde.copie_retard_max_secondes` vaut `'7200'` (ligne 18) : 2 h permises, 3 h de retard (sauvegarde à 09:00, passage à 12:00).
3. `reglage-absent-propage` : **corrigé**. `ErreurReglage` est importée (ligne 5) et `expect(erreur).toBeInstanceOf(ErreurReglage)` est ajouté (ligne 125).

## Mutations à la main (dans `sondes-exploitation.ts`, appliquées puis annulées)
- Fenêtre de regroupement lue sur `sonde.copie_retard_max_secondes` : `regroupement-dans-l-heure` échoue.
- Fenêtre de regroupement + 1 seconde : `regroupement-dans-l-heure` échoue (borne d'une heure pile tenue).
- Erreur de réglage habillée en `Error` portant le même `code` : `reglage-absent-propage` échoue.
- Seuil de copie remplacé par `sonde.dump_age_max_secondes * 2` : trois tests échouent, dont `r14-copie-en-retard-une-alerte`.

## Contrôles
- Fichiers : 4, tous dans `fichiers_autorises`. Taille : 298 + 1 lignes, sous 300. Aucune dépendance. Aucun octet NUL.
- Vitest : 11 tests verts sur 11. `tsc --noEmit -p apps/serveur` vert, eslint vert sur `apps/serveur/src/taches`. La CI GitHub au SHA relu est verte (9 contrôles).
- Aucun mot interdit, aucun prix ni secret, aucune valeur légale en dur dans le code. Données fictives. Journal : 5 lignes, il commence par `# Journal L08-T43`.
- Pas de régression : seul le fichier de test change depuis le SHA 26d7a4a, et aucune assertion n'a été retirée.

## Remarques
- `sonde.dump_age_max_secondes` et `sonde.copie_retard_max_secondes` valent tous deux `'7200'` dans le test : une confusion entre ces deux clés dans le code ne serait pas vue. Une valeur distincte pour le dump (sans changer le scénario de la fiche) lèverait ce doute.
- La remarque de l'avis précédent reste valable : `passerSondesHoraires` réécrit `echecsConsecutifs` avec la valeur lue avant les envois.
