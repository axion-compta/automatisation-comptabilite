// garde:termine : « fait » se contrôle par machine (V3-QUA-020). Une fiche à statut: fait exige : journal titré
// « # Journal LNN-TMM » de 10 lignes au plus ; dépendances à statut: fait ; si tests_requis: oui, un fichier de test suivi
// par git dans fichiers_autorises (dont le chemin figure dans fichiers_autorises).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { estAutorise, lireFiche } from './perimetre.mjs';
import { EST_TEST } from './tests.mjs';

// fiches : { [id]: { fiche, fichier } }, journaux : { [id]: texte }, fichiersTest : fichiers de test suivis (null = ignoré).
export function analyserTermine(fiches, journaux, fichiersTest = null) {
  const pb = [];
  for (const [id, { fiche, fichier }] of Object.entries(fiches)) {
    if (fiche.id !== id) pb.push(`${fichier} : id « ${fiche.id} » différent du nom du fichier`);
    if (!['a_faire', 'fait'].includes(fiche.statut)) {
      pb.push(`${id} : statut « ${fiche.statut} » inconnu (a_faire ou fait)`);
      continue;
    }
    if (fiche.statut !== 'fait') continue;
    const journal = journaux[id];
    if (typeof journal !== 'string' || journal.trim() === '') pb.push(`${id} : fait sans journal pilotage/journal/${id}.md`);
    else {
      const lignes = journal.trim().split(/\r?\n/);
      if (lignes.length > 10) pb.push(`${id} : journal de ${lignes.length} lignes > 10`);
      if (lignes[0].trim() !== `# Journal ${id}`) pb.push(`${id} : le journal doit commencer par « # Journal ${id} »`);
    }
    if (fiche.tests_requis === 'oui' && fichiersTest) {
      const motifs = Array.isArray(fiche.fichiers_autorises) ? fiche.fichiers_autorises : [];
      if (!fichiersTest.some((f) => estAutorise(f, motifs))) {
        pb.push(`${id} : tests_requis oui mais aucun fichier de test suivi dans fichiers_autorises`);
      }
    }
    for (const d of Array.isArray(fiche.depend_de) ? fiche.depend_de : []) {
      if (!fiches[d]) pb.push(`${id} : dépendance ${d} introuvable`);
      else if (fiches[d].fiche.statut !== 'fait') pb.push(`${id} : fait alors que ${d} ne l’est pas`);
    }
  }
  return pb;
}

export function charger(dossierFiches = 'pilotage/fiches', dossierJournal = 'pilotage/journal') {
  const fiches = {};
  const journaux = {};
  const erreurs = [];
  for (const f of readdirSync(dossierFiches).filter((n) => /^L\d{2}-T\d{2}\.md$/.test(n))) {
    const id = f.slice(0, -3);
    try {
      fiches[id] = { fiche: lireFiche(readFileSync(`${dossierFiches}/${f}`, 'utf8')), fichier: f };
    } catch (e) {
      erreurs.push(`${f} illisible : ${e.message}`);
    }
    if (existsSync(`${dossierJournal}/${f}`)) journaux[id] = readFileSync(`${dossierJournal}/${f}`, 'utf8');
  }
  return { fiches, journaux, erreurs };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { fiches, journaux, erreurs } = charger();
    const suivis = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });
    if (suivis.status !== 0) throw new Error('git ls-files impossible');
    const tests = suivis.stdout.split('\0').filter((f) => EST_TEST.test(f));
    const pb = [...erreurs, ...analyserTermine(fiches, journaux, tests)];
    if (pb.length > 0) {
      console.error('garde:termine ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
      process.exit(1);
    }
    console.log(`garde:termine vert (${Object.keys(fiches).length} fiche(s))`);
  } catch (e) {
    console.error('garde:termine ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
