// Commande /aller : mène à un écran à partir d'une phrase libre, sans aucun modèle (V3-CHT-063, V3-CHT-052).
// Règles fixes : normalisation, mots-clés par destination, score. Rien n'est envoyé hors du navigateur.
// Prudence : égalité, négation ou phrase surtout hors sujet = aucune destination (la palette propose alors un choix).

export type Destination = {
  id: string;
  titre: string;
  chemin: string;
  motsCles: readonly string[];
};

// Mots-clés au singulier, sans accent : la phrase subit le même traitement (voir `racine`).
export const destinations: readonly Destination[] = [
  { id: 'activite', titre: 'Mon activité', chemin: '/activite', motsCles: ['activite', 'accueil', 'debut', 'tableau', 'bord', 'resume'] },
  { id: 'mois', titre: 'Mon mois', chemin: '/mois', motsCles: ['mois', 'mensuel', 'periode'] },
  { id: 'banque', titre: 'Ma banque', chemin: '/banque', motsCles: ['banque', 'bancaire', 'releve', 'rapprochement'] },
  { id: 'factures', titre: 'Mes factures', chemin: '/factures', motsCles: ['facture', 'vente', 'achat', 'depense'] },
  { id: 'declarations', titre: 'Mes déclarations', chemin: '/declarations', motsCles: ['declaration', 'declarer'] },
  { id: 'tva', titre: 'Ma TVA', chemin: '/declarations/tva', motsCles: ['tva', 'taxe', 'collectee', 'deductible'] },
  { id: 'documents', titre: 'Mes documents', chemin: '/documents', motsCles: ['document', 'piece', 'justificatif'] },
  { id: 'annees', titre: 'Mes années comptables', chemin: '/reglages/entreprise/annees', motsCles: ['annee', 'exercice', 'cloture'] },
  { id: 'comptes', titre: 'Mes comptes comptables', chemin: '/reglages/entreprise/comptes', motsCles: ['compte', 'plan'] },
  { id: 'tiers', titre: 'Mes clients et fournisseurs', chemin: '/reglages/entreprise/tiers', motsCles: ['client', 'fournisseur', 'tiers'] },
  { id: 'aide', titre: 'Aide', chemin: '/reglages/aide', motsCles: ['aide', 'assistance', 'guide', 'notice', 'support'] },
];

const MOTS_VIDES = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'au', 'aux', 'a', 'en', 'mon', 'ma', 'mes', 'je', 'j', 'ai', 'veux', 'voir', 'aller', 'va', 'ouvre', 'ouvrir', 'montre', 'montrer', 'afficher', 'affiche', 'sur', 'vers', 'page', 'ecran', 'svp', 'stp', 'moi', 'est', 'il', 'quelle', 'se']);
const NEGATIONS = new Set(['ne', 'n', 'pas', 'jamais', 'sans', 'non']);
// Fautes de frappe courantes : résultat fixé, table volontairement courte.
const FAUTES: Readonly<Record<string, string>> = { bnaque: 'banque', banqe: 'banque', tba: 'tva', ecritue: 'ecriture', facutre: 'facture', docment: 'document' };

// Mots dont le « s » final fait partie du mot : « mois » ne doit pas devenir « moi » (mot vide).
const INVARIABLES = new Set(['mois']);

/** Racine d'un mot : le « s » final est retiré (mots de plus de 3 lettres, sauf invariables), puis la faute courante est corrigée. */
function racine(m: string): string {
  const s = m.length > 3 && m.endsWith('s') && !INVARIABLES.has(m) ? m.slice(0, -1) : m;
  return FAUTES[s] ?? s;
}

function decouper(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length > 0);
}

/** Minuscules, sans accents ni ponctuation, mots vides retirés, « s » final retiré. */
export function normaliser(phrase: string): string[] {
  return decouper(phrase)
    .filter((m) => !MOTS_VIDES.has(m))
    .map(racine)
    .filter((m) => !MOTS_VIDES.has(m));
}

function score(d: Destination, mots: readonly string[]): number {
  return mots.filter((m) => d.motsCles.map(racine).includes(m)).length;
}

/** Destinations classées par score décroissant (égalité : ordre du registre). Vide si aucun mot connu. */
export function classer(phrase: string): Destination[] {
  const mots = normaliser(phrase);
  return destinations
    .map((d, i) => ({ d, s: score(d, mots), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.d);
}

/**
 * Résout une phrase en destination, ou null : inconnue, négative, ambiguë (égalité des deux premières)
 * ou surtout hors sujet (moins de la moitié des mots utiles reconnus).
 */
export function aller(phrase: string): Destination | null {
  if (decouper(phrase).some((m) => NEGATIONS.has(m))) return null;
  const mots = normaliser(phrase);
  const [premiere, deuxieme] = classer(phrase);
  if (!premiere) return null;
  const s = score(premiere, mots);
  if (deuxieme && score(deuxieme, mots) === s) return null;
  return s * 2 >= mots.length ? premiere : null;
}

/** Forme unique de la commande, partagée par la palette : « /aller » seul ou suivi d'espace puis d'une phrase. */
export const COMMANDE = /^\s*\/aller(?:\s+([\s\S]*))?$/i;

/** Traite une saisie de la forme « /aller <phrase> ». Renvoie null si ce n'est pas la commande. */
export function executerCommande(saisie: string): { destination: Destination | null } | null {
  const m = COMMANDE.exec(saisie);
  if (!m) return null;
  return { destination: aller(m[1] ?? '') };
}
