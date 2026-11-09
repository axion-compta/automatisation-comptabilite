VERDICT: OK
PR: 913
Fiche: L05-T57
Branche: lot-05/L05-T57
SHA relu: 2cadf77041698252b8f09043ae855e19a26d0fb2

## Vérifications
- Fichiers modifiés : les 5 `fichiers_autorises`, rien d'autre. 263 lignes (max 300), aucune ligne binaire.
- Migration `apps/serveur/src/base/migrations/057-ia.sql` : 4 tables, ajout seul, `IF NOT EXISTS`. Ni DROP, ni RENAME, ni DELETE, ni déclencheur, ni GRANT. La migration n'est exécutée contre aucune base.
- Aucune colonne de texte d'entrée ou de sortie. Les colonnes de `appel_ia` sont comparées au schéma `AppelIa` du contrat. Les listes CHECK sont comparées aux constantes du noyau (issues, confiances, sources, préréglages, pôles).
- Deux préréglages et aucun nom de modèle dans le code. Aucune adresse ni aucun secret.
- Tests nommés présents : `aucune-colonne-de-texte`, `appel-ecrit-une-ligne`, `decision-liee-a-l-appel`, `retour-arriere-ligne-precedente`, `propriete-complete`, `migrer-deux-fois`. Ils couvrent les cas limites NaN, Infinity, non entier, négatif, vide et ordre inversé. Vitest : 7/7 verts.
- Mutations (chacune rougit au moins un test, puis annulée) :
  - contrôle `appel_inconnu` retiré ;
  - contrôle `ordre_inverse` retiré ;
  - validation Zod de l'appel retirée ;
  - colonne `texte` ajoutée à la migration.
- `tsc --noEmit` et eslint : verts. Gardes perimetre, migrations, textes, fictif, litteraux, portes, tests, termine, fiches : vertes.
- Journal : 7 lignes, titré `# Journal L05-T57`. Données fictives. Aucun prix (`cout_micro_centimes` vient du schéma existant de L05-T08 et ne contient aucune valeur), aucun mot interdit.

## Remarques (non bloquantes)
- Seules les colonnes de `appel_ia` sont comparées au contrat. Celles de `decision_ia` (`demandeur_sorte`, `demandeur_id`, `objet_type`, `objet_id`) ne sont pas comparées à `DecisionIa`. Ajouter ce contrôle quand l'adaptateur SQL arrivera.
- `motif varchar(200)` recopie `MOTIF_MAX_CAR` du contrat sans test qui relie les deux.
- `regler` compare les dates comme des chaînes (`l.le > le`) : ce n'est juste que si toutes les dates sont en UTC (`Z`).
- Le numéro 057 est inférieur à celui de 080, déjà sur main. Ce choix vient de la fiche ; l'ordre d'application sera à vérifier sur une base où 080 est déjà passée.
