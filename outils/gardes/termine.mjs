// garde:termine : « fait » se contrôle par machine (V3-QUA-020). Pour chaque fiche à statut: fait :
// journal présent, titré « Journal LNN-TMM », 10 lignes au plus ; dépendances toutes à statut: fait ; fiche cohérente.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireFiche } from './perimetre.mjs';

const STATUTS = ['a_faire', 'fait'];
export const MAX_LIGNES_JOURNAL = 10;

// fiches : { [id]: { fiche, fichier } }, journaux : { [id]: texte } (absent = pas de journal)
export function analyserTermine(fiches, journaux) {
  const pb = [];
  for (const [id, { fiche, fichier }] of Object.entries(fiches)) {
    if (fiche.id !== id) pb.push(`${fichier} : id « ${fiche.id} » différent du nom du fichier`);
    if (!STATUTS.includes(fiche.statut)) {
      pb.push(`${id} : statut « ${fiche.statut} » inconnu (a_faire ou fait)`);
      continue;
    }
    if (fiche.statut !== 'fait') continue;
    const journal = journaux[id];
    if (typeof journal !== 'string' || journal.trim() === '') {
      pb.push(`${id} : fait sans journal pilotage/journal/${id}.md`);
    } else {
      const lignes = journal.trim().split(/\r?\n/);
      if (lignes.length > MAX_LIGNES_JOURNAL) pb.push(`${id} : journal de ${lignes.length} lignes > ${MAX_LIGNES_JOURNAL}`);
      if (lignes[0].trim() !== `# Journal ${id}`) pb.push(`${id} : le journal doit commencer par « # Journal ${id} »`);
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
    const j = `${dossierJournal}/${f}`;
    if (existsSync(j)) journaux[id] = readFileSync(j, 'utf8');
  }
  return { fiches, journaux, erreurs };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { fiches, journaux, erreurs } = charger();
    const pb = [...erreurs, ...analyserTermine(fiches, journaux)];
    if (pb.length > 0) {
      console.error('garde:termine ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
      process.exit(1);
    }
    const n = Object.values(fiches).filter((x) => x.fiche.statut === 'fait').length;
    console.log(`garde:termine vert (${n} fiche(s) faite(s) sur ${Object.keys(fiches).length})`);
  } catch (e) {
    console.error('garde:termine ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
