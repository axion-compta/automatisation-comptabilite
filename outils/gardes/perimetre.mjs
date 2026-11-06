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
  if (!Array.isArray(fiche.fichiers_autorises)) return ['fiche : fichiers_autorises absent ou n’est pas un tableau'];
  if (typeof fiche.taille_max_lignes !== 'number' || !Number.isFinite(fiche.taille_max_lignes)) {
    pb.push('fiche : taille_max_lignes absent ou non numérique');
  }
  const motifs = fiche.fichiers_autorises;
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

export function idDeBranche(branche) {
  return branche.match(/^lot-(\d\d)\/(L\1-T\d\d)$/)?.[2];
}

const BASE = 'origin/main';

// Mode « PR de pilotage » : branche lot-NN/fiches-* ou pilotage/*, tous les fichiers sous pilotage/.
// Limite : l'étiquette sensible-a-fusionner n'est pas fournie à la garde par ci.yml, elle n'est pas exigée ici.
export function estPRPilotage(branche, fichiers) {
  if (!/^(?:lot-\d\d\/fiches-.+|pilotage\/.+)$/.test(branche)) return false;
  if (fichiers.length === 0) return false;
  return fichiers.every((f) => f.startsWith('pilotage/') && !f.split('/').includes('..'));
}
const decoupe = (t) => (t ?? '').split('\0').filter(Boolean);

// git : (args) => sortie texte, ou null si échec. env : { GITHUB_HEAD_REF, CORPS_PR }.
export function collecter(git, env = {}) {
  const enPR = Boolean(env.GITHUB_HEAD_REF);
  const branche = env.GITHUB_HEAD_REF || git(['rev-parse', '--abbrev-ref', 'HEAD'])?.trim() || '';
  if (enPR) {
    const n = git(['diff', '--name-only', '--no-renames', '-z', `${BASE}...HEAD`]);
    if (n !== null && estPRPilotage(branche, decoupe(n))) return { pilotage: true, noms: decoupe(n), erreurs: [] };
  }
  const id = idDeBranche(branche) ?? (enPR ? env.CORPS_PR?.match(/Fiche:\s*(L\d\d-T\d\d)/)?.[1] : undefined);
  if (!id) return enPR ? { erreurs: [`aucune fiche pour la branche ${branche}`] } : { ignore: true };
  const texteFiche = git(['show', `${BASE}:pilotage/fiches/${id}.md`]);
  const noms = git(['diff', '--name-only', '--no-renames', '-z', `${BASE}...HEAD`]);
  const stat = git(['diff', '--numstat', '--no-renames', '-z', `${BASE}...HEAD`]);
  const erreurs = [];
  if (texteFiche === null) erreurs.push(`fiche ${id} introuvable sur ${BASE}`);
  if (noms === null || stat === null) erreurs.push(`git diff impossible contre ${BASE}`);
  const fichiers = decoupe(noms);
  const lignes = decoupe(stat).reduce((n, l) => {
    const [a, d] = l.split('\t');
    return n + (parseInt(a, 10) || 0) + (parseInt(d, 10) || 0);
  }, 0);
  const paquets = fichiers
    .filter((f) => f.endsWith('package.json'))
    .map((f) => ({ chemin: f, base: git(['show', `${BASE}:${f}`]), branche: git(['show', `HEAD:${f}`]) }));
  return { id, texteFiche, noms: fichiers, lignes, paquets, erreurs };
}

export function evaluer(git, env = {}) {
  const c = collecter(git, env);
  if (c.pilotage) return { pb: [], msg: `garde:perimetre vert (PR de pilotage, ${c.noms.length} fichier(s))` };
  if (c.ignore) return { pb: [], msg: 'garde:perimetre vert (pas de branche de fiche)' };
  const pb = [...c.erreurs];
  if (typeof c.texteFiche === 'string') {
    try {
      pb.push(...analyserPerimetre(lireFiche(c.texteFiche), { fichiers: c.noms, lignes: c.lignes }, c.paquets));
    } catch (e) {
      pb.push(`fiche illisible : ${e.message}`);
    }
  }
  return { pb, msg: `garde:perimetre vert (${c.id}, ${c.noms?.length} fichier(s), ${c.lignes} ligne(s))` };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const git = (args) => {
    const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
    return r.status === 0 ? r.stdout : null;
  };
  const { pb, msg } = evaluer(git, process.env);
  if (pb.length > 0) {
    console.error('garde:perimetre ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log(msg);
}
