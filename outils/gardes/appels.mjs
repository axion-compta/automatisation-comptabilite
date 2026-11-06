// garde:appels : les appels réseau de l'interface passent par une seule couche (V3-UX-072).
// Rouge si un fichier de apps/web/src (hors tests) autre que api.ts appelle fetch, XMLHttpRequest, WebSocket,
// EventSource, sendBeacon ou axios. Les fichiers générés (marqueur en tête) sont exclus.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Formes vues : fetch nu ou aliasé, window["fetch"], XHR/WebSocket/EventSource/sendBeacon, modules réseau, import http(s).
const APPEL = new RegExp(
  [
    String.raw`(?<![\w.$])fetch\b(?!\s*:)`,
    String.raw`\b(?:window|globalThis|self)\s*\.\s*fetch\b`,
    String.raw`['"\x60]fetch['"\x60]`,
    String.raw`\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b`,
    String.raw`['"\x60](?:axios|ky|undici|ofetch|socket\.io-client)['"\x60]`,
    String.raw`\baxios\b`,
    String.raw`\bimport\s*\(\s*['"\x60]https?:`,
  ].join('|'),
  'g',
);
const CONCERNES = /^apps\/web\/src\/.*\.(tsx?|jsx?)$/;
const TESTS = /(\.test\.|\.spec\.|\/__tests__\/)/;
// Seule couche autorisée à parler au réseau.
export const COUCHE_APPELS = 'apps/web/src/api.ts';
const GENERE = /généré|@generated|do not edit|ne pas modifier/i;

export function estExclu(chemin, texte = '') {
  if (!CONCERNES.test(chemin) || TESTS.test(chemin) || chemin === COUCHE_APPELS) return true;
  return GENERE.test(texte.split(/\r?\n/).slice(0, 3).join('\n'));
}

export function analyserTexte(texte, nom) {
  const pb = [];
  texte
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .split(/\r?\n/)
    .forEach((l, i) => {
      const code = l.replace(/(^|\s)\/\/.*$/, '');
      for (const m of code.matchAll(APPEL)) pb.push(`${nom}:${i + 1} appel réseau « ${m[0].trim()} » hors de ${COUCHE_APPELS}`);
    });
  return pb;
}

function gitReel(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}

export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const racine = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!racine) return ['git rev-parse --show-toplevel a échoué : dépôt non analysé'];
  const liste = git(['ls-files', '-z'], racine);
  if (liste === null) return ['git ls-files a échoué : dépôt non analysé'];
  const pb = [];
  for (const f of liste.split('\0').filter((x) => x && CONCERNES.test(x))) {
    try {
      const texte = lire(`${racine}/${f}`);
      if (!estExclu(f, texte)) pb.push(...analyserTexte(texte, f));
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:appels ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:appels vert');
}
