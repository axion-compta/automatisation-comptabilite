// Évaluateur hors production (V3-AGT-020, V3-QUA-013, V3-CHT-059). Aucun appel réseau : le modèle est un port injecté.
// Jeu de cas fictifs seulement. Coûts en entiers (micro-centimes), calculs en entiers.
const CENTILE_HAUT = 90;
const COURRIEL = /[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;

const entierPositif = (v) => Number.isSafeInteger(v) && v >= 0;
const trier = (xs) => {
  if (!Array.isArray(xs) || xs.length === 0) throw new Error('jeu_vide');
  return [...xs].sort((a, b) => a - b);
};

export function mediane(valeurs) {
  const t = trier(valeurs);
  const m = t.length >> 1;
  return t.length % 2 ? t[m] : Math.floor((t[m - 1] + t[m]) / 2);
}

/** Rang le plus proche (calcul entier) : plus petite valeur couvrant p % des mesures. */
export function centile(valeurs, p) {
  const t = trier(valeurs);
  return t[Math.max(Math.ceil((p * t.length) / 100) - 1, 0)];
}

/** Champs chiffrés notés par code : égalité exacte (centimes entiers, compte, date). */
export function noterChamps(attendu, obtenu) {
  const cles = Object.keys(attendu);
  const lu = obtenu !== null && typeof obtenu === 'object' ? obtenu : {};
  const exacts = cles.filter((k) => Object.is(lu[k], attendu[k]) && (typeof lu[k] !== 'number' || Number.isSafeInteger(lu[k]))).length;
  return { exacts, total: cles.length };
}

function verifierFictif(valeur) {
  if (typeof valeur === 'string') {
    const hors = [...valeur.matchAll(COURRIEL)].some((m) => m[1] !== 'exemple.fr');
    if (hors || IBAN.test(valeur)) throw new Error('donnee_reelle');
  } else if (valeur !== null && typeof valeur === 'object') Object.values(valeur).forEach(verifierFictif);
}

function verifierJeu(jeu) {
  if (!Array.isArray(jeu) || jeu.length === 0) throw new Error('jeu_vide');
  const ok = jeu.every((c) => c !== null && typeof c === 'object' && typeof c.id === 'string' && c.attendu && typeof c.attendu === 'object');
  if (!ok || new Set(jeu.map((c) => c.id)).size !== jeu.length) throw new Error('jeu_invalide');
  jeu.forEach((c) => verifierFictif(c.entree));
}

/** Rejoue le jeu sur chaque port { modele, version, repondre(cas) -> { champs, cout } } ; un rapport par modèle et version. */
export async function evaluer({ jeu, ports, horloge }) {
  verifierJeu(jeu);
  if (!Array.isArray(ports) || ports.length === 0) throw new Error('ports_absents');
  const mesureLe = horloge();
  const rapports = [];
  for (const port of ports) {
    let champsExacts = 0;
    let champsTotal = 0;
    let casExacts = 0;
    const couts = [];
    for (const c of jeu) {
      const { champs, cout } = await port.repondre(c);
      if (!entierPositif(cout)) throw new Error('cout_invalide');
      const note = noterChamps(c.attendu, champs);
      champsExacts += note.exacts;
      champsTotal += note.total;
      if (note.exacts === note.total) casExacts += 1;
      couts.push(cout);
    }
    rapports.push({ modele: port.modele, version: port.version, mesureLe, cas: jeu.length, casExacts, champsExacts, champsTotal, coutMedian: mediane(couts), coutCentile90: centile(couts, CENTILE_HAUT) });
  }
  return rapports;
}
