VERDICT: OK
SHA relu : b98968c3c90ddf6516da716d74ba8f4e0aa4b8ca
PR : #858, fiche L13-T53 (sensible), relecture stricte après correction de l'avis A CORRIGER sur 535b567b2a35fe3d11c45cfdb60e462443a6494b

## Suivi de l'ancien avis
- Défaut bloquant 1 (point 6 « inscription au `Planificateur` ») : corrigé. `inscrireVerificationExercice(planificateur, rythme, preparer)` dans `verifier-exercice-clos.ts` appelle `planificateur.inscrire({ nom: 'verifier-exercice-clos', rythme, executer })` avec le motif `annuelle` et le `Passage` fourni par le planificateur. Test `inscription-au-planificateur` avec `creerFauxPlanificateur`. Mutations : appel à `inscrire` retiré, le test rougit ; motif `annuelle` changé en `a_la_demande`, le test rougit. Le journal ne classe plus l'inscription en hors périmètre.
- Remarque copie défensive de `lister` : traitée. Test `lister-rend-des-copies` ; mutation `structuredClone` retiré de `lister` : le test rougit.
- Remarque déclencheur `avant_export` : traitée dans le code (`motif === 'avant_export' ? 'avant_export' : 'a_la_demande'`), mais sans test (voir Remarques).

## Vérifications faites
- Fusion de main : les deux fusions (c56bc8e, d516e75) n'apportent au diff que les 5 fichiers de la fiche. Le commit de compactage b98968c ne change que la mise en forme et ajoute une ligne de journal, sans retirer de test. Main a avancé de 2 commits depuis (#890, #897) : fusion locale sans conflit, aucun fichier commun.
- Périmètre : 5 fichiers, tous dans `fichiers_autorises`. Taille : 287 ajouts, 1 suppression (288 ≤ 290), aucune ligne « - - ».
- Tests sur la tête fusionnée localement avec main : `verifier-exercice-clos.test.ts` : 12 tests verts (les 9 tests nommés, plus `doublon-refuse`, `lister-rend-des-copies` et `inscription-au-planificateur`). `node scripts/verifier.mjs` (avec `npm_config_engine_strict=false`, car le cloud a Node 22) : sortie 0, gardes vertes, 714 fichiers de test.
- Mutations rejouées puis annulées (arbre propre ensuite) :
  - refus `ligne_validee` retiré : `mot75-2-update-refuse` rougit (critère 2) ;
  - résultat de CC-PM07 forcé à `intact` : `mot75-3-alteration-detectee` et `alteration-a-totaux-egaux` rougissent (critère 3) ;
  - `absent` remplacé par un retour silencieux : `autre-societe-absent` rougit ;
  - alerte limitée à `altere` : `instantane-absent-jamais-intact` rougit.
- Inaltérabilité : `PortEcritures` n'a ni suppression ni purge (aucun DELETE ou TRUNCATE possible par le port). `ajouter` refuse le doublon, donc une écriture validée ne peut pas être écrasée par `ajouter`. `modifier` refuse toute écriture stockée au statut `valide`, même un drapeau (`contrePassee`, `motif`). La clé est (société, id) et l'exercice stocké est conservé, donc pas de déplacement d'une écriture vers une autre société ou un autre exercice. Aucune méthode de contournement dans le code : seul le test, qui garde la `Map`, écrit « hors déclencheur ». La relecture ne modifie rien (`jamais-de-reparation`). Le déclencheur SQL réel et les rôles de base sont hors périmètre de la fiche (D29).
- Aucun import de `apps/serveur/src/ia` ni d'un client réseau (critère 4). `verifier-exercice-clos` est déjà dans `TACHES_PLANIFIEES` sur main.
- Aucun secret, IBAN, prix, mot interdit ni octet NUL. SIREN fictifs de la fiche. Journal : 8 lignes, commence par « # Journal L13-T53 », cite D42, J3a et la décision du 07/11/2026. La fiche passe à `statut: fait`.

## Remarques (non bloquantes)
- `apps/serveur/src/taches/verifier-exercice-clos.ts:37` : aucun test ne vérifie le déclencheur `avant_export` transmis au moteur. Le remplacer par `'a_la_demande'` laisse les 12 tests verts. Seule la trace interne du moteur est concernée : ni le statut ni l'export ne changent.
- `apps/serveur/src/persistance/ecritures-figees.ts:28` : la copie défensive faite dans `ajouter` n'est pas testée. Retirer `structuredClone` laisse les tests verts. Un appelant qui garde l'objet passé à `ajouter` pourrait alors modifier en mémoire une écriture validée. Le risque se limite à la simulation en mémoire. Une assertion suffirait dans une fiche de suite : modifier l'objet passé à `ajouter` ne change pas `lister`.
