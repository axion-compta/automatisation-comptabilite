import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHEMIN = fileURLToPath(new URL('../../../.github/workflows/alerte-fusion.yml', import.meta.url));
const texte = readFileSync(CHEMIN, 'utf8');
const lignes = texte.split(/\r?\n/);
const utiles = lignes.filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, ''));
const corps = utiles.join('\n');

// Lignes (triées) du bloc « permissions: » du job (indenté de 4 espaces, entrées de 6).
function permissionsDuJob() {
  const d = utiles.findIndex((x) => /^ {4}permissions:\s*$/.test(x));
  assert.ok(d >= 0, 'bloc permissions du job absent');
  const res = [];
  for (let i = d + 1; i < utiles.length && /^ {6}\S/.test(utiles[i]); i++) res.push(utiles[i].trim());
  return res.sort();
}

test('pas-de-pull-request-target', () => {
  assert.ok(!/pull_request_target/.test(corps));
  assert.ok(!/^\s*pull_request:/m.test(corps));
  const debut = utiles.findIndex((l) => /^on:\s*$/.test(l));
  const fin = utiles.findIndex((l, i) => i > debut && /^\S/.test(l));
  const cles = utiles.slice(debut + 1, fin).filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim().replace(/:.*$/, ''));
  assert.deepEqual(cles.sort(), ['workflow_dispatch', 'workflow_run']);
  assert.match(corps, /workflows: \['CI'\]/);
  assert.match(corps, /types: \[completed\]/);
});

test('permissions-vides-globales', () => {
  assert.equal(utiles.filter((l) => /^permissions:/.test(l)).length, 1);
  assert.ok(utiles.some((l) => /^permissions:\s*\{\}\s*$/.test(l)));
  assert.ok(!/write-all|read-all/.test(texte));
});

test('droits-minimaux-sur-le-job', () => {
  assert.deepEqual(permissionsDuJob(), ['contents: read', 'issues: write', 'pull-requests: read']);
  assert.equal((corps.match(/^\s*permissions:/gm) ?? []).length, 2);
  assert.equal((corps.match(/: write/g) ?? []).length, 1);
  assert.match(corps, /timeout-minutes: \d+/);
  assert.match(corps, /^concurrency:/m);
});

test('uses-epingles-par-sha', () => {
  const usages = utiles.map((l) => l.match(/^\s*(?:-\s+)?uses:\s*(\S+)/)).filter(Boolean);
  assert.ok(usages.length >= 2);
  for (const u of usages) assert.match(u[1], /@[0-9a-f]{40}$/, u[1]);
  for (const l of lignes.filter((x) => /uses:/.test(x) && !/^\s*#/.test(x))) assert.match(l, /#\s*v\d/);
});

test('checkout-ref-main', () => {
  lignes.forEach((l, i) => {
    if (/uses:\s*actions\/checkout@/.test(l)) assert.match(lignes.slice(i + 1, i + 4).join('\n'), /^\s*ref:\s*main\s*$/m);
  });
  assert.ok(/actions\/checkout@/.test(texte));
});

test('persist-credentials-false', () => {
  lignes.forEach((l, i) => {
    if (/uses:\s*actions\/checkout@/.test(l)) {
      assert.match(lignes.slice(i + 1, i + 4).join('\n'), /persist-credentials:\s*false/);
    }
  });
  assert.ok(/actions\/checkout@/.test(texte));
});

test('aucune-expression-dans-run', () => {
  let vu = 0;
  utiles.forEach((l, i) => {
    const m = l.match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (!m) return;
    vu++;
    assert.ok(!m[2].includes('${{'), `ligne ${i + 1}`);
    if (/^[|>]/.test(m[2])) {
      for (let k = i + 1; k < utiles.length && (utiles[k].trim() === '' || utiles[k].length - utiles[k].trimStart().length > m[1].length); k++) {
        assert.ok(!utiles[k].includes('${{'), `ligne ${k + 1}`);
      }
    }
  });
  assert.ok(vu >= 1);
  assert.match(corps, /node scripts\/pilotage\/alerte\.mjs/);
});

test('aucun-secret', () => {
  assert.ok(!/secrets\./.test(texte));
  assert.ok(!/\bsecrets:/.test(texte));
});
