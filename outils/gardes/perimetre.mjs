// garde:perimetre : une PR ne touche que les fichiers_autorises de sa fiche (V3-QUA-027).
// La fiche est lue sur la base (origin/main), jamais sur la branche. Rouge si :
// fichier hors liste, taille > taille_max_lignes, dépendance ajoutée ou modifiée hors nouvelles_dependances.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function lireFiche(texte) {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error('fiche sans en-tête YAML');
  const fiche = {};
  for (const l of m[1].split(/\r?\n/)) {
    const kv = l.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const brut = kv[2].trim();
    try {
      fiche[kv[1]] = JSON.parse(brut);
    } catch {
      fiche[kv[1]] = brut;
    }
  }
  return fiche;
}

function enRegex(motif) {
  let s = '';
  for (let i = 0; i < motif.length; i++) {
    const c = motif[i];
    if (c === '*' && motif[i + 1] === '*') {
      s += '.*';
      i++;
    } else if (c === '*') s += '[^/]*';
    else if (c === '{') s += '(?:';
    else if (c === '}') s += ')';
    else if (c === ',') s += '|';
    else s += c.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + s + '$');
}

export function estAutorise(fichier, motifs) {
  return motifs.some((m) => enRegex(m).test(fichier));
}

function dependances(jsonTexte) {
  const out = {};
  if (!jsonTexte) return out;
  const j = JSON.parse(jsonTexte);
  for (const champ of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [nom, v] of Object.entries(j[champ] ?? {})) out[`${champ}:${nom}`] = v;
  }
  return out;
}

// diff : { fichiers: [chemin], lignes: nombre }, paquets : [{ chemin, base, branche }] (textes package.json)
export function analyserPerimetre(fiche, diff, paquets = []) {
  const pb = [];
  const motifs = fiche.fichiers_autorises ?? [];
  for (const f of diff.fichiers) {
    if (!estAutorise(f, motifs)) pb.push(`fichier hors liste : ${f}`);
  }
  if (typeof fiche.taille_max_lignes === 'number' && diff.lignes > fiche.taille_max_lignes) {
    pb.push(`taille ${diff.lignes} lignes > ${fiche.taille_max_lignes}`);
  }
  const permises = new Set(fiche.nouvelles_dependances ?? []);
  for (const p of paquets) {
    const avant = dependances(p.base);
    const apres = dependances(p.branche);
    for (const k of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
      if (avant[k] !== apres[k] && !permises.has(k.split(':')[1])) {
        pb.push(`dépendance modifiée sans autorisation : ${k} (${p.chemin})`);
      }
    }
  }
  return pb;
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const branche = process.env.GITHUB_HEAD_REF || git(['rev-parse', '--abbrev-ref', 'HEAD'])?.trim() || '';
  const id = branche.match(/^lot-00\/(L\d\d-T\d\d)$/)?.[1];
  if (!id) {
    console.log('garde:perimetre vert (pas de branche de fiche)');
    process.exit(0);
  }
  const base = 'origin/main';
  const texteFiche = git(['show', `${base}:pilotage/fiches/${id}.md`]);
  if (texteFiche === null) {
    console.error(`garde:perimetre ROUGE\n - fiche ${id} introuvable sur ${base}`);
    process.exit(1);
  }
  const noms = (git(['diff', '--name-only', `${base}...HEAD`]) ?? '').split('\n').filter(Boolean);
  const stat = git(['diff', '--numstat', `${base}...HEAD`]) ?? '';
  const lignes = stat
    .split('\n')
    .filter(Boolean)
    .reduce((n, l) => n + (parseInt(l.split('\t')[0], 10) || 0) + (parseInt(l.split('\t')[1], 10) || 0), 0);
  const paquets = noms
    .filter((f) => f.endsWith('package.json'))
    .map((f) => ({ chemin: f, base: git(['show', `${base}:${f}`]), branche: git(['show', `HEAD:${f}`]) }));
  const pb = analyserPerimetre(lireFiche(texteFiche), { fichiers: noms, lignes }, paquets);
  if (pb.length > 0) {
    console.error('garde:perimetre ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log(`garde:perimetre vert (${id}, ${noms.length} fichier(s), ${lignes} ligne(s))`);
}
