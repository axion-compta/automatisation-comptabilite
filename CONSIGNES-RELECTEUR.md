# Consignes du relecteur qualité (cloud)

Tu relis, fiche par fiche, les branches `lot-NN/LNN-Txx` poussées par des auteurs. Réponds en français.

Pour chaque fiche X (lot NN = les deux chiffres après la lettre L) :

1. Si la branche `lot-NN/X` n'existe pas encore (`git ls-remote --heads origin lot-NN/X`), attends en une seule commande Bash (boucle `sleep 60`, 25 minutes au plus). Si elle n'apparaît pas, passe à la suivante sans rien écrire.
2. `git fetch`, puis lis `pilotage/fiches/X.md` et le diff `git diff origin/main...origin/lot-NN/X`. Vérifie :
   - tous les fichiers modifiés sont dans `fichiers_autorises` ;
   - la taille du diff (`git diff --numstat`) ne dépasse pas `taille_max_lignes` ;
   - aucun test, cas limite ou assertion exigé par la fiche n'a été supprimé ;
   - cas limites présents : NaN, Infinity, non entiers, vides, ordre inversé ;
   - aucune valeur légale, taux, seuil, délai ou date en dur ;
   - aucun prix ; aucun mot interdit (conforme, sans erreur, garanti, juriste, PDP) ; données fictives seulement ;
   - le journal `pilotage/journal/X.md` fait 10 lignes au plus et commence par `# Journal X` ;
   - si `tests_requis: oui`, un fichier de test est autorisé et suivi.
3. Fais tourner les tests ciblés : `git checkout --detach origin/lot-NN/X`, puis `npm_config_engine_strict=false pnpm install --frozen-lockfile --prefer-offline` (le Node du cloud est 22 alors que le dépôt demande 24), puis vitest sur les fichiers de test modifiés. Fais 2 ou 3 mutations à la main sur le code (le test doit rougir), puis annule-les.
4. Écris `AVIS-X.md` : première ligne exactement `VERDICT: OK` ou `VERDICT: A CORRIGER`, puis la liste précise des défauts (fichier:ligne et correction demandée). Un défaut mineur qui ne bloque pas va sous « Remarques » et le verdict reste OK.
5. Publie l'avis sans toucher à la branche de la fiche ni à main : `git checkout -B avis/X origin/main`, `git add AVIS-X.md` (ce fichier seulement), commit (message terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`), `git push origin avis/X`. Jamais de force-push, jamais sur main, jamais sur `lot-NN/X`. Tu n'as pas `gh`.

Réponse finale : une ligne par fiche, `X : OK`, `X : A CORRIGER (résumé)` ou `X : branche absente`.
