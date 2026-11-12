VERDICT: OK

PR #1181, tête relue : 127585721b9ee54ae4a0b464acd039b821796213

Vérifié : 4 fichiers, tous dans `fichiers_autorises` ; 101 lignes (max 160) ; les 3 tests nommés et le test de ligne invalide sont verts ; liste vide (EI) donne l'état `vide` de `construireBloc` sans `donnees` ; aucun nouvel état ; noms fictifs ; aucun mot interdit, secret ni prix ; journal de 7 lignes. CI verte (verifier en attente).
Mutations tuées : garde de liste vide retirée, `croiserCompteCourant` sur une partie des lignes, mouvements filtrés, un seul associé gardé.

## Remarques (non bloquantes)
- Deux associés de même `id` ne sont pas refusés ; à traiter à la source si besoin.
- Le test `sas-deux-associes-deux-soldes` ne vérifie pas `debiteur` au solde exactement 0 (déjà couvert par les tests de `croiserCompteCourant`).
- Fiche sensible : fusion par Will seul.
