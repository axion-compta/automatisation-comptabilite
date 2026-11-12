VERDICT: A CORRIGER

PR #1127 (L05-T62), SHA de tête b2801694cb17ac771442654ebf44605525890937 (branche lot-05/L05-T62). Relecture du 12/11/2026. PR SENSIBLE (fiche passée à `sensible: oui`, et la PR réécrit la fiche) : fusion par Will seul.

Ce qui est bon
- Périmètre : 4 fichiers, tous dans les fichiers_autorises (de main comme de la fiche amendée) ; 142 lignes ajoutées (taille_max 220). Aucun fichier SQL. Dépendance L05-T56 « fait ». CI 9/9 verte sur ce SHA.
- Les 5 tests nommés passent. Un index par société, société obligatoire ; société inconnue ou vide : aucun résultat.
- Mutations rouges : index commun à toutes les sociétés (`autre-societe-invisible`) ; repli sur l'index d'une autre société ; retrait des accents ; retrait du pluriel ; tri inversé ; retrait de la limite.
- Journal : 7 lignes, commence par « # Journal L05-T62 ». Aucun mot interdit, aucun prix, données fictives.

Défaut
1. apps/serveur/src/chat/recherche.ts:48 : la règle « tous les mots de la requête requis » (documentée l. 9) n'est pas testée. Mutation qui retire `if (!autres.every((l) => l.has(id))) continue;` : 5 tests verts. Le seul cas multi-mot (`facture fournisseur dupré`) passe quand même, car la liste la plus courte (`dupre`) ne contient que m1. Sans ce contrôle, une requête de deux mots rendrait des messages qui n'en contiennent qu'un.
   Correction demandée : dans `trouve-un-mot`, une requête de deux mots dont le plus rare apparaît aussi dans un message sans l'autre mot. Exemple : m4 = « Dupré a appelé » ; `rechercher(A, 'dupré facture')` doit rendre ['m1'] seulement.

Points pour Will (sensible)
- La PR réécrit la fiche : blocage retiré, migration 091 retirée des fichiers_autorises, critère « sur une base de test » remplacé par des commandes en mémoire, `sensible: oui`. Elle s'appuie sur une « décision de Will du 12/11/2026 » qui n'est tracée nulle part sur main (la ligne `bloque_par` d'origine prévoyait bien ce choix d'une version en mémoire sans SQL). À confirmer par Will avant la fusion.
- La branche `bloque/L05-T62` existe encore sur origin.

Remarques (non bloquantes)
- `indexer` d'un même identifiant avec un autre texte laisse les anciens termes dans l'index. Sans effet aujourd'hui : le dépôt refuse les doublons et les messages ne sont pas modifiés.
- `accents-et-pluriels` fige le fait que « journaux » ne trouve pas « journal » (pluriel simple s/x seulement) : c'est une limite de la version en mémoire, à revoir avec l'index en base.
- `temps-sur-mille-conversations` mesure une seule requête avec un seuil de 200 ms : à surveiller en CI.
