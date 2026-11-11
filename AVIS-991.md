VERDICT: OK
SHA relu : 23425b3ce3ccd30ed38b97ec2f40cc8e6bf6858f

PR 991, fiche L03-T58 (sensible, IA). Troisième relecture Opus du 11/11/2026, après la correction de l'avis précédent (SHA 239bd14 → 23425b3).

Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 277 lignes (plafond 300). Le dernier commit ne touche que le fichier de test (+14 lignes) ; `explication.ts` est inchangé. 11 tests verts en local (les 10 nommés plus `montant-au-debit`) ; CI de ce SHA entièrement verte (verifier, tests, lint, types, gardes, stryker, gitleaks, e2e, licences). Journal : 7 lignes. Mots interdits, prix, secrets, octets NUL, alias de `it`/`test`, `.only`/`.skip` : rien trouvé. Données fictives.

## Défauts bloquants de l'avis précédent : corrigés
1. `explication.ts:61` (ligne au débit) : nouveau test `montant-au-debit`, écriture fictive au compte 445660 avec `debit: 4321`, `credit: 0`, qui vérifie `resultats.e1.montant.valeur` et `etapes[0].montant`. Mutations à la main `false ? l.debit : l.credit` et `l.credit` seul : tuées.
2. `explication.ts:87` (échappement du code) : cas `3.1` ajoutés à `chiffre-invente-rejete`, le négatif « La ligne 3.1 vaut 331 euros… » attendu `chiffre_hors_reference` et le positif « La ligne 3.1 vient de … » attendu `ok: true`. Mutation à la main `${c.code.replace(...)}` → `${c.code}` : tuée (échec à `explication.test.ts:83`, le cas 331).

## Régressions et autres mutations à la main
- Aucune régression : code de production inchangé, tests précédents conservés à l'identique.
- Tuées aussi : drapeaux `'gu'` → `'u'` (nouveau cas du code cité deux fois), borne `<=` → `<` (nouveaux cas à la longueur exacte et à la longueur moins un), `ESSAIS_MAX` 2 → 3, `s.source.type === 'ecriture'` → `true`.

## Remarques (non bloquantes)
- `JETON` `\d+` → `\d` survit encore (aucun jeton `[PERSONNE_10]` dans les tests) : sens prudent, un tel jeton serait seulement rejeté. Un cas avec dix personnes serait utile dans une fiche de suite.
- Libellés pseudonymisés mais pas masqués sur les nombres (remarque des avis précédents) : toujours à trancher dans une fiche de suite.
- Fiche sensible : fusion par Will seul.
