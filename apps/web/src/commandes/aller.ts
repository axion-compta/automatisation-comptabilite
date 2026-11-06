// Commande /aller : mène à un écran à partir d'une phrase libre, sans aucun modèle (V3-CHT-063, V3-CHT-052).
// Règles fixes : normalisation, mots-clés par destination, score. Rien n'est envoyé hors du navigateur.

export type Destination = {
  id: string;
  titre: string;
  chemin: string;
  motsCles: readonly string[];
};

export const destinations: readonly Destination[] = [
  { id: 'accueil', titre: 'Accueil', chemin: '/', motsCles: ['accueil', 'debut', 'tableau', 'bord', 'resume'] },
  { id: 'ecritures', titre: 'Écritures', chemin: '/ecritures', motsCles: ['ecriture', 'ecritures', 'journal', 'saisie', 'ligne'] },
  { id: 'banque', titre: 'Banque', chemin: '/banque', motsCles: ['banque', 'bancaire', 'releve', 'rapprochement', 'compte'] },
  { id: 'ventes', titre: 'Ventes', chemin: '/ventes', motsCles: ['vente', 'ventes', 'client', 'clients', 'devis'] },
  { id: 'achats', titre: 'Achats', chemin: '/achats', motsCles: ['achat', 'achats', 'fournisseur', 'fournisseurs', 'depense', 'depenses'] },
  { id: 'tva', titre: 'TVA', chemin: '/tva', motsCles: ['tva', 'taxe', 'declaration', 'collectee', 'deductible'] },
  { id: 'documents', titre: 'Documents', chemin: '/documents', motsCles: ['document', 'documents', 'piece', 'pieces', 'justificatif', 'justificatifs'] },
  { id: 'controles', titre: 'Contrôles', chemin: '/controles', motsCles: ['controle', 'controles', 'doute', 'doutes', 'anomalie', 'verifier'] },
  { id: 'parametres', titre: 'Paramètres', chemin: '/parametres', motsCles: ['parametre', 'parametres', 'reglage', 'reglages', 'option', 'profil'] },
  { id: 'aide', titre: 'Aide', chemin: '/aide', motsCles: ['aide', 'assistance', 'guide', 'notice', 'support'] },
];

const MOTS_VIDES = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'au', 'aux', 'a', 'en', 'mon', 'ma', 'mes', 'je', 'veux', 'voir', 'aller', 'va', 'ouvre', 'ouvrir', 'montre', 'montrer', 'afficher', 'affiche', 'sur', 'vers', 'page', 'ecran', 'svp', 'stp', 'moi']);

/** Minuscules, sans accents ni ponctuation, découpé en mots utiles. */
export function normaliser(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length > 0 && !MOTS_VIDES.has(m));
}

function score(d: Destination, mots: readonly string[]): number {
  return mots.filter((m) => d.motsCles.includes(m)).length;
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

/** Résout une phrase en destination, ou null si elle est inconnue. Pas de devinette. */
export function aller(phrase: string): Destination | null {
  return classer(phrase)[0] ?? null;
}

/** Traite une saisie de la forme « /aller <phrase> ». Renvoie null si ce n'est pas la commande. */
export function executerCommande(saisie: string): { destination: Destination | null } | null {
  const m = /^\s*\/aller(?:\s+(.*))?$/i.exec(saisie);
  if (!m) return null;
  return { destination: aller(m[1] ?? '') };
}
