// garde:ci : contrôle la sûreté des workflows GitHub (V3-SEC-003, V3-QUA-022).
// Rouge si : action non épinglée par SHA de 40 caractères, pull_request_target,
// permissions absentes ou en écriture, ${{ }} dans un run:, tâche sans timeout-minutes <= 10,
// checkout sans persist-credentials: false, ci.yml sans tâche « verifier » ou sans cancel-in-progress.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MAX = 10;
const DEFAUT_ECRITURE = new Set(['id-token']);
// Droits d'écriture permis, par chemin exact de workflow (aucun motif). Hors table : id-token seul.
export const ECRITURE_PAR_WORKFLOW = new Map([
  ['.github/workflows/version.yml', new Set(['id-token'])],
  ['.github/workflows/portier.yml', new Set(['contents', 'pull-requests'])],
  ['.github/workflows/alerte-fusion.yml', new Set(['issues'])],
]);
const DOSSIER_WORKFLOWS = '.github/workflows/';

export function ecriturePermise(nom) {
  let chemin = String(nom).replace(/\\/g, '/');
  if (!chemin.includes('/')) chemin = DOSSIER_WORKFLOWS + chemin;
  return ECRITURE_PAR_WORKFLOW.get(chemin) ?? DEFAUT_ECRITURE;
}

