VERDICT: A CORRIGER

PR #1209 (L25-T08), relue au SHA df2c0bc5a291fc46d98e5c09671488cf5cb7334a.

Vérifié : fichiers dans fichiers_autorises (4), 240 lignes <= 240 (à la limite), 7 tests nommés présents + 2 ajoutés, 9/9 verts, clé non extractible, nonce aléatoire, aucun mot interdit, aucun secret, aucun prix, données fictives. CI verte.
Mutations tuées : contrôle de version avant écriture, délai 1 999 ms, effacement du brouillon illisible, `annuler()` dans `effacer()`, clé par société, clé extractible, nonce fixe.

## Défaut
1. apps/web/src/socle/brouillon-local.ts:51 : mutation survivante. Supprimer `if (enCours.has(idCle)) return enCours.get(idCle)!;` laisse les 9 tests verts, y compris `deux-formulaires-une-seule-cle` : avec le stockage mémoire, les deux créations s'enchaînent et la Map `cles` garde une seule entrée de toute façon. Or sans cette ligne, deux formulaires de la même personne créent deux clés, la seconde écrase la première et le premier brouillon devient illisible puis effacé (vérifié avec un `lireCle` lent de 20 ms : 2 écritures de clé, `a.reprendre()` rend `null`).
   Correction : dans `deux-formulaires-une-seule-cle`, utiliser un stockage dont `lireCle` attend (par exemple un `setTimeout` de quelques ms avancé par les horloges simulées), compter les appels à `ecrireCle` (attendu : 1) et vérifier que les deux brouillons se reprennent. Le test doit rougir sans la ligne 51.

## Remarques (non bloquantes)
- brouillon-local.ts:82-86 : une erreur passagère de `lireCle` (stockage indisponible) est traitée comme un échec de déchiffrement : `reprendre()` efface alors un brouillon peut-être lisible. Mieux : n'effacer que si la clé est absente ou si `decrypt` échoue.
- Le chiffré n'est pas lié à son identifiant (pas de `additionalData`) : avec la même clé, le brouillon d'un formulaire recopié sous un autre identifiant se déchiffre. Passer `idBrouillon` en `additionalData` d'AES-GCM.
- La taille est exactement à 240 : toute correction devra compenser.
