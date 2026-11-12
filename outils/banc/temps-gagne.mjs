// Temps gagné (V3-QUA-024) : banc fictif déterministe, chronométrage par ports injectés, rapport honnête.
// Aucun réseau ici. Une valeur sans mesure est écrite « NON MESURÉ » ; une estimation n'est jamais une mesure.
export const TACHES = [
  { id: 'classer-valider', titre: 'Classer et valider les pièces du mois' },
  { id: 'rapprocher-releve', titre: 'Rapprocher le relevé du mois' },
  { id: 'preparer-tva', titre: 'Préparer la TVA du mois' },
];
export const NON_MESURE = 'NON MESURÉ';

const prng = (graine) => {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const entierPositif = (n) => Number.isSafeInteger(n) && n >= 1;

/** Banc fictif déterministe : montants en centimes entiers, libellés inventés. */
export function genererBanc({ graine = 1, pieces = 60, lignes = 120 } = {}) {
  if (!Number.isSafeInteger(graine) || !entierPositif(pieces) || !entierPositif(lignes)) throw new Error('parametres_invalides');
  const alea = prng(graine);
  const montant = () => 100 + Math.floor(alea() * 99900);
  return {
    pieces: Array.from({ length: pieces }, (_, i) => ({ id: `piece-${String(i + 1).padStart(4, '0')}`, libelle: `Fournisseur fictif ${1 + Math.floor(alea() * 20)}`, montant_centimes: montant() })),
    lignes: Array.from({ length: lignes }, (_, i) => ({ id: `ligne-${String(i + 1).padStart(4, '0')}`, libelle: `Mouvement fictif ${1 + Math.floor(alea() * 50)}`, montant_centimes: montant() })),
  };
}

/** Durée en millisecondes entières par tâche ; erreur, port absent ou durée invalide donnent null (jamais 0). */
export async function chronometrer(taches, ports, horloge) {
  const mesures = {};
  for (const id of taches) {
    const port = ports?.[id];
    if (typeof port !== 'function') { mesures[id] = null; continue; }
    const t0 = horloge();
    try { await port(); } catch { mesures[id] = null; continue; }
    const d = horloge() - t0;
    mesures[id] = Number.isFinite(d) && d >= 0 ? Math.round(d) : null;
  }
  return mesures;
}

const valide = (v) => Number.isSafeInteger(v) && v >= 0;

/** Tableau Markdown : colonne « Mesure » = mesures seulement ; l'estimation reste étiquetée à part. */
export function rapport(mesures = {}, estimations = {}) {
  const lignes = TACHES.map((t) => {
    const m = valide(mesures[t.id]) ? String(mesures[t.id]) : NON_MESURE;
    const e = valide(estimations[t.id]) ? `${estimations[t.id]} (estimation, non mesurée)` : 'aucune';
    return `| ${t.id} | ${m} | ${e} |`;
  });
  return ['| Tâche | Mesure (ms) | Estimation (ms) |', '|---|---|---|', ...lignes, ''].join('\n');
}