const indent = (l) => l.length - l.trimStart().length;
const sansCommentaire = (l) => l.replace(/\s+#.*$/, '');

export function analyserWorkflow(texte, nom) {
  const pb = [];
  const lignes = texte.split(/\r?\n/);
  const ajoute = (n, msg) => pb.push(`${nom}:${n + 1} ${msg}`);
  const permis = ecriturePermise(nom);

  // lignes du bloc `permissions:` de haut niveau (hors job)
  const global = new Set();
  let dansGlobal = false;
  lignes.forEach((l, i) => {
    if (/^\S/.test(l) && !l.startsWith('#')) dansGlobal = /^permissions:\s*(#.*)?$/.test(l);
    else if (dansGlobal && l.trim() !== '') global.add(i);
  });

  lignes.forEach((brut, i) => {
    const l = sansCommentaire(brut);
    if (/^\s*#/.test(brut)) return;
    if (/pull_request_target/.test(l)) ajoute(i, 'pull_request_target interdit');
    const u = l.match(/^\s*(?:-\s+)?uses:\s*(\S+)/);
    if (u) {
      const ref = u[1].replace(/^["']|["']$/g, '');
      if (!ref.startsWith('./') && !/@[0-9a-f]{40}$/.test(ref)) {
        ajoute(i, `action non épinglée par SHA de 40 caractères : ${ref}`);
      }
    }
    const w = l.match(/^\s*([a-z-]+):\s*write(?:-all)?\s*$/);
    if (w && !permis.has(w[1])) ajoute(i, `permission en écriture interdite : ${w[1]}`);
    else if (w && global.has(i) && !DEFAUT_ECRITURE.has(w[1])) ajoute(i, `écriture au niveau global interdite : ${w[1]}`);
    const enLigne = l.match(/^\s*permissions:\s*\{(.*)\}\s*$/);
    if (enLigne) {
      for (const [, droit] of enLigne[1].matchAll(/([a-z-]+)\s*:\s*write\b/g)) {
        if (!permis.has(droit)) ajoute(i, `permission en écriture interdite : ${droit}`);
        else if (/^permissions:/.test(l) && !DEFAUT_ECRITURE.has(droit)) ajoute(i, `écriture au niveau global interdite : ${droit}`);
      }
    }
    if (/^\s*permissions:\s*write-all/.test(l)) ajoute(i, 'permissions: write-all interdit');
  });

  // permissions de haut niveau
  if (!lignes.some((l) => /^permissions:/.test(l))) ajoute(0, 'permissions de haut niveau absentes (permissions: contents: read)');

  // ${{ }} dans un run:
  for (let i = 0; i < lignes.length; i++) {
    if (/^s*#/.test(lignes[i])) continue;
    const m = lignes[i].match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (!m) continue;
    const base = indent(lignes[i]);
    const reste = m[2];
    if (/^[|>][+-]?$/.test(reste)) {
      for (let k = i + 1; k < lignes.length; k++) {
        if (lignes[k].trim() !== '' && indent(lignes[k]) <= base) break;
        if (lignes[k].includes('${{')) ajoute(k, 'expression ${{ }} interdite dans run: (passer par env:)');
      }
    } else if (reste.includes('${{')) {
      ajoute(i, 'expression ${{ }} interdite dans run: (passer par env:)');
    }
  }

  // tâches : timeout et checkout
  const debutJobs = lignes.findIndex((l) => /^jobs:\s*$/.test(l));
  if (debutJobs >= 0) {
    const tetes = [];
    for (let i = debutJobs + 1; i < lignes.length; i++) {
      if (/^\S/.test(lignes[i]) && lignes[i].trim() !== '' && !lignes[i].startsWith('#')) break;
      if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lignes[i])) tetes.push(i);
    }
    tetes.forEach((debut, idx) => {
      const fin = idx + 1 < tetes.length ? tetes[idx + 1] : lignes.length;
      const bloc = lignes.slice(debut, fin);
      const t = bloc.map((l) => l.match(/^ {4}timeout-minutes:\s*(\d+)\s*$/)).find(Boolean);
      if (!t) ajoute(debut, `tâche ${lignes[debut].trim()} sans timeout-minutes`);
      else if (Number(t[1]) > TIMEOUT_MAX) ajoute(debut, `timeout-minutes ${t[1]} > ${TIMEOUT_MAX}`);
    });
  }
  lignes.forEach((l, i) => {
    if (/^\s*(?:-\s+)?uses:\s*actions\/checkout@/.test(l)) {
      const base = indent(l);
      const suite = [];
      for (let k = i + 1; k < lignes.length; k++) {
        if (lignes[k].trim() !== '' && indent(lignes[k]) < base) break;
        if (/^\s*-\s/.test(lignes[k]) && indent(lignes[k]) <= base) break;
        suite.push(lignes[k]);
      }
      if (!suite.some((s) => /persist-credentials:\s*false/.test(s))) ajoute(i, 'checkout sans persist-credentials: false');
    }
  });

  if (/(^|\/)ci\.yml$/.test(nom) || nom === 'ci.yml') {
    if (!/^ {2}verifier:\s*$/m.test(texte)) pb.push(`${nom} tâche finale « verifier » absente`);
    if (!/^\s*name:\s*verifier\s*$/m.test(texte)) pb.push(`${nom} tâche finale doit se nommer exactement « verifier »`);
    if (!/cancel-in-progress:\s*true/.test(texte)) pb.push(`${nom} concurrency sans cancel-in-progress: true`);
  }
  return pb;
}

export function analyserCodeowners(texte) {
  const requis = ['/.github/', '/outils/gardes/', '/scripts/pilotage/', '/pilotage/', '/package.json', '/pnpm-lock.yaml', '/pnpm-workspace.yaml', '/.npmrc'];
  const pb = [];
  for (const chemin of requis) {
    const ok = texte.split(/\r?\n/).some((l) => l.trim().startsWith(chemin + ' ') && l.includes('@will383842'));
    if (!ok) pb.push(`CODEOWNERS : ${chemin} doit avoir @will383842 pour propriétaire`);
  }
  return pb;
}

export function analyserDepot(racine = '.') {
  const pb = [];
  const dossier = join(racine, '.github', 'workflows');
  if (!existsSync(dossier)) return ['.github/workflows absent'];
  const fichiers = readdirSync(dossier).filter((f) => /\.ya?ml$/.test(f));
  if (!fichiers.includes('ci.yml')) pb.push('.github/workflows/ci.yml absent');
  for (const f of fichiers) pb.push(...analyserWorkflow(readFileSync(join(dossier, f), 'utf8'), f));
  const co = join(racine, '.github', 'CODEOWNERS');
  if (!existsSync(co)) pb.push('.github/CODEOWNERS absent');
  else pb.push(...analyserCodeowners(readFileSync(co, 'utf8')));
  if (!existsSync(join(racine, '.gitleaks.toml'))) pb.push('.gitleaks.toml absent');
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot('.');
  if (pb.length > 0) {
    console.error('garde:ci ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:ci vert');
}
