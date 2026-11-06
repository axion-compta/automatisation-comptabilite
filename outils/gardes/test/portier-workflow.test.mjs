import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHEMIN = fileURLToPath(new URL('../../../.github/workflows/portier.yml', import.meta.url));
const texte = readFileSync(CHEMIN, 'utf8');
const lignes = texte.split(/\r?\n/);
const utiles = lignes.filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, ''));
const plat = utiles.join('\n');

// Découpe le fichier en tâches (clé à 2 espaces sous « jobs: »).
function taches() {
  const debut = utiles.findIndex((l) => /^jobs:\s*$/.test(l));
  const tetes = [];
  for (let i = debut + 1; i < utiles.length; i++) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(utiles[i])) tetes.push(i);
  }
  const res = {};
  tetes.forEach((d, k) => {
    const f = k + 1 < tetes.length ? tetes[k + 1] : utiles.length;
    res[utiles[d].trim().replace(':', '')] = utiles.slice(d, f).join('\n');
  });
  return res;
}

// Lignes (triées) du bloc « permissions: » d'une tâche, indentées de 6 espaces.
function permissionsDe(bloc) {
  const l = bloc.split(/\r?\n/);
  const d = l.findIndex((x) => /^ {4}permissions:\s*$/.test(x));
  assert.ok(d >= 0, 'bloc permissions absent');
  const res = [];
  for (let i = d + 1; i < l.length && /^ {6}\S/.test(l[i]); i++) res.push(l[i].trim());
  return res.sort();
}

test('permissions-vides-globales', () => {
  assert.ok(utiles.some((l) => /^permissions:\s*\{\}\s*$/.test(l)));
  assert.ok(!/write-all|read-all/.test(texte));
  assert.deepEqual(Object.keys(taches()), ['portier']);
});

test('droits-ecriture-sur-un-seul-job', () => {
  const t = taches();
  assert.deepEqual(permissionsDe(t.portier), ['contents: write', 'pull-requests: write']);
  assert.equal((plat.match(/:\s*write\b/g) ?? []).length, 2);
  assert.ok(!/id-token|packages:/.test(plat));
});

test('declencheurs-workflow-run-ou-dispatch', () => {
  const debut = utiles.findIndex((l) => /^on:\s*$/.test(l));
  const fin = utiles.findIndex((l, i) => i > debut && /^\S/.test(l));
  const bloc = utiles.slice(debut, fin).join('\n');
  const cles = utiles.slice(debut + 1, fin).filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim().replace(/:.*$/, ''));
  assert.deepEqual(cles.sort(), ['workflow_dispatch', 'workflow_run']);
  assert.match(bloc, /workflows: \["CI"\]/);
  assert.match(bloc, /types: \[completed\]/);
  assert.match(texte, /if: github\.event_name == 'workflow_dispatch' \|\| github\.event\.workflow_run\.event == 'pull_request'/);
});

test('pas-de-pull-request-target', () => {
  assert.ok(!/pull_request_target/.test(texte));
  assert.ok(!/^\s*pull_request:/m.test(plat));
});

test('actions-epinglees-sha', () => {
  const usages = utiles.map((l) => l.match(/^\s*(?:-\s+)?uses:\s*(\S+)/)).filter(Boolean);
  assert.ok(usages.length >= 2);
  for (const u of usages) assert.match(u[1], /@[0-9a-f]{40}$/, u[1]);
  for (const l of lignes.filter((x) => /uses:/.test(x))) assert.match(l, /#\s*v\d/);
});

test('checkout-ref-main', () => {
  let n = 0;
  lignes.forEach((l, i) => {
    if (/uses:\s*actions\/checkout@/.test(l)) {
      n++;
      const suite = lignes.slice(i + 1, i + 4).join('\n');
      assert.match(suite, /^\s+ref: main\s*$/m);
      assert.match(suite, /persist-credentials:\s*false/);
    }
  });
  assert.equal(n, 1);
  assert.ok(!/github\.(head_ref|event\.pull_request|event\.workflow_run\.head)/.test(plat));
});

test('concurrence-sans-annulation', () => {
  assert.match(plat, /^concurrency:\n {2}group: portier\n {2}cancel-in-progress: false$/m);
});

test('numero-de-pr-par-env', () => {
  assert.match(plat, /NUMERO_PR: \$\{\{ github\.event\.workflow_run\.pull_requests\[0\]\.number \|\| inputs\.pr \}\}/);
  assert.match(plat, /run: node scripts\/pilotage\/portier\.mjs "\$NUMERO_PR"$/m);
});

test('aucun-secret', () => {
  assert.ok(!/secrets\./.test(texte));
  assert.ok(!/\bsecrets:/.test(texte));
  assert.match(plat, /GH_TOKEN: \$\{\{ github\.token \}\}/);
});

test('pas-d-expression-dans-run', () => {
  utiles.forEach((l, i) => {
    const m = l.match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (!m) return;
    assert.ok(!m[2].includes('${{'), `ligne ${i + 1}`);
    if (/^[|>]/.test(m[2])) {
      for (let k = i + 1; k < utiles.length && (utiles[k].trim() === '' || utiles[k].length - utiles[k].trimStart().length > m[1].length); k++) {
        assert.ok(!utiles[k].includes('${{'));
      }
    }
  });
  assert.ok(utiles.some((l) => /run:/.test(l)));
});
