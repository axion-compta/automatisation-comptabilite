VERDICT: OK

Fiche: L06-T44 (SENSIBLE) - PR #1070 - SHA de tête relu : 44d51fb896ab2d9c84b509a0b5807f337b1ddf29
Relu : seulement ce que la fiche ajoute (diff contre lot-06/L06-T39 / #1052, encore ouverte). Les fichiers de L06-T39 sont identiques à #1052.

CI : n'a pas tourné (tests GitHub en panne générale). Relecture du code et des tests, exécution locale :
- vitest `apps/serveur/src/__tests__/acces-expert.test.ts` : 8/8 verts ; eslint et tsc sans remarque sur les fichiers ajoutés.
- Mutations qui rougissent : cache sans limite de durée, événement d'échéance émis à chaque fois, avis sans mémoire, invitation réutilisable, accès d'une autre société retenu, borne d'une minute passée à `>`.
- `garde:termine` / `garde:perimetre` rouges attendus tant que #1052 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

Périmètre : 4 fichiers, tous dans fichiers_autorises ; 227 lignes (limite 250). Journal 5 lignes, commence par « # Journal L06-T44 ». Les 4 tests nommés sont présents ; T-ROL-3 (révoqué à t0, refusé à t0 + 45 s) et C13 (événement à l'échéance, une fois) couverts. Aucune durée en dur hors de la borne d'une minute de la spec ; aucun prix, secret ni mot interdit ; données fictives.

## Remarques (non bloquantes)
- `acces-expert.ts:43` : aucun test pour `cacheMs` / `preavisMs` à NaN, Infinity ou non entier ; la mutation qui retire `Number.isSafeInteger(cacheMs)` survit. Sans effet aujourd'hui (NaN coupe le cache, Infinity est refusé par la borne), mais à ajouter.
- T-ROL-3 tient pour un cache de 30 s ; un réglage entre 45 et 59,999 s reste permis et laisserait passer la requête à t0 + 45 s (révocation toujours en moins d'une minute).
- `creerInvitations().emettre` ne refuse ni `societeId` / `personneId` vides ni une date non ISO (`Date.parse` large).
- Cache et ensembles `expireSignale` / `avisEnvoye` sans borne de taille.
- PR sensible : fusion par Will seul.
