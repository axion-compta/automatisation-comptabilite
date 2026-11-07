// garde:fiches : cohérence du plan (V3-QUA-029). Erreurs : champ absent, id ≠ fichier, dépendance inconnue, cycle, taille,
// dépendance vers une fiche bloquée, phase plus tôt qu'une dépendance, fichier partagé dans un lot sans lien.
// Avertissement seulement : fichier partagé entre deux lots. Exceptions : fiches-exceptions.json ({ id (ou liste d'id), regle, motif }).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireFiche } from './perimetre.mjs';

const OBLIGATOIRES = ['id', 'titre', 'lot', 'couloir', 'statut', 'sensible', 'depend_de', 'fichiers_autorises', 'taille_max_lignes', 'tests_requis'];
const TAILLE_MIN = 1;
const TAILLE_MAX = 400;
const MAX_AVERTISSEMENTS = 20;
const PROPRES = /^pilotage\/(?:fiches|journal)\//;

const rang = (phase) => {
  const m = /^P(\d+)$/.exec(String(phase ?? ''));
  return m ? Number(m[1]) : undefined;
};
const liste = (v) => (Array.isArray(v) ? v : []);

export function contexteDe(texte) {
  const m = texte.match(/^## Contexte[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return m ? m[1] : '';
}
export const estBloquee = (contexte) => /^bloque_par\s*:/m.test(contexte);

function cycles(fiches) {
  const trouves = [];
  const etat = {};
  const pile = [];
  const visiter = (id) => {
    etat[id] = 1;
    pile.push(id);
    for (const d of liste(fiches[id].fiche.depend_de)) {
      if (!fiches[d]) continue;
      if (etat[d] === 1) trouves.push([...pile.slice(pile.indexOf(d)), d]);
      else if (!etat[d]) visiter(d);
    }
    pile.pop();
    etat[id] = 2;
  };
  for (const id of Object.keys(fiches).sort()) if (!etat[id]) visiter(id);
  return trouves;
}

function atteignables(fiches, id) {
  const vus = new Set();
  const pile = [id];
  while (pile.length > 0) {
    for (const d of liste(fiches[pile.pop()]?.fiche.depend_de)) {
      if (fiches[d] && !vus.has(d)) {
        vus.add(d);
        pile.push(d);
      }
    }
  }
  return vus;
}

// fiches : { [id]: { fiche, fichier, contexte } } ; exceptions : [{ id, regle, motif }]
export function analyserFiches(fiches, exceptions = []) {
  const brutes = [];
  const err = (id, regle, message) => brutes.push({ id, regle, message });
  const avertissements = [];
  const ids = Object.keys(fiches).sort();

  for (const id of ids) {
    const { fiche, fichier } = fiches[id];
    if (fiche.id !== id) err(id, 'id', `${fichier} : id « ${fiche.id} » différent du nom du fichier`);
    for (const c of OBLIGATOIRES) {
      if (fiche[c] === undefined || fiche[c] === '') err(id, 'champ', `${id} : champ obligatoire « ${c} » absent`);
    }
    const t = fiche.taille_max_lignes;
    if (t !== undefined && t !== '' && !(Number.isInteger(t) && t >= TAILLE_MIN && t <= TAILLE_MAX)) {
      err(id, 'taille', `${id} : taille_max_lignes « ${t} » doit être un entier de ${TAILLE_MIN} à ${TAILLE_MAX}`);
    }
    for (const d of liste(fiche.depend_de)) {
      if (!fiches[d]) {
        err(id, 'dependance-inconnue', `${id} : dépendance ${d} inconnue`);
        continue;
      }
      if (fiche.statut !== 'a_faire') continue;
      if (estBloquee(fiches[d].contexte ?? '')) err(id, 'bloquee', `${id} : dépend de ${d}, fiche bloquée (bloque_par)`);
      const [a, b] = [rang(fiche.phase), rang(fiches[d].fiche.phase)];
      if (a !== undefined && b !== undefined && a < b) {
        err(id, 'phase', `${id} (${fiche.phase}) dépend de ${d} (${fiches[d].fiche.phase}), phase plus tardive`);
      }
    }
  }
  for (const boucle of cycles(fiches)) err(boucle[0], 'cycle', `cycle de dépendances : ${boucle.join(' → ')}`);

  const afaire = ids.filter((id) => fiches[id].fiche.statut === 'a_faire');
  const acces = Object.fromEntries(afaire.map((id) => [id, atteignables(fiches, id)]));
  for (let i = 0; i < afaire.length; i++) {
    for (let j = i + 1; j < afaire.length; j++) {
      const [x, y] = [afaire[i], afaire[j]];
      const communs = liste(fiches[x].fiche.fichiers_autorises).filter(
        (f) => typeof f === 'string' && !PROPRES.test(f) && liste(fiches[y].fiche.fichiers_autorises).includes(f),
      );
      if (communs.length === 0) continue;
      if (fiches[x].fiche.lot !== fiches[y].fiche.lot) {
        avertissements.push(`${x} et ${y} (lots différents) partagent ${communs.join(', ')}`);
      } else if (!acces[x].has(y) && !acces[y].has(x)) {
        err(x, 'partage', `${x} et ${y} (même lot) partagent ${communs.join(', ')} sans dépendance entre elles`);
      }
    }
  }

  const erreurs = [];
  const valides = [];
  exceptions.forEach((e, i) => {
    const ids = [e?.id].flat();
    const ok = e && typeof e === 'object' && ids.length > 0 && ids.every((x) => typeof x === 'string') && typeof e.regle === 'string';
    if (!ok || typeof e.motif !== 'string' || e.motif.trim() === '') erreurs.push(`exception n°${i + 1} sans motif ou incomplète`);
    else valides.push(e);
  });
  for (const b of brutes) {
    if (!valides.some((e) => [e.id].flat().includes(b.id) && e.regle === b.regle)) erreurs.push(b.message);
  }
  return { erreurs, avertissements };
}

export function charger(dossier = 'pilotage/fiches') {
  const fiches = {};
  const erreurs = [];
  for (const f of readdirSync(dossier).filter((n) => /^L\d{2}-T\d{2}\.md$/.test(n)).sort()) {
    const texte = readFileSync(`${dossier}/${f}`, 'utf8');
    try {
      fiches[f.slice(0, -3)] = { fiche: lireFiche(texte), fichier: f, contexte: contexteDe(texte) };
    } catch (e) {
      erreurs.push(`${f} illisible : ${e.message}`);
    }
  }
  return { fiches, erreurs };
}

export function lireExceptions(chemin = 'outils/gardes/fiches-exceptions.json') {
  return existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : [];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { fiches, erreurs: illisibles } = charger();
    const { erreurs, avertissements } = analyserFiches(fiches, lireExceptions());
    for (const a of avertissements.slice(0, MAX_AVERTISSEMENTS)) console.warn(`garde:fiches avertissement : ${a}`);
    if (avertissements.length > MAX_AVERTISSEMENTS) console.warn(`garde:fiches : ${avertissements.length} avertissements au total`);
    const tout = [...illisibles, ...erreurs];
    if (tout.length > 0) {
      for (const p of tout) console.error(`garde:fiches : ${p}`);
      process.exit(1);
    }
    console.log(`garde:fiches : ${Object.keys(fiches).length} fiches cohérentes`);
  } catch (e) {
    console.error(`garde:fiches : ${e.message}`);
    process.exit(1);
  }
}
