VERDICT: OK

PR #1127 (L05-T62), SHA de tête 0502d9d99364701b50fbe3bf951b20b0c4475c92 (branche lot-05/L05-T62). Relecture de la correction du 12/11/2026, après l'avis A CORRIGER au SHA b2801694cb17ac771442654ebf44605525890937.
PR SENSIBLE (fiche passée à `sensible: oui`, et la PR réécrit la fiche) : fusion par Will seul.

Défaut de l'avis précédent
1. recherche.ts:48, « tous les mots requis » non testé : CORRIGÉ. Le test `trouve-un-mot` ajoute m4 « Dupré a appelé » et vérifie `rechercher(A, 'dupré facture')` et `rechercher(A, 'facture dupré')` = ['m1'].
   Vérifié par mutation au SHA de tête : retirer `if (!autres.every((l) => l.has(id))) continue;` rend `trouve-un-mot` rouge (1 rouge, 4 verts) ; `every` changé en `some` : 3 rouges.

Contrôles refaits au SHA de tête
- Diff contre main : 4 fichiers, tous dans `fichiers_autorises`, 146 lignes ajoutées et 11 retirées (max 220). Le merge de main n'ajoute aucun autre fichier.
- Aucun SQL, aucune nouvelle dépendance ; L05-T56 est « fait » sur main ; `pilotage/ARRET` absent.
- CI au SHA 0502d9d9 : 9/9 verte (verifier, gardes, types, tests, lint, e2e, stryker, gitleaks, licences).
- vitest ciblé local : 5/5 verts (trouve-un-mot, accents-et-pluriels, autre-societe-invisible, requete-vide, temps-sur-mille-conversations).
- Autre mutation rouge : repli sur l'index d'une autre société (autre-societe-invisible rouge).
- Journal 7 lignes, commence par `# Journal L05-T62` ; aucun mot interdit, aucun prix, aucun secret, données fictives.

Points pour Will (inchangés, hors périmètre de l'auteur)
- La fiche est réécrite (blocage et migration 091 retirés, critères en mémoire, `sensible: oui`) au nom d'une « décision de Will du 12/11/2026 ». Main contient d'autres décisions du 12/11/2026 (L06-T46, L16-*), mais aucune trace de celle-ci pour L05-T62. À confirmer avant la fusion.
- La branche `bloque/L05-T62` existe encore (acc020fd).

Remarques (non bloquantes)
- recherche.ts:44 : retirer `if (listes.some((l) => l === undefined)) return [];` laisse 5 verts. Le code est juste, mais aucun test ne couvre une requête mêlant un mot connu et un mot absent (ex. `rechercher(A, 'facture inexistant')` doit rendre []). Sans cette ligne, une telle requête lèverait une erreur.
- Ôter le tri des listes par taille laisse 5 verts : mutation équivalente côté résultat (effet sur le temps seulement).
- Toujours valables : un ré-indexage d'un même id garde les anciens termes (sans effet, les messages sont immuables) ; « journaux » ne trouve pas « journal » (limite figée par le test) ; le seuil de 200 ms est à surveiller en CI.
