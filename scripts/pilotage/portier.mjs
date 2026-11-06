// Portier de fusion (L00-T21) : script SANS IA qui décide si une PR non sensible se fusionne sans humain.
// Il REFUSE PAR DÉFAUT : toute donnée absente, mal typée ou douteuse ajoute une raison de refus.
// Le corps et le titre de la PR ne sont jamais lus. Seul réseau : `gh`. Aucun push (pas de droit sur main).
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MARQUEUR_RELECTEUR = 'A_RENSEIGNER_PAR_WILL';
// Identité du relecteur (compte ou App distinct de l'auteur) : à renseigner par Will. Avec le marqueur seul, tout est refusé.
export const IDENTIFIANTS_RELECTEUR = [MARQUEUR_RELECTEUR];
// Copie EN DUR de pilotage/LISEZMOI.md §Fusion (le test chemins-sensibles-egaux-a-lisezmoi les compare). « / » final = dossier.
export const CHEMINS_SENSIBLES = [
  '.github/', '.claude/', 'CLAUDE.md', 'LICENSE', 'scripts/verifier.mjs', '.gitleaks.toml', 'eslint.config.js', 'tsconfig.base.json',
  'CODEOWNERS', '.npmrc', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'outils/gardes/', 'scripts/pilotage/', 'pilotage/',
];
export const CHEMINS_SENSIBLES_EN_PLUS = ['.gitleaksignore', '.gitattributes']; // en plus de la liste du LISEZMOI (comparée par test)
export const ETIQUETTES_INTERDITES = ['bloque', 'a-corriger', 'sensible-a-fusionner'];
const FORME_BRANCHE = /^lot-(\d{2})\/L(\d{2})-T(\d{2})$/;
const FORME_IDENTITE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\[bot\])?$/;
const FORME_SHA = /^[0-9a-f]{40}$/;
const FORME_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;

const bas = (x) => String(x ?? '').toLowerCase();
const ident = (x) => bas(x).replace(/\[bot\]$/, ''); // un compte App s'écrit « nom » ou « nom[bot] » selon l'API
const norm = (chemin) => String(chemin ?? '').replace(/\\/g, '/');

export function estSensible(chemin) {
  const c = bas(norm(chemin));
  if (c === '' || c.startsWith('/') || c.split('/').includes('..')) return true;
  if (/^(vitest\.config|stryker)(\.|$)/.test(c.split('/').pop())) return true;
  return [...CHEMINS_SENSIBLES, ...CHEMINS_SENSIBLES_EN_PLUS].some((s) => {
    const m = bas(s);
    return m.endsWith('/') ? c.startsWith(m) || c.includes('/' + m) : c === m || c.endsWith('/' + m);
  });
}

