import { lireManifeste } from '../documents/empreinte.js';
import { ErreurExploitation, verifierEmpreinte, verifierEntier } from '../exploitation/types.js';

export type FichierAExporter = { chemin: string; taille: number };
export type PartiePlan = { nom: string; chemins: string[]; taille: number };
export type PartieFaite = { nom: string; empreinte: string };

const LARGEUR_MIN_NUMERO = 2;
const ORDRE = (a: string, b: string): number => (a < b ? -1 : 1);

function tailleValide(n: number, min: number): void {
  try {
    verifierEntier(n, min);
  } catch {
    throw new ErreurExploitation('taille_invalide');
  }
}

function nomPartie(rang: number, total: number): string {
  const largeur = Math.max(LARGEUR_MIN_NUMERO, String(total).length);
  return `partie-${String(rang).padStart(largeur, '0')}.zip`;
}

export function decouper(fichiers: readonly FichierAExporter[], tailleMax: number): PartiePlan[] {
  tailleValide(tailleMax, 1);
  const vus = new Set<string>();
  for (const x of fichiers) {
    tailleValide(x.taille, 0);
    if (typeof x.chemin !== 'string' || x.chemin === '') throw new ErreurExploitation('chemin_invalide');
    if (vus.has(x.chemin)) throw new ErreurExploitation('chemin_en_double');
    vus.add(x.chemin);
  }
  const triés = [...fichiers].sort((a, b) => ORDRE(a.chemin, b.chemin));
  const groupes: { chemins: string[]; taille: number }[] = [];
  let total = 0;
  for (const x of triés) {
    if (x.taille > tailleMax) {
      throw Object.assign(new ErreurExploitation('fichier_trop_grand'), {
        message: `fichier_trop_grand : ${x.chemin}`,
      });
    }
    total += x.taille;
    if (!Number.isSafeInteger(total)) throw new ErreurExploitation('taille_invalide');
    const courant = groupes[groupes.length - 1];
    if (courant !== undefined && courant.taille + x.taille <= tailleMax) {
      courant.chemins.push(x.chemin);
      courant.taille += x.taille;
    } else {
      groupes.push({ chemins: [x.chemin], taille: x.taille });
    }
  }
  if (groupes.length === 0) groupes.push({ chemins: [], taille: 0 });
  return groupes.map((g, i) => ({ nom: nomPartie(i + 1, groupes.length), ...g }));
}

export function manifesteGlobal(parties: readonly PartieFaite[]): string {
  const noms = new Set<string>();
  for (const p of parties) {
    verifierEmpreinte(p.empreinte);
    if (noms.has(p.nom)) throw new ErreurExploitation('doublon');
    noms.add(p.nom);
  }
  return [...parties]
    .sort((a, b) => ORDRE(a.nom, b.nom))
    .map((p) => `${p.empreinte}  ${p.nom}\n`)
    .join('');
}

function empreinteBienFormee(e: string): boolean {
  try {
    verifierEmpreinte(e);
    return true;
  } catch {
    return false;
  }
}

function faitesValides(faites: readonly PartieFaite[]): Map<string, string> {
  return new Map(faites.filter((p) => empreinteBienFormee(p.empreinte)).map((p) => [p.nom, p.empreinte]));
}

export function premierePartieAbsente(plan: readonly PartiePlan[], faites: readonly PartieFaite[]): string | null {
  const valides = faitesValides(faites);
  return plan.find((p) => !valides.has(p.nom))?.nom ?? null;
}

export function verifierParties(
  plan: readonly PartiePlan[],
  faites: readonly PartieFaite[],
  manifesteGlobalTexte: string,
): { ok: boolean; manquantes: string[]; modifiees: string[] } {
  const valides = faitesValides(faites);
  const attendu = new Map(lireManifeste(manifesteGlobalTexte).map((l) => [l.nom, l.sha256]));
  const manquantes = plan.filter((p) => !valides.has(p.nom)).map((p) => p.nom);
  const modifiees = plan
    .filter((p) => valides.has(p.nom) && attendu.get(p.nom) !== valides.get(p.nom))
    .map((p) => p.nom);
  return { ok: manquantes.length === 0 && modifiees.length === 0, manquantes, modifiees };
}
