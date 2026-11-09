VERDICT: OK

PR 905 — pilotage/L06-T36-deblocage — fiche L06-T36 (sensible)
SHA relu : 661656060d92aa1afee4bbdacfae9146388b5d72

## Vérifications
- Diff : 1 fichier (`pilotage/fiches/L06-T36.md`), 2 ajouts, 1 suppression ; en-tête YAML identique à origin/main (statut, depend_de, fichiers_autorises, taille inchangés).
- Seule la ligne `bloque_par` est remplacée par « Débloquée par la décision de Will du 09/11/2026 … » et un point 4 est ajouté en fin de « À faire ».
- Blocage levé : D42 (serveur d'Axion IA, base séparée) et D29 (avancer sans la console) ; J3a rappelé comme déjà donné le 07/11/2026 avec ses quatre conditions (même formule que L02-T62/T63/T64 sur main). Aucune levée de J10, D43, Q*, contact prestataire ni vraies données.
- Point 4 : reprend la règle 13 de CONSIGNE-AUTEUR3.md (aucune adresse, machine, port, identifiant ni secret ; réglages lus à un seul endroit ; interface + faux service ; base et tables propres à la compta).
- Identité : aucune clé ni secret réel ; le point 2 impose une paire de clés générée dans le test (« jamais une clé réelle ») et le point 4 impose le faux service pour ce que la console fournit.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, aucun avertissement sur L06-T36.
- Aucun mot interdit, aucun prix, aucune adresse.

## Remarques (non bloquantes)
- `depend_de` contient L06-T28, encore `statut: a_faire` sur origin/main : l'auteur devra appliquer le point 12 (branche bloque/) tant qu'elle n'est pas faite.
- Le point 4 ne répète pas « aucun accès direct à la base ou aux fichiers de la console » de la règle 13 ; couvert par « interface et faux service ».
