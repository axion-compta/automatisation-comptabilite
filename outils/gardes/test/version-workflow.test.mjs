import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHEMIN = fileURLToPath(new URL('../../../.github/workflows/version.yml', import.meta.url));
const texte = readFileSync(CHEMIN, 'utf8');
const lignes = texte.split(/\r?\n/);
const utiles = lignes.filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, ''));

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

test('pas-de-pull-request-target', () => {
  assert.ok(!/pull_request_target/.test(utiles.join('\n')));
  assert.ok(!/^\s*pull_request:/m.test(utiles.join('\n')));
});

test('permissions-vides-globales', () => {
  assert.ok(utiles.some((l) => /^permissions:\s*\{\}\s*$/.test(l)));
  const t = taches();
  assert.deepEqual(permissionsDe(t.sbom), ['contents: read']);
  assert.deepEqual(permissionsDe(t.signer), ['contents: read', 'id-token: write']);
  assert.ok(!/write-all|read-all/.test(texte));
  for (const bloc of Object.values(t)) {
    for (const p of permissionsDe(bloc)) assert.ok(!/: write/.test(p) || p === 'id-token: write', p);
  }
});

test('id-token-sur-un-seul-job', () => {
  const t = taches();
  const avec = Object.keys(t).filter((k) => /id-token:\s*write/.test(t[k]));
  assert.deepEqual(avec, ['signer']);
  assert.match(t.signer, /contents: read/);
  assert.equal((utiles.join('\n').match(/id-token:\s*write/g) ?? []).length, 1);
});

test('actions-epinglees-sha', () => {
  const usages = utiles.map((l) => l.match(/^\s*(?:-\s+)?uses:\s*(\S+)/)).filter(Boolean);
  assert.ok(usages.length >= 5);
  for (const u of usages) assert.match(u[1], /@[0-9a-f]{40}$/, u[1]);
  for (const l of lignes.filter((x) => /uses:/.test(x))) assert.match(l, /#\s*v\d/);
});

test('signer-sans-installation', () => {
  const s = taches().signer;
  assert.ok(!/pnpm|npm |npx|node |actions\/checkout|setup-node/.test(s));
  assert.match(s, /actions\/download-artifact@/);
  assert.match(s, /cosign sign-blob/);
  assert.match(s, /cosign-release: 'v\d+\.\d+\.\d+'/);
});

test('sbom-genere-apres-installation-figee', () => {
  const s = taches().sbom;
  assert.match(s, /pnpm install --frozen-lockfile/);
  assert.match(s, /cyclonedx-npm@\d+\.\d+\.\d+ /);
  assert.match(s, /--ignore-npm-errors/);
  assert.match(s, /upload-artifact/);
});

test('persist-credentials-false', () => {
  lignes.forEach((l, i) => {
    if (/uses:\s*actions\/checkout@/.test(l)) {
      assert.match(lignes.slice(i + 1, i + 4).join('\n'), /persist-credentials:\s*false/);
    }
  });
  assert.ok(/actions\/checkout@/.test(texte));
});

test('declencheurs-tag-ou-dispatch', () => {
  const debut = utiles.findIndex((l) => /^on:\s*$/.test(l));
  const fin = utiles.findIndex((l, i) => i > debut && /^\S/.test(l));
  const cles = utiles.slice(debut + 1, fin).filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim().replace(/:.*$/, ''));
  assert.deepEqual(cles.sort(), ['push', 'workflow_dispatch']);
  assert.match(utiles.slice(debut, fin).join('\n'), /tags: \['v\*'\]/);
  assert.ok(!/branches:/.test(utiles.slice(debut, fin).join('\n')));
});

test('aucun-secret', () => {
  assert.ok(!/secrets\./.test(texte));
  assert.ok(!/\bsecrets:/.test(texte));
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
