#!/bin/bash
# Fusionneur cloud SANS IA : passe etat.sh fusion toutes les 3 min pendant 55 min. Lancer: bash FUSIONNEUR.sh
cat > /tmp/etat.sh <<'EOS'
# Tableau : PR, fiche, avis (branche ou commentaire) vs tête, CI. Avec "fusion" en argument : fusionne celles OK=tête + CI toute verte.
R=will383842/automatisation-comptabilite; date -u +%T
gh pr list -R $R --state open -L 60 --json number,headRefName,headRefOid,mergeable --jq '.[]|"\(.number) \(.headRefName) \(.headRefOid) \(.mergeable)"' | sort -n | while read n b h m; do
 a=$(gh api "repos/$R/contents/AVIS-$n.md?ref=avis/$n" -H "Accept: application/vnd.github.raw" 2>/dev/null | grep -oE "VERDICT: *(OK|A CORRIGER)|[0-9a-f]{40}" | head -2 | tr '\n' ' ')
 id=$(echo "$b" | grep -oE "L[0-9]{2}-T[0-9]+")
 case "$a" in *"$h"*) ;; *) a3=$(gh api "repos/$R/contents/AVIS-$id.md?ref=avis/$id" -H "Accept: application/vnd.github.raw" 2>/dev/null | grep -oE "VERDICT: *(OK|A CORRIGER)|[0-9a-f]{40}" | head -2 | tr '
' ' '); [ -n "$a3" ] && a="$a3";; esac
 case "$a" in *"$h"*) ;; *) c2=$(gh pr view $n -R $R --json comments --jq '[.comments[]|select(.body|test("VERDICT: *(OK|A CORRIGER)"))]|.[-1].body // ""' | grep -oE "VERDICT: *(OK|A CORRIGER)|[0-9a-f]{40}" | head -2 | tr '\n' ' '); [ -n "$c2" ] && a="$c2";; esac
 v=$(echo "$a" | grep -oE "OK|A CORRIGER" | head -1); case "$a" in *"$h"*) t="=tete";; "") t="";; *) t="ancien";; esac
 ci=$(gh pr checks $n -R $R 2>&1 | awk -F'\t' '{print $2}' | sort | uniq -c | awk '{printf "%s%s ",$1,substr($2,1,2)}')
 echo "$n ${b#*/} $m avis=${v:--}$t ci=$ci"
 if [ "$1" = fusion ] && [ "$v" = OK ] && [ "$t" = "=tete" ] && [ "$ci" = "9pa " ] && [ "$m" != CONFLICTING ]; then gh pr merge $n -R $R --squash --delete-branch --match-head-commit $h >/dev/null 2>&1; echo "   -> $n $(gh pr view $n -R $R --json state --jq .state)"; fi
done
EOS
gh auth status >/dev/null 2>&1 || { echo "GH NON CONNECTE"; exit 2; }
fin=$(( $(date +%s) + 3300 ))
while [ $(date +%s) -lt $fin ]; do bash /tmp/etat.sh fusion 2>&1 | grep -E "MERGED|^[0-9:]+$"; sleep 170; done