export function lireFiche(texte) {
  const m = String(texte ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fiche = {};
  if (!m) return fiche;
  for (const l of m[1].split(/\r?\n/)) {
    const kv = l.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fiche[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return fiche;
}

// Texte d'un commentaire sans ses blocs de code (``` ou ~~~ ; un bloc non fermé court jusqu'à la fin).
const horsCode = (corps) => String(corps ?? '').replace(/(```|~~~)[\s\S]*?(\1|$)/g, '');
// Verdict d'un commentaire : ligne exacte « VERDICT: OK » ; toute autre ligne contenant « verdict » vaut refus.
function verdict(corps) {
  const lignes = horsCode(corps).split(/\r?\n/);
  if (lignes.some((l) => /verdict/i.test(l) && l !== 'VERDICT: OK')) return 'KO';
  return lignes.includes('VERDICT: OK') ? 'OK' : null;
}

// Seule différence admise sur la fiche de la PR : la ligne « statut: a_faire » devient « statut: fait ».
function statutSeulChange(base, tete) {
  if (typeof base !== 'string' || typeof tete !== 'string') return false;
  const a = base.split('\n');
  const b = tete.split('\n');
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (a[i].replace(/\r$/, '') !== 'statut: a_faire' || b[i].replace(/\r$/, '') !== 'statut: fait') return false;
    diffs++;
  }
  return diffs === 1;
}

export function decider(pr, options = {}) {
  const raisons = [];
  const refus = (r) => raisons.push(r);
  const p = pr && typeof pr === 'object' ? pr : {};
  const relecteurs = (options.relecteurs ?? IDENTIFIANTS_RELECTEUR)
    .filter((x) => typeof x === 'string' && x !== MARQUEUR_RELECTEUR && FORME_IDENTITE.test(x)).map(ident);
  if (relecteurs.length === 0) refus('identité du relecteur non renseignée');
  if (p.arret !== false) refus('ARRET présent ou état inconnu');
  if (p.etat !== 'OPEN' || p.brouillon !== false || p.base !== 'main') refus('PR non ouverte, brouillon ou hors main');
  if (p.fork !== false) refus('PR depuis un fork ou origine inconnue');
  const branche = FORME_BRANCHE.exec(String(p.branche ?? ''));
  const id = branche ? `L${branche[2]}-T${branche[3]}` : null;
  if (!branche || branche[1] !== branche[2]) refus('branche hors forme lot-NN/LNN-TMM');
  if (p.verifier !== 'SUCCESS') refus('contrôle verifier non vert');
  if (p.aJour !== true) refus('branche pas à jour avec main');

  const fichiers = Array.isArray(p.fichiers) ? p.fichiers : null;
  const fichePr = id ? `pilotage/fiches/${id}.md` : null;
  const journalPr = id ? `pilotage/journal/${id}.md` : null;
  if (!fichiers || fichiers.length === 0 || fichiers.length >= 3000) refus('liste de fichiers absente, vide ou tronquée');
  const f = fichiers ?? [];
  const lignes = f.reduce((s, x) => s + (Number.isInteger(x?.additions) ? x.additions : 1e9) + (Number.isInteger(x?.suppressions) ? x.suppressions : 1e9), 0);
  if (!(lignes < 400)) refus('400 lignes ou plus (ou comptage invalide)');
  const exempte = (c) => c === fichePr || c === journalPr;
  const touches = f.flatMap((x) => [norm(x?.chemin), x?.ancien ? norm(x.ancien) : null]).filter((c) => c !== null);
  if (touches.some((c) => !exempte(c) && estSensible(c))) refus('chemin sensible touché');
  if (touches.some((c) => c === 'package.json' || c.endsWith('/package.json')) || p.diffDependances !== false) refus('dépendance ajoutée ou diff de dépendances inconnu');
  if (f.some((x) => x?.ancien && exempte(norm(x.ancien)))) refus('renommage de la fiche ou du journal');

  const fiche = p.fiche && typeof p.fiche === 'object' ? p.fiche : {};
  if (!id || fiche.id !== id) refus('fiche lue sur origin/main absente ou différente de la branche');
  if (fiche.sensible !== 'non') refus('fiche sensible (ou champ sensible absent)');
  if (fiche.tests_requis !== 'oui' && fiche.tests_requis !== 'non') refus('tests_requis absent ou différent de oui/non');
  if (fiche.tests_requis === 'oui' &&!f.some((x) => FORME_TEST.test(norm(x?.chemin)) && x?.etat !== 'removed' && x?.additions > 0)) refus('tests requis absents du diff');
  if (f.some((x) => norm(x?.chemin) === fichePr) && !statutSeulChange(p.ficheBase, p.ficheTete)) refus('fiche modifiée autrement que par statut: a_faire vers fait');

  const etiquettes = Array.isArray(p.etiquettes) ? p.etiquettes : null;
  if (!etiquettes) refus('étiquettes inconnues');
  for (const e of etiquettes ?? []) if (ETIQUETTES_INTERDITES.includes(e) || /^echec-/.test(e)) refus(`étiquette interdite : ${e}`);

  const auteur = ident(p.auteur);
  if (auteur === '') refus('auteur inconnu');
  const sha = String(p.headRefOid ?? '');
  if (!FORME_SHA.test(sha)) refus('headRefOid invalide');
  const verdicts = (Array.isArray(p.commentaires) ? p.commentaires : [])
    .filter((c) => relecteurs.includes(ident(c?.auteur)) && ident(c?.auteur) !== auteur && verdict(c?.corps) !== null)
    .sort((x, y) => String(x.date).localeCompare(String(y.date)));
  const dernier = verdicts[verdicts.length - 1];
  if (!dernier) refus('aucun verdict du relecteur');
  else if (verdict(dernier.corps) !== 'OK') refus('le dernier verdict du relecteur n\'est pas OK');
  else if (dernier.edite !== false) refus('le dernier verdict du relecteur a été édité (ou état d\'édition inconnu)');
  else if (!FORME_SHA.test(sha) || !horsCode(dernier.corps).includes(sha)) refus('le dernier verdict ne cite pas le headRefOid actuel');
  if (dernier) {
    const evts = (Array.isArray(p.evenements) ? p.evenements : []).filter((e) => e?.etiquette === 'relu')
      .sort((x, y) => String(x.date).localeCompare(String(y.date)));
    const last = evts[evts.length - 1];
    if (!etiquettes?.includes('relu') || !last || last.evenement !== 'labeled' || ident(last.acteur) !== ident(dernier.auteur) || ident(last.acteur) === auteur) {
      refus('étiquette relu absente ou pas posée par le relecteur');
    }
  }
  return { fusionner: raisons.length === 0, raisons };
}

// ---------- Entrées-sorties (non testées en réseau) ----------
function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} a échoué`);
  return r.stdout;
}
const ndjson = (s) => s.split('\n').filter(Boolean).map((l) => JSON.parse(l));
// ARRET présent = true. Tout doute (fetch en échec, origin/main absent, cat-file autre que 0 ou 128) vaut true : refus.
const git = (...a) => spawnSync('git', a, { stdio: 'ignore' }).status;
export const arretPresent = (exec = git) => {
  if (exec('fetch', '-q', 'origin') !== 0 || exec('rev-parse', '--verify', '-q', 'origin/main') !== 0) return true;
  return exec('cat-file', '-e', 'origin/main:pilotage/ARRET') !== 128;
};
export const estAJour = (sortie) => /^\d+$/.test(String(sortie ?? '').trim()) && parseInt(String(sortie).trim(), 10) === 0;
const brut = (depot, chemin, ref) => gh(['api', '-H', 'Accept: application/vnd.github.raw', `repos/${depot}/contents/${chemin}?ref=${ref}`]);

export function lirePr(numero) {
  const depot = process.env.GITHUB_REPOSITORY || gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(depot)) throw new Error('dépôt invalide');
  const j = JSON.parse(gh(['pr', 'view', String(numero), '--repo', depot, '--json', 'author,headRefOid,headRefName,baseRefName,isCrossRepository,isDraft,state,labels,statusCheckRollup']));
  const arret = arretPresent();
  const id = FORME_BRANCHE.exec(j.headRefName) ? j.headRefName.split('/')[1] : null;
  const fichiers = ndjson(gh(['api', '--paginate', `repos/${depot}/pulls/${numero}/files`, '--jq', '.[] | {chemin: .filename, ancien: .previous_filename, etat: .status, additions, suppressions: .deletions}']));
  const verifs = (j.statusCheckRollup ?? []).filter((c) => c.name === 'verifier');
  const pr = {
    arret, etat: j.state, brouillon: j.isDraft, base: j.baseRefName, fork: j.isCrossRepository, branche: j.headRefName,
    headRefOid: j.headRefOid, auteur: j.author?.login, etiquettes: j.labels.map((l) => l.name),
    verifier: verifs.length > 0 && verifs.every((c) => c.conclusion === 'SUCCESS') ? 'SUCCESS' : 'AUTRE',
    aJour: estAJour(gh(['api', `repos/${depot}/compare/main...${j.headRefOid}`, '--jq', '.behind_by'])),
    fichiers, diffDependances: fichiers.some((x) => /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/.test(x.chemin)),
    commentaires: ndjson(gh(['api', '--paginate', `repos/${depot}/issues/${numero}/comments`, '--jq', '.[] | {auteur: .user.login, corps: .body, date: .created_at, edite: (.updated_at != .created_at)}'])),
    evenements: ndjson(gh(['api', '--paginate', `repos/${depot}/issues/${numero}/events`, '--jq', '.[] | select(.event=="labeled" or .event=="unlabeled") | {evenement: .event, etiquette: .label.name, acteur: .actor.login, date: .created_at}'])),
  };
  if (id) {
    try {
      pr.ficheBase = brut(depot, `pilotage/fiches/${id}.md`, 'main');
      pr.fiche = lireFiche(pr.ficheBase);
      if (fichiers.some((x) => x.chemin === `pilotage/fiches/${id}.md`)) pr.ficheTete = brut(depot, `pilotage/fiches/${id}.md`, j.headRefOid);
    } catch { /* fiche illisible : decider refusera */ }
  }
  return { pr, depot, id };
}

export function ligneCalibrage({ date, pr, fiche, fusionner, raisons, minutes }) {
  const nettoie = (s) => String(s ?? '').replace(/[;\r\n]/g, ' ');
  return [date, pr, fiche ?? '', fusionner ? 'fusion' : 'refus', raisons.map(nettoie).join(' | '), minutes ?? ''].join(';');
}

function principal(argv) {
  const aBlanc = argv.includes('--a-blanc');
  const iCsv = argv.indexOf('--csv');
  const csv = iCsv >= 0 ? argv[iCsv + 1] : null;
  const numero = argv.find((a) => /^[1-9]\d{0,8}$/.test(a));
  if (!numero || (iCsv >= 0 && (!csv || /(^|[\\/])pilotage[\\/]calibrage\.csv$/.test(csv)))) {
    console.error('usage : portier.mjs <numéro de PR> [--a-blanc] [--csv fichier-artefact]');
    return 2;
  }
  const { pr, depot, id } = lirePr(numero);
  let d = decider(pr);
  if (d.fusionner && !aBlanc) { // relecture complète (commentaires, étiquettes, ARRET) juste avant la fusion
    const r2 = lirePr(numero);
    d = r2.pr.headRefOid === pr.headRefOid ? decider(r2.pr) : { fusionner: false, raisons: ['tête de la PR changée pendant la lecture'] };
  }
  const maintenant = new Date();
  const dernier = (pr.commentaires ?? []).filter((c) => verdict(c.corps) !== null).map((c) => c.date).sort().pop();
  const minutes = dernier ? Math.max(0, Math.round((maintenant - new Date(dernier)) / 60000)) : '';
  const ligne = ligneCalibrage({ date: maintenant.toISOString(), pr: numero, fiche: id, fusionner: d.fusionner, raisons: d.raisons, minutes });
  console.log(ligne);
  if (!aBlanc) {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + '\n');
    if (csv) appendFileSync(csv, ligne + '\n');
    if (d.fusionner) {
      gh(['pr', 'merge', numero, '--squash', '--delete-branch', '--match-head-commit', pr.headRefOid, '--repo', depot]);
    }
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = principal(process.argv.slice(2));
  } catch (e) {
    console.error(`portier : ${e.message}`);
    process.exitCode = 1;
  }
}
