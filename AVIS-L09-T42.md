VERDICT: OK

PR #1054 — L09-T42 — SHA de tête relu : 6177f982483d53de2ff6797b056741d74fade5c0
Non sensible (fiche `sensible: non`, diff hors chemins sensibles).

## Signalement (pas un défaut de l'auteur)
- Job `gardes` (et `verifier`) rouge pour une seule cause : `garde:termine` — « L09-T42 : fait alors que L09-T37 ne l'est pas ». L09-T37 est à `statut: a_faire` sur main alors que son code est fusionné (PR #1035) ; la correction relève de la fiche de statut L09-T37, pas de cette PR. À refaire passer la CI quand L09-T37 sera « fait ».

## Vérifications
- Fichiers : 6, tous dans `fichiers_autorises`. Taille : 297 lignes ≤ 300. `api.ts` non modifié ; aucune seconde fonction d'écriture (seul `ecrire()` est utilisé).
- Les 8 tests nommés présents et verts (16/16 sur `src/ecrans/e45`). `garde:textes` vert, `garde:appels` vert, `garde:perimetre` vert en local.
- Date d'effet : `2026-02-30`, vide, `2026-13-01`, `01/08/2026` refusées avant envoi ; valeur vide refusée.
- Mutations (toutes détectées) : garde anti double envoi retirée ; contrôle aller-retour de la date retiré (`2026-02-30` passerait) ; focus sur l'alerte retiré ; clé d'idempotence d'aperçu non renouvelée (APERCU_PERIME) ; invalidation de `/profil` après confirmation retirée.
- Aucun mot interdit, prix, secret ni nom réel. Journal : 6 lignes, commence par `# Journal L09-T42`.

## Remarques (non bloquantes)
- apps/web/src/ecrans/e45/Modification.tsx:18-21 : la fiche demande `PERIODE_DEPOSEE` par `phraseDeCode` ; `profil-codes.ts` n'a pas de famille pour ce code et n'est pas dans les fichiers autorisés, d'où une table de phrases dans `e45.ts` (écart noté au journal). Défaut de fiche : à rattacher à `profil-codes.ts` dans une fiche ultérieure.
- Modification.tsx:36 : deux erreurs identiques successives (même texte) ne redonnent pas le focus, l'effet ne dépendant que du texte. Mineur.
