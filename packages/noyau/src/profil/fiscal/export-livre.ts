import { formater } from '../../argent/index.js';
import { ErreurProfil, type Tenue } from '../types.js';
import { verifierLigneAchat, verifierLigneRecette, type LigneAchat, type LigneRecette } from './livre-recettes.js';

export type OptionsCsv = { separateur: string; colonnes: string[] };

const NB_COLONNES = 5;
const FORMULE = /^[=+\-@]/;
const FIN_LIGNE = '\r\n';

function champ(valeur: string, sep: string): string {
  const v = FORMULE.test(valeur) ? "'" + valeur : valeur;
  const brut = v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r');
  return brut ? '"' + v.replaceAll('"', '""') + '"' : v;
}

function verifierOptions(o: OptionsCsv): void {
  const sep = o?.separateur;
  if (typeof sep !== 'string' || sep.length !== 1 || sep === '"' || sep === '\n' || sep === '\r') {
    throw new ErreurProfil('separateur_invalide');
  }
  if (!Array.isArray(o.colonnes) || o.colonnes.length !== NB_COLONNES || o.colonnes.some((c) => typeof c !== 'string')) {
    throw new ErreurProfil('colonnes_invalides');
  }
}

type Brute = { id: string; date: string; tiers: string; montant: string; mode: string; reference: string };

function produire(lignes: readonly Brute[], o: OptionsCsv): string {
  const tri = [...lignes].sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.date < b.date ? -1 : 1));
  const corps = tri.map((l) => [l.date, l.tiers, l.montant, l.mode, l.reference]);
  return [o.colonnes, ...corps].map((cs) => cs.map((c) => champ(c, o.separateur)).join(o.separateur)).join(FIN_LIGNE);
}

/** CSV du livre des recettes : en-tête puis une ligne par recette (date, id), sans ligne vide finale. */
export function exporterLivreCsv(lignes: readonly LigneRecette[], options: OptionsCsv): string {
  verifierOptions(options);
  if (lignes.some((l) => verifierLigneRecette(l).length > 0)) throw new ErreurProfil('ligne_invalide');
  return produire(
    lignes.map((l) => ({
      id: l.id,
      date: l.dateEncaissement,
      tiers: l.client,
      montant: formater(l.montantCentimes),
      mode: l.modeReglement,
      reference: l.referenceFacture,
    })),
    options,
  );
}

/** CSV du registre des achats, mêmes règles que le livre des recettes. */
export function exporterRegistreAchatsCsv(lignes: readonly LigneAchat[], options: OptionsCsv): string {
  verifierOptions(options);
  if (lignes.some((l) => verifierLigneAchat(l).length > 0)) throw new ErreurProfil('ligne_invalide');
  return produire(
    lignes.map((l) => ({
      id: l.id,
      date: l.date,
      tiers: l.fournisseur,
      montant: formater(l.montantCentimes),
      mode: l.modeReglement,
      reference: l.referencePiece,
    })),
    options,
  );
}

/** Export du livre (au lieu du FEC) seulement pour la tenue en livre des recettes. */
export function exportPermis(tenue: Tenue): 'livre' {
  if (tenue === 'livre_recettes') return 'livre';
  throw new ErreurProfil('export_livre_non_applicable');
}
