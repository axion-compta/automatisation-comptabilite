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
  let prof = 0; // profondeur d’accolades : la virgule ne sépare des variantes qu’à l’intérieur
  for (let i = 0; i < motif.length; i++) {
    const c = motif[i];
    if (c === '*' && motif[i + 1] === '*') {
      s += '.*';
      i++;
    } else if (c === '*') s += '[^/]*';
    else if (c === '{') {
      prof++;
      s += '(?:';
    } else if (c === '}' && prof > 0) {
      prof--;
      s += ')';
    } else if (c === ',' && prof > 0) s += '|';
    else s += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^(?:' + s + (prof > 0 ? ')'.repeat(prof) : '') + ')$');
}

export function estAutorise(fichier, motifs) {
  return motifs.some((m) => enRegex(m).test(fichier));
}

// Champs comparés à main comme des dépendances (valeurs comparées par leur JSON : un override peut être imbriqué).
const CHAMPS = [
  'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'pnpm.overrides', 'resolutions',
  'pnpm.packageExtensions', 'pnpm.patchedDependencies', 'bundleDependencies', 'bundledDependencies',
];

// pnpm-workspace.yaml : entrées des blocs de premier niveau overrides, packageExtensions et catalog, comparées par leur texte.
function dependancesYaml(texte) {
  const out = {};
  let bloc;
  let cle;
  for (const l of (texte ?? '').split(/\r?\n/)) {
    const haut = l.match(/^(\w+):\s*(?:#.*)?$/);
    if (haut || /^\S/.test(l)) {
      bloc = haut && ['overrides', 'packageExtensions', 'catalog'].includes(haut[1]) ? haut[1] : undefined;
      cle = undefined;
    } else if (bloc && l.trim() !== '' && !l.trim().startsWith('#')) {
      const indent = l.length - l.trimStart().length;
      out.__indent ??= {};
      if (out.__indent[bloc] === undefined) out.__indent[bloc] = indent;
      if (indent === out.__indent[bloc]) {
        const nom = l.trim().match(/^(?:"([^"]+)"|'([^']+)'|([^:]+?))\s*:/);
        cle = `pnpm-workspace.${bloc}:${nom ? (nom[1] ?? nom[2] ?? nom[3]) : l.trim()}`;
        out[cle] = '';
      }
      if (cle) out[cle] += l.trim() + '\n';
    }
  }
  delete out.__indent;
  return out;
}

function dependances(jsonTexte, chemin) {
  const out = {};
  if (!jsonTexte) return out;
  if (chemin.endsWith('.yaml')) return dependancesYaml(jsonTexte);
  let j;
  try {
    j = JSON.parse(jsonTexte);
  } catch (e) {
    throw new Error(`package.json invalide : ${chemin} (${e.message})`);
  }
  for (const champ of CHAMPS) {
    let objet = champ.startsWith('pnpm.') ? j?.pnpm?.[champ.slice(5)] : j?.[champ];
    if (Array.isArray(objet)) objet = Object.fromEntries(objet.map((n) => [n, true])); // bundleDependencies : liste de noms
    else if (typeof objet === 'boolean') objet = { '(tout)': objet };
    for (const [nom, v] of Object.entries(objet ?? {})) out[`${champ}:${nom}`] = JSON.stringify(v);
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
  for (const m of motifs) {
    let prof = 0;
    for (const c of String(m)) if (c === '{') prof++; else if (c === '}' && prof > 0) prof--;
    if (prof > 0) pb.push(`motif invalide : accolade ouvrante jamais fermée dans ${m}`);
  }
  for (const f of diff.fichiers) {
    if (!estAutorise(f, motifs)) pb.push(`fichier hors liste : ${f}`);
  }
  if (typeof fiche.taille_max_lignes === 'number' && diff.lignes > fiche.taille_max_lignes) {
    pb.push(`taille ${diff.lignes} lignes > ${fiche.taille_max_lignes}`);
  }
  if (fiche.nouvelles_dependances !== undefined && !Array.isArray(fiche.nouvelles_dependances)) {
    return [...pb, 'fiche : nouvelles_dependances n’est pas un tableau'];
  }
  const permises = new Set(fiche.nouvelles_dependances ?? []);
  for (const p of paquets) {
    const avant = dependances(p.base, p.chemin);
    const apres = dependances(p.branche, p.chemin);
    for (const k of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
      if (avant[k] !== apres[k] && !permises.has(k.slice(k.indexOf(':') + 1))) {
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

// Mode « PR de pilotage » : branche lot-NN/fiches-* ou pilotage/*, qui AJOUTE (statut A) uniquement des
// fiches ou journaux pilotage/(fiches|journal)/LNN-TMM.md, hors lien symbolique (120000) et sous-module (160000).
// Toute modification, suppression, ARRET, consignes/, LISEZMOI.md repasse par le chemin normal.
// Limite : l'étiquette sensible-a-fusionner n'est pas fournie à la garde par ci.yml, elle n'est pas exigée ici.
const FICHIER_PILOTAGE = /^pilotage\/(?:fiches|journal)\/L\d\d-T\d\d\.md$/;
// entrees : [{ statut, mode, chemin }], lues par git diff --raw -z --no-renames
export function estPRPilotage(branche, entrees) {
  if (!/^(?:lot-\d\d\/fiches-.+|pilotage\/.+)$/.test(branche)) return false;
  if (entrees.length === 0) return false;
  return entrees.every(
    (e) => e.statut === 'A' && e.mode !== '120000' && e.mode !== '160000' && FICHIER_PILOTAGE.test(e.chemin),
  );
}
export function lireRaw(texte) {
  const t = (texte ?? '').split('\0');
  const out = [];
  for (let i = 0; i < t.length; i++) {
    const m = t[i].match(/^:(\d+) (\d+) \w+ \w+ ([A-Z])\d*$/);
    if (m && t[i + 1] !== undefined) out.push({ statut: m[3], mode: m[2], chemin: t[++i] });
  }
  return out;
}
const decoupe = (t) => (t ?? '').split('\0').filter(Boolean);

// git : (args) => sortie texte, ou null si échec. env : { GITHUB_HEAD_REF, CORPS_PR }.
export function collecter(git, env = {}) {
  const enPR = Boolean(env.GITHUB_HEAD_REF);
  const branche = env.GITHUB_HEAD_REF || git(['rev-parse', '--abbrev-ref', 'HEAD'])?.trim() || '';
  if (enPR) {
    const raw = git(['diff', '--raw', '--no-renames', '-z', `${BASE}...HEAD`]);
    const e = lireRaw(raw);
    if (raw !== null && estPRPilotage(branche, e)) return { pilotage: true, noms: e.map((x) => x.chemin), erreurs: [] };
  }
  const idBranche = idDeBranche(branche);
  const idCorps = enPR && !idBranche ? env.CORPS_PR?.match(/Fiche:\s*(L\d\d-T\d\d)\b/)?.[1] : undefined;
  const id = idBranche ?? idCorps;
  if (!id) return enPR ? { erreurs: [`aucune fiche pour la branche ${branche}`] } : { ignore: true };
  const texteFiche = git(['show', `${BASE}:pilotage/fiches/${id}.md`]);
  const noms = git(['diff', '--name-only', '--no-renames', '-z', `${BASE}...HEAD`]);
  const stat = git(['diff', '--numstat', '--text', '--no-renames', '-z', `${BASE}...HEAD`]);
  const erreurs = [];
  if (texteFiche === null) erreurs.push(`fiche ${id} introuvable sur ${BASE}`);
  if (noms === null || stat === null) erreurs.push(`git diff impossible contre ${BASE}`);
  const fichiers = decoupe(noms);
  // TITRE_PR (forme « LNN-TMM titre », fourni par ci.yml) : son id doit être celui de la branche (ou du corps).
  if (enPR && env.TITRE_PR !== undefined && env.TITRE_PR.match(/^(L\d\d-T\d\d) \S/)?.[1] !== id) {
    erreurs.push(`titre de PR : « LNN-TMM titre » attendu avec l’id ${id}`);
  }
  // Repli sur CORPS_PR : seulement pour une PR qui ne touche que pilotage/fiches/, sur une fiche sensible non terminée.
  if (idCorps) {
    const horsFiches = fichiers.filter((f) => !f.startsWith('pilotage/fiches/'));
    if (fichiers.length === 0 || horsFiches.length > 0) {
      erreurs.push(`repli CORPS_PR refusé : la PR touche autre chose que pilotage/fiches/ (${horsFiches[0] ?? 'aucun fichier'})`);
    }
    let f;
    try {
      f = typeof texteFiche === 'string' ? lireFiche(texteFiche) : undefined;
    } catch {
      f = undefined; // l’illisibilité est signalée par evaluer
    }
    if (f?.statut === 'fait') erreurs.push(`repli CORPS_PR refusé : la fiche ${id} a déjà statut: fait sur ${BASE}`);
    if (f && f.sensible !== 'oui') erreurs.push(`repli CORPS_PR refusé : la fiche ${id} n’est pas sensible`);
  }
  // binaire côté branche (un octet NUL) = rouge ; --text compte quand même les lignes si seul l'ancien état était binaire
  for (const f of fichiers) if (git(['show', `HEAD:${f}`])?.includes('\0')) erreurs.push(`fichier binaire : ${f}`);
  const lignes = decoupe(stat).reduce((n, l) => {
    const [a, d, ...reste] = l.split('\t');
    // « - - » : git ne sait pas compter (binaire) ; plutôt que 0 ligne, rouge explicite.
    if (a === '-' || d === '-') erreurs.push(`fichier binaire non comptable : ${reste.join('\t')}`);
    return n + (parseInt(a, 10) || 0) + (parseInt(d, 10) || 0);
  }, 0);
  const paquets = fichiers
    .filter((f) => f.endsWith('package.json') || f.endsWith('pnpm-workspace.yaml'))
    .map((f) => ({ chemin: f, base: git(['show', `${BASE}:${f}`]), branche: git(['show', `HEAD:${f}`]) }));
  return { id, texteFiche, noms: fichiers, lignes, paquets, erreurs };
}

export function evaluer(git, env = {}) {
  const c = collecter(git, env);
  if (c.pilotage) return { pb: [], msg: `garde:perimetre vert (PR de pilotage, ${c.noms.length} fichier(s))` };
  if (c.ignore) return { pb: [], msg: 'garde:perimetre vert (pas de branche de fiche)' };
  const pb = [...c.erreurs];
  if (typeof c.texteFiche === 'string') {
    let fiche;
    try {
      fiche = lireFiche(c.texteFiche);
    } catch (e) {
      pb.push(`fiche illisible : ${e.message}`);
    }
    if (fiche) {
      try {
        pb.push(...analyserPerimetre(fiche, { fichiers: c.noms, lignes: c.lignes }, c.paquets));
      } catch (e) {
        pb.push(e.message); // ex. « package.json invalide : … »
      }
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
