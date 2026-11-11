VERDICT: A CORRIGER
SHA relu : 239bd1469d5e4d839a4398805c5ac5078bf3b02c

PR 991, fiche L03-T58 (sensible, IA). Deuxième relecture Opus du 11/11/2026, après la correction de l'avis précédent (SHA d4a41c0 → 239bd14).

Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 263 lignes (plafond 300). Les 10 tests nommés sont verts en local ; CI de ce SHA entièrement verte (verifier compris). Journal : 7 lignes. Mots interdits, prix, secrets : rien trouvé. Données fictives.

## Défaut bloquant de l'avis précédent : corrigé
- `explication.ts:87` : le code de case n'est plus retiré que comme jeton entier (`(?<![\p{L}\p{N}])` + code échappé + `(?![\p{L}\p{N}])`, drapeaux `gu`). Le cas `08` / `0808` est maintenant rejeté (`chiffre_hors_reference`) et testé, ainsi que le cas positif « La ligne 08 vient de … ».
- Sondes (codes `08` et `3.1`) : `0,08`, `08.5`, `08 000`, `331` rejetés ; « La ligne <code> vient de {{ref:e1.montant}} » accepté.
- Le code mort `if (tentative === undefined) break;` est remplacé par `for (let essai = 0; essai < ESSAIS_MAX; essai++)` ; mutants `ESSAIS_MAX` 1 et 3 et `<=` tués.

## Défauts bloquants (nouveaux, trouvés par mutation)
Stryker sur `explication.ts` : 89,54 % (16 survivants). Deux survivants touchent directement la règle « aucun montant ne vient du modèle » et doivent être tués :
1. `explication.ts:61` : `l.debit !== 0 ? l.debit : l.credit` → `false ? l.debit : l.credit` survit. Les deux écritures fictives du test sont au crédit (`debit: 0`) : si le montant d'une ligne au débit (TVA déductible, compte 445660 par exemple) était pris au crédit, la référence `{{ref:eN.montant}}` afficherait 0 sans qu'aucun test ne le voie. Correction : ajouter une écriture fictive au débit comme source d'une case, et vérifier `resultats.eN.montant.valeur` et `etapes[N].montant`.
2. `explication.ts:87` : l'échappement du code n'est pas testé. Mutation à la main `${c.code.replace(...)}` → `${c.code}` : 10/10 verts. Un code contenant un métacaractère, par exemple `3.1`, deviendrait le motif `3.1`, qui reconnaît `331` : « vaut 331 euros » passerait. Correction : ajouter à `chiffre-invente-rejete` une case de code `3.1` avec le texte `La ligne 3.1 vaut 331 euros, voir {{ref:e1.montant}}.`, attendu `chiffre_hors_reference`, et le cas positif `La ligne 3.1 vient de {{ref:e1.montant}}.`, attendu `ok: true` (sondé : le code actuel donne bien ces deux résultats).

## Remarques (non bloquantes)
- Mutants équivalents à la main : retrait du seul regard arrière ou du seul regard avant de `codeEntier` (une seule borne suffit déjà à empêcher qu'une suite de chiffres disparaisse en entier) ; garder les deux est très bien.
- `explication.ts:87`, drapeaux `'gu'` → `''` survit : un texte qui cite deux fois le code serait rejeté à tort (sens prudent : repli sans modèle). Un cas de test avec le code cité deux fois serait utile.
- Autres survivants : borne `texte.length <= longueurMax` (`<` survit : aucun test à la longueur exacte), `JETON` `\d+` → `\d` (aucun jeton `[PERSONNE_10]`), `e${i + 1}` → `e${i - 1}` dans l'entrée, `join('\n')` → `join('')`, messages d'erreur.
- Libellés pseudonymisés mais pas masqués sur les nombres (remarque de l'avis précédent) : toujours à trancher dans une fiche de suite.
