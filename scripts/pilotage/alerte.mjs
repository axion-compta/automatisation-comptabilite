// Pilotage sans IA : alertes. Deux cas : une fiche au 3e échec, une PR sensible fusionnée par un autre que Will.
import { fileURLToPath } from 'node:url';

export const PROPRIETAIRE = 'will383842';
export const SENSIBLES = [
  /^\.github\//,
  /^LICENSE$/,
  /^scripts\/verifier\.mjs$/,
  /^\.gitleaks\.toml$/,
  /^eslint\.config\.js$/,
  /^tsconfig\.base\.json$/,
  /^CODEOWNERS$/,
  /^\.npmrc$/,
  /^pnpm-workspace\.yaml$/,
  /^pnpm-lock\.yaml$/,
  /^outils\/gardes\//,
  /^scripts\/pilotage\//,
  /^pilotage\//,
  /^\.claude\//,
  /^CLAUDE\.md$/,
  /(^|\/)package\.json$/,
];

export const estSensible = (chemin) => SENSIBLES.some((r) => r.test(chemin));

// prs : [{ numero, labels: [nom] }] ; renvoie un message par PR au 3e échec ou bloquée.
export function alertesEchecs(prs) {
  return prs
    .filter((p) => (p.labels ?? []).some((l) => l === 'echec-3' || l === 'bloque'))
    .map((p) => `PR #${p.numero} : 3e échec ou bloquée, reprise par ${PROPRIETAIRE} seul`);
}

// pr : { numero, fusionnee, fusionnePar, fichiers: [chemin], labels: [nom] }
// Liste des fichiers absente : la PR est considérée sensible.
export function alerteFusion(pr) {
  if (!pr.fusionnee || pr.fusionnePar === PROPRIETAIRE) return [];
  if (!Array.isArray(pr.fichiers)) {
    return [`PR #${pr.numero} : liste des fichiers absente, PR considérée sensible, fusionnée par ${pr.fusionnePar}`];
  }
  const sensible = (pr.labels ?? []).includes('sensible-a-fusionner') || pr.fichiers.some(estSensible);
  if (!sensible) return [];
  return [`PR #${pr.numero} : PR sensible fusionnée par ${pr.fusionnePar}, seul ${PROPRIETAIRE} le peut`];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Entrée : JSON { prs: [...] } sur l'entrée standard ; sortie code 1 s'il y a au moins une alerte.
  let texte = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => (texte += d));
  process.stdin.on('end', () => {
    const { prs = [] } = JSON.parse(texte || '{}');
    const msgs = [...alertesEchecs(prs), ...prs.flatMap(alerteFusion)];
    for (const m of msgs) console.log(m);
    process.exit(msgs.length > 0 ? 1 : 0);
  });
}
