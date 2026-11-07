// Commandes « / » déterministes (V3-CHT-063, V3-CHT-049, V3-CHT-052) : mêmes outils du registre, sans modèle.
// Ce module ne fait qu'analyser la saisie ; l'exécution est branchée par l'écran. `/aller` reste dans aller.ts.
import { NOMS_OUTILS } from '../../../../packages/contrat/src/chat/outils.js';

export type Commande = { nom: string; outil?: string; destination?: string };
export type Analyse = { commande: Commande; arguments: string[] } | { inconnue: string } | null;

const BASE: readonly Commande[] = [
  { nom: 'importer', destination: 'documents' },
  { nom: 'valider-lot', outil: 'proposer_validation' },
  { nom: 'rapprocher', destination: 'banque' },
  { nom: 'vue', outil: 'vue.ouvrir' },
  { nom: 'annuler', destination: 'activite' },
  { nom: 'exporter', destination: 'declarations' },
  { nom: 'aide', destination: 'aide' },
];

// Un outil non déclaré dans le registre est retiré : la commande mène alors à sa destination d'écran.
export const COMMANDES: readonly Commande[] = BASE.map((c) =>
  c.outil !== undefined && !NOMS_OUTILS.includes(c.outil) ? { nom: c.nom, destination: c.destination ?? 'activite' } : c,
);

const ALLER = 'aller';

/** Pas de « / » en tête : null. `/aller` est laissé à aller.ts : null aussi. */
export function analyser(saisie: string): Analyse {
  if (typeof saisie !== 'string') return null;
  const t = saisie.trim();
  if (!t.startsWith('/')) return null;
  const [premier = '', ...reste] = t.slice(1).split(/\s+/);
  const nom = premier.toLowerCase();
  if (nom === ALLER) return null;
  const commande = COMMANDES.find((c) => c.nom === nom);
  return commande ? { commande, arguments: reste } : { inconnue: nom };
}

/** Commandes dont le nom commence par `debut` (avec ou sans « / »), triées par nom. */
export function suggestions(debut: string): Commande[] {
  if (typeof debut !== 'string') return [];
  const d = debut.replace(/^\//, '').toLowerCase();
  return COMMANDES.filter((c) => c.nom.startsWith(d)).sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));
}
